'use client'

import { useState } from 'react'
import ProgressMuscleAssessment from './ProgressMuscleAssessment'

function ListBlock({ title, items, tone = '#A7C4B8' }) {
  if (!items?.length) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: tone, fontSize: 13, lineHeight: 1.45 }}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ProgressPhotoDetailModal({ isOpen, photo, onClose, onCompare, onDelete }) {
  const [deleteBusy, setDeleteBusy] = useState(false)

  if (!isOpen || !photo) return null

  const a = photo.analysis && typeof photo.analysis === 'object' ? photo.analysis : null
  const bf = photo.body_fat_estimate || a?.bodyFatEstimate || ''
  const dateStr = photo.created_at
    ? new Date(photo.created_at).toLocaleDateString('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  async function handleDelete() {
    if (!onDelete || !photo?.id) return
    if (!window.confirm('Remove this photo from your check-in? This cannot be undone.')) return
    setDeleteBusy(true)
    try {
      await onDelete(photo.id)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 0,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      role="presentation"
    >
      <div
        className="glass"
        style={{
          maxHeight: 'min(88vh, 640px)',
          overflowY: 'auto',
          borderRadius: '20px 20px 0 0',
          border: '1px solid rgba(110,231,183,0.15)',
          borderBottom: 'none',
          padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          margin: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Check-in detail</div>
            <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 4 }}>{dateStr}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#2D5B3F', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {photo.signedUrl && (
          <div
            style={{
              width: '100%',
              maxHeight: 'min(52vh, 480px)',
              borderRadius: 14,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(110,231,183,0.12)',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={photo.signedUrl}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: 'min(52vh, 480px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        )}

        {photo.weight_at_time != null && (
          <div style={{ fontSize: 13, color: '#93C5FD', fontWeight: 600, marginBottom: 8 }}>Weight: {photo.weight_at_time} kg</div>
        )}

        {a ? (
          <>
            {bf ? (
              <div style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 600, marginBottom: 8 }}>Body fat (est.): {bf}</div>
            ) : null}
            {a.overallRating ? (
              <div style={{ fontSize: 13, color: '#E2FBE8', marginBottom: 8 }}>Overall: {a.overallRating}</div>
            ) : null}
            {a.buildType ? (
              <div style={{ fontSize: 12, color: '#8BAFA0', marginBottom: 12 }}>Build: {a.buildType}</div>
            ) : null}

            <ListBlock title="Strengths" items={Array.isArray(a.strengths) ? a.strengths : []} />
            <ListBlock title="Areas to improve" items={Array.isArray(a.areasToImprove) ? a.areasToImprove : []} />

            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 8 }}>Muscle-by-muscle</div>
            <ProgressMuscleAssessment analysis={a} />

            {a.postureNotes ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 6 }}>Posture</div>
                <div style={{ fontSize: 13, color: '#A7C4B8', lineHeight: 1.45 }}>{a.postureNotes}</div>
              </div>
            ) : null}
            {a.recommendedFocus ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 6 }}>Recommended focus</div>
                <div style={{ fontSize: 13, color: '#A7C4B8', lineHeight: 1.45 }}>{a.recommendedFocus}</div>
              </div>
            ) : null}
            {a.estimatedTrainingAge ? (
              <div style={{ marginTop: 10, fontSize: 12, color: '#5BA37A' }}>Training age (visual): {a.estimatedTrainingAge}</div>
            ) : null}
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#4A6B58' }}>No detailed analysis stored for this photo.</div>
        )}

        {onDelete ? (
          <button
            type="button"
            disabled={deleteBusy}
            onClick={handleDelete}
            style={{
              width: '100%',
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(251,113,133,0.35)',
              background: 'rgba(251,113,133,0.08)',
              color: '#FB7185',
              fontSize: 14,
              fontWeight: 700,
              cursor: deleteBusy ? 'wait' : 'pointer',
            }}
          >
            {deleteBusy ? 'Removing…' : 'Remove this photo'}
          </button>
        ) : null}

        {onCompare && (
          <button
            type="button"
            onClick={() => {
              onClose?.()
              onCompare()
            }}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(110,231,183,0.25)',
              background: 'rgba(16,185,129,0.15)',
              color: '#6EE7B7',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Compare photos
          </button>
        )}
      </div>
    </div>
  )
}
