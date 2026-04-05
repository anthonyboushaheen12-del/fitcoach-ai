'use client'

import { mergeCheckInAnalysisFromPhotos } from '../../lib/merge-checkin-analysis'
import ProgressMuscleAssessment from './ProgressMuscleAssessment'

export default function ProgressTimeline({ photos, onAdd, onSelectPhoto }) {
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

  const latest = photos.length > 0 ? photos[photos.length - 1] : null
  const merged = mergeCheckInAnalysisFromPhotos(photos)
  const displayAnalysis = merged?.analysis || (latest?.analysis && typeof latest.analysis === 'object' ? latest.analysis : null)
  const mergeHint = merged?.mergeHint ?? null
  const showLatestMuscle =
    displayAnalysis &&
    displayAnalysis.muscleAssessment &&
    typeof displayAnalysis.muscleAssessment === 'object'

  return (
    <div>
    <div
      style={{
        padding: '12px 18px',
        overflowX: 'auto',
        display: 'flex',
        gap: 12,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {photos.map((photo) => (
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
    {showLatestMuscle && (
      <div
        style={{
          margin: '0 18px 14px',
          padding: 14,
          borderRadius: 14,
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(110,231,183,0.12)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Latest check-in</div>
        <div style={{ fontSize: 10, color: '#4A6B58', marginBottom: 10, lineHeight: 1.35 }}>
          Built from your newest photo plus other recent angles when a muscle group wasn&apos;t visible in the latest shot
          {latest?.created_at
            ? ` · newest: ${new Date(latest.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
            : ''}
        </div>
        {mergeHint ? (
          <div style={{ fontSize: 10, color: '#5BA37A', marginBottom: 10, lineHeight: 1.4 }}>{mergeHint}</div>
        ) : null}
        <ProgressMuscleAssessment analysis={displayAnalysis} compact />
        {displayAnalysis?.recommendedFocus && typeof displayAnalysis.recommendedFocus === 'string' ? (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid rgba(110,231,183,0.1)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F', marginBottom: 4 }}>COACH FOCUS</div>
            <div style={{ fontSize: 11, color: '#A7C4B8', lineHeight: 1.45 }}>{displayAnalysis.recommendedFocus}</div>
          </div>
        ) : null}
        {Array.isArray(displayAnalysis?.strengths) && displayAnalysis.strengths.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F', marginBottom: 4 }}>STRENGTHS</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#8BAFA0', lineHeight: 1.45 }}>
              {displayAnalysis.strengths.slice(0, 4).map((s, i) => (
                <li key={i}>{typeof s === 'string' ? s : String(s)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {Array.isArray(displayAnalysis?.areasToImprove) && displayAnalysis.areasToImprove.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F', marginBottom: 4 }}>ROOM TO GROW</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#8BAFA0', lineHeight: 1.45 }}>
              {displayAnalysis.areasToImprove.slice(0, 4).map((s, i) => (
                <li key={i}>{typeof s === 'string' ? s : String(s)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )}
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
        {photos.length} photo{photos.length !== 1 ? 's' : ''} — add more whenever you want
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
