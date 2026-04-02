'use client'

const ORDER = [
  ['shoulders', 'Shoulders'],
  ['chest', 'Chest'],
  ['arms', 'Arms'],
  ['core', 'Core'],
  ['back', 'Back'],
  ['legs', 'Legs'],
]

function cellText(raw) {
  if (raw == null || raw === '') return 'not visible'
  if (typeof raw === 'string') return raw
  return String(raw)
}

/** Compact per-part copy from analyze-body `analysis.muscleAssessment`. */
export default function ProgressMuscleAssessment({ analysis, compact = false }) {
  const ma = analysis?.muscleAssessment
  if (!ma || typeof ma !== 'object') return null

  const gap = compact ? 8 : 10
  const labelSize = compact ? 10 : 11
  const valueSize = compact ? 11 : 12

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap,
      }}
    >
      {ORDER.map(([key, label]) => (
        <div
          key={key}
          style={{
            padding: compact ? '8px 10px' : '10px 12px',
            borderRadius: 12,
            background: 'rgba(14,20,14,0.55)',
            border: '1px solid rgba(110,231,183,0.1)',
          }}
        >
          <div
            style={{
              fontSize: labelSize,
              fontWeight: 700,
              color: '#2D5B3F',
              textTransform: 'uppercase',
              letterSpacing: 0.04,
              marginBottom: 4,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: valueSize, color: '#A7C4B8', lineHeight: 1.35 }}>{cellText(ma[key])}</div>
        </div>
      ))}
    </div>
  )
}
