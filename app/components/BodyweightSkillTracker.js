'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const DEFAULT_ROWS = [
  { id: 'handstand', label: 'Handstand', note: '' },
  { id: 'l_sit', label: 'L-sit', note: '' },
  { id: 'back_lever', label: 'Back lever', note: '' },
  { id: 'front_lever', label: 'Front lever', note: '' },
  { id: 'muscle_up', label: 'Muscle-up', note: '' },
  { id: 'planche', label: 'Planche', note: '' },
]

export default function BodyweightSkillTracker({ profileId, cardDelay = 0 }) {
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(DEFAULT_ROWS)
  const storageKey = profileId ? `fitcoach_bw_skills_${profileId}` : null

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const merged = DEFAULT_ROWS.map((d) => {
        const hit = parsed.find((p) => p.id === d.id)
        return hit && typeof hit.note === 'string' ? { ...d, note: hit.note } : d
      })
      setRows(merged)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  function openEdit() {
    setDraft(rows.map((r) => ({ ...r })))
    setOpen(true)
  }

  function save() {
    setRows(draft)
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(draft))
    }
    setOpen(false)
  }

  function shortBar(note) {
    const t = (note || '').trim()
    if (!t) return 0.08
    const len = Math.min(t.length, 40)
    return 0.12 + (len / 40) * 0.75
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardDelay }}
      className="glass"
      style={{
        padding: 16,
        marginBottom: 14,
        border: '1px solid rgba(244,114,182,0.2)',
        background: 'rgba(14, 20, 14, 0.92)',
      }}
    >
      <div style={{ height: 3, background: 'linear-gradient(90deg, #F472B6, #6EE7B7)', borderRadius: 2, marginBottom: 12 }} />
      <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.5 }}>SKILL PROGRESS</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 6 }}>Calisthenics milestones</div>
      <p style={{ fontSize: 11, color: '#4A6B58', marginTop: 6, lineHeight: 1.4 }}>
        Track holds or stages (e.g. &quot;tuck 15s&quot;, &quot;negatives&quot;). Local to this device.
      </p>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{r.label}</span>
              <span style={{ fontSize: 11, color: '#A7C4B8', maxWidth: '55%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.note.trim() || '—'}
              </span>
            </div>
            <div style={{ marginTop: 4, height: 6, borderRadius: 100, background: 'rgba(110,231,183,0.08)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(shortBar(r.note) * 100)}%`,
                  borderRadius: 100,
                  background: 'linear-gradient(90deg, #F472B6, #6EE7B7)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={openEdit}
        style={{
          marginTop: 14,
          width: '100%',
          padding: 10,
          borderRadius: 12,
          border: '1px solid rgba(244,114,182,0.35)',
          background: 'rgba(244,114,182,0.1)',
          color: '#F9A8D4',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Update skills
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 18,
              borderRadius: '20px 20px 0 0',
              background: 'rgba(14,20,14,0.98)',
              border: '1px solid rgba(244,114,182,0.2)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Edit skill notes</div>
            {draft.map((r, i) => (
              <label key={r.id} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#F9A8D4' }}>{r.label}</span>
                <input
                  value={r.note}
                  onChange={(e) => {
                    const next = draft.slice()
                    next[i] = { ...r, note: e.target.value.slice(0, 80) }
                    setDraft(next)
                  }}
                  placeholder="e.g. Wall HS 45s, tuck BL 12s"
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(110,231,183,0.15)',
                    background: 'rgba(8,12,8,0.65)',
                    color: '#E2FBE8',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(110,231,183,0.2)',
                  background: 'transparent',
                  color: '#A7C4B8',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #F472B6, #6EE7B7)',
                  color: '#070B07',
                  fontWeight: 800,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
