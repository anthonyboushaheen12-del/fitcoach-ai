'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/** Rough weight-goal progress label from logs */
function progressLabel(row, currentWeightKg) {
  const start = row.started_weight_kg
  const cw =
    typeof currentWeightKg === 'number' && !Number.isNaN(currentWeightKg)
      ? currentWeightKg
      : null

  const text = `${row.goal_text || ''} ${JSON.stringify(row.plan?.goalSummary || {})}`.toLowerCase()
  const lose = /lose|loss|cut|fat|lean|shred|down|kg|weight/.test(text) && !/gain|bulk|muscle up|build/.test(row.goal_text?.toLowerCase() || '')
  const gain = /gain|bulk|muscle|mass|weight up/.test(row.goal_text?.toLowerCase() || '')

  if (cw != null && typeof start === 'number' && !Number.isNaN(start)) {
    const delta = cw - start
    if (lose) {
      const lost = -delta
      return lost >= 0 ? `${lost >= 0 ? lost.toFixed(1) : ''} kg change since start` : `${delta.toFixed(1)} kg vs start`
    }
    if (gain) {
      return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg vs start`
    }
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg vs start`
  }

  const timeline = row.plan?.goalSummary?.estimatedTimeline
  if (timeline) return `Timeline: ${timeline}`
  return null
}

export default function GoalHistory({ profileId, currentWeightKg, refreshKey = 0 }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase || !profileId) {
        setRows([])
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('goals')
        .select('id, goal_text, status, started_at, target_date, completed_at, started_weight_kg, plan')
        .eq('profile_id', profileId)
        .order('started_at', { ascending: false })
        .limit(40)

      if (cancelled) return
      if (error) {
        console.error('GoalHistory:', error)
        setRows([])
      } else {
        setRows(data || [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileId, refreshKey])

  if (!profileId) return null

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 12 }}>📜 Your Goals</div>
      {loading ? (
        <div className="glass-sm" style={{ padding: 16, color: '#4A6B58', fontSize: 13 }}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-sm" style={{ padding: 16, color: '#4A6B58', fontSize: 13 }}>
          No saved goals yet. Generate an action plan above.
        </div>
      ) : (
        <div
          className="glass"
          style={{
            padding: 0,
            overflow: 'hidden',
            border: '1px solid rgba(110,231,183,0.08)',
          }}
        >
          {rows.map((row, i) => {
            const active = row.status === 'active'
            const done = row.status === 'completed' || row.completed_at
            const prog = progressLabel(row, currentWeightKg)
            return (
              <div
                key={row.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(110,231,183,0.06)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E2FBE8', flex: 1, minWidth: 0 }}>
                    🎯 &ldquo;{(row.goal_text || '').slice(0, 80)}
                    {(row.goal_text || '').length > 80 ? '…' : ''}&rdquo;
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: active ? '#6EE7B7' : done ? '#93C5FD' : '#4A6B58',
                      flexShrink: 0,
                    }}
                  >
                    {active ? 'Active ●' : done ? 'Done ✓' : row.status || '—'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 6 }}>
                  Started: {formatDate(row.started_at)}
                  {row.target_date ? ` · Target: ${formatDate(row.target_date)}` : ''}
                  {done && row.completed_at ? ` · Completed: ${formatDate(row.completed_at)}` : ''}
                </div>
                {prog ? (
                  <div style={{ fontSize: 12, color: '#A7C4B8', marginTop: 6 }}>Progress: {prog}</div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
