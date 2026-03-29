'use client'

import { useState, useMemo, useEffect } from 'react'
import { compareProgressPhotoRows } from '../../lib/progress-compare'

export default function CompareModal({ isOpen, onClose, photos, profile }) {
  const sorted = useMemo(
    () => [...(photos || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [photos]
  )

  const [leftIdx, setLeftIdx] = useState(0)
  const [rightIdx, setRightIdx] = useState(0)

  useEffect(() => {
    if (isOpen && sorted.length >= 2) {
      setLeftIdx(0)
      setRightIdx(sorted.length - 1)
    }
  }, [isOpen, sorted.length])

  if (!isOpen || sorted.length < 2) return null

  const safeLeft = Math.min(leftIdx, sorted.length - 1)
  const safeRight = Math.min(rightIdx, sorted.length - 1)
  const before = sorted[safeLeft]
  const after = sorted[safeRight]
  const changes =
    safeLeft !== safeRight ? compareProgressPhotoRows(before, after, profile) : []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        background: 'rgba(0,0,0,0.85)',
        overflowY: 'auto',
        padding: '16px 12px 32px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6EE7B7', fontSize: 14, fontWeight: 600 }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Progress comparison</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#2D5B3F', fontSize: 18 }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#2D5B3F' }}>Compare</span>
          <select
            value={safeLeft}
            onChange={(e) => setLeftIdx(Number(e.target.value))}
            style={{
              flex: 1,
              minWidth: 120,
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(110,231,183,0.2)',
              background: 'rgba(14,20,14,0.8)',
              color: '#E2FBE8',
              fontSize: 12,
            }}
          >
            {sorted.map((p, i) => (
              <option key={p.id} value={i}>
                {new Date(p.created_at).toLocaleDateString()} · {p.body_fat_estimate || '—'}
              </option>
            ))}
          </select>
          <span style={{ color: '#2D5B3F' }}>vs</span>
          <select
            value={safeRight}
            onChange={(e) => setRightIdx(Number(e.target.value))}
            style={{
              flex: 1,
              minWidth: 120,
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(110,231,183,0.2)',
              background: 'rgba(14,20,14,0.8)',
              color: '#E2FBE8',
              fontSize: 12,
            }}
          >
            {sorted.map((p, i) => (
              <option key={p.id} value={i}>
                {new Date(p.created_at).toLocaleDateString()} · {p.body_fat_estimate || '—'}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Before', row: before },
            { label: 'After', row: after },
          ].map(({ label, row }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#6EE7B7', marginBottom: 6, fontWeight: 600 }}>{label}</div>
              {row?.signedUrl ? (
                <img
                  src={row.signedUrl}
                  alt=""
                  style={{
                    width: '100%',
                    aspectRatio: '3/4',
                    objectFit: 'cover',
                    borderRadius: 14,
                    border: '1px solid rgba(110,231,183,0.12)',
                  }}
                />
              ) : (
                <div
                  style={{
                    aspectRatio: '3/4',
                    borderRadius: 14,
                    background: 'rgba(14,20,14,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2D5B3F',
                    fontSize: 12,
                  }}
                >
                  No image
                </div>
              )}
              <div style={{ fontSize: 11, color: '#D1FAE5', marginTop: 8 }}>
                {new Date(row.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 11, color: '#93C5FD' }}>
                {row.weight_at_time != null ? `${row.weight_at_time} kg` : ''}
              </div>
              <div style={{ fontSize: 11, color: '#6EE7B7' }}>{row.body_fat_estimate || ''}</div>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 16, border: '1px solid rgba(110,231,183,0.1)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Changes detected</div>
          {safeLeft === safeRight ? (
            <div style={{ fontSize: 13, color: '#2D5B3F' }}>Pick two different dates to compare.</div>
          ) : changes.length === 0 ? (
            <div style={{ fontSize: 13, color: '#2D5B3F' }}>Not enough overlapping data to diff (e.g. missing estimates).</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, color: '#D1FAE5', fontSize: 13, lineHeight: 1.7 }}>
              {changes.map((c, i) => (
                <li key={i}>
                  {c.improved === true && '✅ '}
                  {c.improved === false && '⏳ '}
                  {c.improved === null && '· '}
                  {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
