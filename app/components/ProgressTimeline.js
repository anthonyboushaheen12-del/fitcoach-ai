'use client'

import { useMemo } from 'react'
import { mergeCheckInAnalysisFromPhotos } from '../../lib/merge-checkin-analysis'
import ProgressMuscleAssessment from './ProgressMuscleAssessment'

function formatSessionTitle(session) {
  if (!session) return 'Check-in'
  if (session.label && String(session.label).trim()) return session.label.trim()
  const d = session.session_date
  if (!d) return 'Check-in'
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

function groupPhotosBySession(photos) {
  const map = new Map()
  for (const p of photos || []) {
    const sid = p.session_id || p.session?.id || '__single'
    if (!map.has(sid)) {
      map.set(sid, {
        session: p.session || {
          id: sid,
          session_date: (p.created_at || '').split('T')[0] || null,
          label: null,
        },
        photos: [],
      })
    }
    map.get(sid).photos.push(p)
  }
  const groups = [...map.values()]
  for (const g of groups) {
    g.photos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }
  groups.sort((a, b) => {
    const da = a.session?.session_date || ''
    const db = b.session?.session_date || ''
    if (da !== db) return db.localeCompare(da)
    const ta = a.photos[0]?.created_at || ''
    const tb = b.photos[0]?.created_at || ''
    return new Date(tb) - new Date(ta)
  })
  return groups
}

export default function ProgressTimeline({ photos, onAdd, onSelectPhoto }) {
  const groups = useMemo(() => groupPhotosBySession(photos), [photos])

  if (!photos?.length) {
    return (
      <div style={{ padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 14 }}>
          Take your first progress photo to track changes. You can upload new ones anytime.
        </div>
        <button
          type="button"
          onClick={() => onAdd?.()}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
            color: '#070B07',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Upload progress photo
        </button>
      </div>
    )
  }

  return (
    <div>
      {groups.map(({ session, photos: sessionPhotos }) => {
        const merged = mergeCheckInAnalysisFromPhotos(sessionPhotos)
        const last = sessionPhotos[sessionPhotos.length - 1]
        const displayAnalysis =
          merged?.analysis ||
          (last?.analysis && typeof last.analysis === 'object' ? last.analysis : null)
        const mergeHint = merged?.mergeHint ?? null
        const showVisitMuscle =
          displayAnalysis &&
          displayAnalysis.muscleAssessment &&
          typeof displayAnalysis.muscleAssessment === 'object'

        return (
          <div key={session?.id || sessionPhotos[0]?.id} style={{ marginBottom: 20 }}>
            <div
              style={{
                padding: '8px 18px 6px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{formatSessionTitle(session)}</div>
                <div style={{ fontSize: 10, color: '#4A6B58', marginTop: 2 }}>
                  {sessionPhotos.length} photo{sessionPhotos.length !== 1 ? 's' : ''} in this check-in
                </div>
              </div>
            </div>

            {showVisitMuscle && (
              <div
                style={{
                  margin: '0 18px 10px',
                  padding: 12,
                  borderRadius: 14,
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(110,231,183,0.12)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 6 }}>Visit summary</div>
                <div style={{ fontSize: 10, color: '#4A6B58', marginBottom: 8, lineHeight: 1.35 }}>
                  Merged from all angles in this check-in.
                  {mergeHint ? ` ${mergeHint}` : ''}
                </div>
                <ProgressMuscleAssessment analysis={displayAnalysis} compact />
              </div>
            )}

            <div
              style={{
                padding: '4px 18px 8px',
                overflowX: 'auto',
                display: 'flex',
                gap: 12,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {sessionPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onSelectPhoto?.(photo)}
                  style={{
                    minWidth: 100,
                    flex: '0 0 auto',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  {photo.signedUrl ? (
                    <img
                      src={photo.signedUrl}
                      alt=""
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 14,
                        border: '1px solid rgba(110,231,183,0.1)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 14,
                        background: 'rgba(14,20,14,0.6)',
                        border: '1px solid rgba(110,231,183,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: '#2D5B3F',
                      }}
                    >
                      No preview
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#2D5B3F', marginTop: 4 }}>
                    {new Date(photo.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                  {photo.weight_at_time != null && (
                    <div style={{ fontSize: 10, color: '#93C5FD', fontWeight: 600 }}>{photo.weight_at_time} kg</div>
                  )}
                  <div style={{ fontSize: 10, color: '#6EE7B7', fontWeight: 600 }}>
                    {photo.body_fat_estimate || photo.analysis?.bodyFatEstimate || ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <div
        style={{
          padding: '0 18px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: '#4A6B58' }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} across {groups.length} check-in
          {groups.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => onAdd?.()}
          style={{
            padding: '6px 12px',
            borderRadius: 100,
            background: 'rgba(110,231,183,0.1)',
            border: '1px solid rgba(110,231,183,0.2)',
            color: '#6EE7B7',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          + Add photo
        </button>
      </div>
    </div>
  )
}
