'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

function looksLikeWeightFatLoss(text) {
  if (!text) return false
  const t = text.toLowerCase()
  return (
    (t.includes('lose') ||
      t.includes('loss') ||
      t.includes('fat') ||
      t.includes('cut') ||
      t.includes('shred') ||
      t.includes('lean')) &&
    !t.includes('gain muscle') &&
    !t.includes('bulk')
  )
}

function looksLikeWeightGain(text) {
  if (!text) return false
  const t = text.toLowerCase()
  return t.includes('gain') && (t.includes('kg') || t.includes('weight') || t.includes('muscle'))
}

function parseWeekRange(timeline) {
  if (!timeline || typeof timeline !== 'string') return null
  const m = timeline.match(/(\d+)\s*-\s*(\d+)/)
  if (m) return { min: Number(m[1]), max: Number(m[2]) }
  const single = timeline.match(/(\d+)\s*weeks?/i)
  if (single) {
    const n = Number(single[1])
    return { min: n, max: n }
  }
  return null
}

export default function GoalDashboardWidget({ profileId, profileWeightKg, cardDelay = 0 }) {
  const router = useRouter()
  const [row, setRow] = useState(null)
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase || !profileId) {
        setRow(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('goals')
        .select('id, goal_text, plan, status, started_at, started_weight_kg')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (error || !data) {
        setRow(null)
      } else {
        setRow(data)
        const items = Array.isArray(data.plan?.dailyChecklist) ? data.plan.dailyChecklist : []
        setChecklist(items.slice(0, 4).map(() => false))
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileId])

  const { pct, sublabel } = useMemo(() => {
    if (!row) return { pct: 0, sublabel: '' }
    const goalText = row.goal_text || ''
    const summary = row.plan?.goalSummary || {}
    const cw =
      typeof profileWeightKg === 'number' && !Number.isNaN(profileWeightKg)
        ? profileWeightKg
        : null
    const sw =
      typeof row.started_weight_kg === 'number' && !Number.isNaN(row.started_weight_kg)
        ? row.started_weight_kg
        : null

    if (cw != null && sw != null) {
      const delta = cw - sw
      if (looksLikeWeightFatLoss(goalText) || looksLikeWeightFatLoss(summary.objective)) {
        const weekly = summary.weeklyTargetChange || ''
        const m = weekly.match(/-?\d+\.?\d*\s*to\s*-?\d+\.?\d*|(-?\d+\.?\d*)/)
        let targetLoss = 3
        if (m) {
          const nums = weekly.match(/-?\d+\.?\d*/g)
          if (nums && nums.length) {
            const vals = nums.map(Number).filter((n) => !Number.isNaN(n))
            if (vals.length) targetLoss = Math.max(...vals.map((v) => Math.abs(v)))
          }
        }
        if (targetLoss <= 0) targetLoss = 3
        const lost = sw - cw
        const p = Math.max(0, Math.min(1, lost / targetLoss))
        return {
          pct: p,
          sublabel: `${lost >= 0 ? lost.toFixed(1) : '0.0'} of ~${targetLoss.toFixed(1)} kg · fat-loss pace (approx.)`,
        }
      }
      if (looksLikeWeightGain(goalText) || looksLikeWeightGain(summary.objective)) {
        const gained = delta
        const targetGain = 3
        const p = Math.max(0, Math.min(1, gained / targetGain))
        return {
          pct: p,
          sublabel: `${gained >= 0 ? `+${gained.toFixed(1)}` : gained.toFixed(1)} kg vs start`,
        }
      }
    }

    const weeks = parseWeekRange(summary.estimatedTimeline)
    if (weeks && row.started_at) {
      const start = new Date(row.started_at)
      const now = new Date()
      const elapsedWeeks = (now - start) / (7 * 24 * 60 * 60 * 1000)
      const totalWeeks = Math.max(weeks.max, 1)
      const p = Math.max(0, Math.min(1, elapsedWeeks / totalWeeks))
      return {
        pct: p,
        sublabel: `Week ${Math.min(totalWeeks, Math.max(1, Math.floor(elapsedWeeks) + 1))} of ~${totalWeeks}`,
      }
    }

    return { pct: 0.05, sublabel: summary.estimatedTimeline || 'In progress' }
  }, [row, profileWeightKg])

  if (loading || !row) return null

  const items = Array.isArray(row.plan?.dailyChecklist) ? row.plan.dailyChecklist.slice(0, 4) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardDelay }}
      className="glass"
      style={{
        padding: 18,
        marginBottom: 14,
        border: '1px solid rgba(110,231,183,0.1)',
        background: 'rgba(14, 20, 14, 0.92)',
      }}
    >
      <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #6EE7B7, #F97316)', borderRadius: 2, marginBottom: 14 }} />
      <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.5 }}>🎯 ACTIVE GOAL</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 8, lineHeight: 1.35 }}>
        &ldquo;{(row.goal_text || '').slice(0, 120)}{(row.goal_text || '').length > 120 ? '…' : ''}&rdquo;
      </p>
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            height: 8,
            borderRadius: 100,
            background: 'rgba(110,231,183,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.round(pct * 100)}%`,
              borderRadius: 100,
              background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 8 }}>{sublabel}</div>
      </div>
      {items.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F' }}>Today</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((line, i) => (
              <label
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#A7C4B8',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checklist[i]}
                  onChange={(e) => {
                    const next = [...checklist]
                    next[i] = e.target.checked
                    setChecklist(next)
                  }}
                  style={{ accentColor: '#10B981', width: 16, height: 16 }}
                />
                <span style={{ lineHeight: 1.3 }}>{line.length > 48 ? `${line.slice(0, 46)}…` : line}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => router.push('/goals')}
        style={{
          marginTop: 16,
          width: '100%',
          padding: 12,
          borderRadius: 12,
          border: '1px solid rgba(110,231,183,0.2)',
          background: 'rgba(110,231,183,0.08)',
          color: '#6EE7B7',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        View Full Plan →
      </button>
    </motion.div>
  )
}
