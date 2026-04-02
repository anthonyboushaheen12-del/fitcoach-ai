'use client'

import { useMemo } from 'react'

const PART_LABELS = [
  ['shoulders', 'Shoulders'],
  ['chest', 'Chest'],
  ['arms', 'Arms'],
  ['core', 'Core'],
  ['back', 'Back'],
  ['legs', 'Legs'],
]

export function pickLatestProgressPhoto(photos) {
  if (!photos?.length) return null
  return [...photos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

export default function ProgressPhotoBodyBreakdown({ photos }) {
  const latest = useMemo(() => pickLatestProgressPhoto(photos), [photos])
  const analysis = latest?.analysis

  const muscle = analysis && typeof analysis === 'object' ? analysis.muscleAssessment : null
  const hasParts =
    muscle &&
    typeof muscle === 'object' &&
    PART_LABELS.some(([key]) => muscle[key] && String(muscle[key]).trim())

  if (!latest || !analysis || typeof analysis !== 'object') return null
  if (!hasParts && !analysis.recommendedFocus && !analysis.postureNotes) return null

  return (
    <div
      style={{
        marginTop: 14,
        padding: '14px 16px 16px',
        borderTop: '1px solid rgba(110,231,183,0.1)',
        background: 'rgba(7,11,7,0.35)',
        borderRadius: '0 0 14px 14px',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6EE7B7', marginBottom: 10, letterSpacing: 0.3 }}>
        Latest check-in — by body area
      </div>
      <div style={{ fontSize: 10, color: '#4A6B58', marginBottom: 12 }}>
        {new Date(latest.created_at).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
        {latest.photo_type ? ` · ${String(latest.photo_type)}` : ''}
        {latest.body_fat_estimate || analysis.bodyFatEstimate
          ? ` · ~${latest.body_fat_estimate || analysis.bodyFatEstimate}`
          : ''}
      </div>

      {hasParts && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            marginBottom: 12,
          }}
        >
          {PART_LABELS.map(([key, label]) => {
            const val = muscle[key]
            const text = val != null && String(val).trim() ? String(val).trim() : '—'
            return (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(14,20,14,0.65)',
                  border: '1px solid rgba(110,231,183,0.1)',
                  minHeight: 56,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F', textTransform: 'uppercase', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2FBE8', lineHeight: 1.35 }}>{text}</div>
              </div>
            )
          })}
        </div>
      )}

      {analysis.overallRating && (
        <div style={{ fontSize: 12, color: '#93C5FD', fontWeight: 600, marginBottom: 8 }}>
          Overall: {analysis.overallRating}
          {analysis.buildType ? ` · ${analysis.buildType}` : ''}
        </div>
      )}

      {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F', marginBottom: 4 }}>Strengths</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#A7C4B8', lineHeight: 1.45 }}>
            {analysis.strengths.slice(0, 4).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(analysis.areasToImprove) && analysis.areasToImprove.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5B3F', marginBottom: 4 }}>Focus next</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#FBBF24', lineHeight: 1.45 }}>
            {analysis.areasToImprove.slice(0, 4).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendedFocus && (
        <div style={{ fontSize: 12, color: '#86EFAC', lineHeight: 1.45, marginBottom: analysis.postureNotes ? 8 : 0 }}>
          <span style={{ fontWeight: 700, color: '#2D5B3F' }}>Coach note </span>
          {analysis.recommendedFocus}
        </div>
      )}

      {analysis.postureNotes && (
        <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.45, marginTop: 6 }}>
          Posture: {analysis.postureNotes}
        </div>
      )}
    </div>
  )
}
