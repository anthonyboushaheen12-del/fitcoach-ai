'use client'

import { useState } from 'react'
import ExerciseModal from './ExerciseModal'

const fieldStyle = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(110,231,183,0.15)',
  background: 'rgba(8,12,8,0.65)',
  color: '#E2FBE8',
  fontSize: 13,
  fontFamily: "'Outfit', sans-serif",
}

export default function ExerciseRow({
  name,
  sets,
  rest,
  onToggle,
  isChecked,
  showCheckbox,
  index,
  isLast,
  editable,
  onFieldChange,
}) {
  const [modalOpen, setModalOpen] = useState(false)

  if (editable && typeof onFieldChange === 'function') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '12px 0',
          borderBottom: isLast ? 'none' : '1px solid rgba(110,231,183,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showCheckbox && onToggle !== undefined ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                border: isChecked ? 'none' : '2px solid rgba(110,231,183,0.3)',
                background: isChecked ? 'linear-gradient(135deg, #10B981, #6EE7B7)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isChecked && <span style={{ color: '#070B07', fontSize: 14 }}>✓</span>}
            </button>
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                background: 'rgba(110,231,183,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#6EE7B7',
                flexShrink: 0,
              }}
            >
              {index != null ? index : ''}
            </div>
          )}
          <input
            aria-label="Exercise name"
            value={name || ''}
            onChange={(e) => onFieldChange({ name: e.target.value })}
            style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 100px' }}>
            Sets
            <input
              aria-label="Sets"
              value={sets || ''}
              onChange={(e) => onFieldChange({ sets: e.target.value })}
              style={{ ...fieldStyle, width: '100%' }}
            />
          </label>
          <label style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 80px' }}>
            Rest
            <input
              aria-label="Rest"
              value={rest || ''}
              onChange={(e) => onFieldChange({ rest: e.target.value })}
              style={{ ...fieldStyle, width: '100%' }}
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: showCheckbox ? '12px 0' : '10px 0',
          borderBottom: isLast ? 'none' : '1px solid rgba(110,231,183,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {showCheckbox && onToggle !== undefined ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle() }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                border: isChecked ? 'none' : '2px solid rgba(110,231,183,0.3)',
                background: isChecked ? 'linear-gradient(135deg, #10B981, #6EE7B7)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isChecked && <span style={{ color: '#070B07', fontSize: 14 }}>✓</span>}
            </button>
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(110,231,183,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6EE7B7', flexShrink: 0 }}>
              {index != null ? index : ''}
            </div>
          )}
          <button
            onClick={() => setModalOpen(true)}
            style={{
              flex: 1,
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: showCheckbox ? 14 : 13, fontWeight: 600, color: '#D1FAE5', textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.7 : 1 }}>
                {name}
              </span>
              <span style={{ fontSize: 12, color: '#2D5B3F' }} title="Tap for exercise details">ℹ️</span>
            </div>
            <div style={{ fontSize: 11, color: '#1F4030', marginTop: 2 }}>Rest {rest || '60s'}</div>
          </button>
        </div>
        <div className="gradient-green" style={{ fontSize: showCheckbox ? 13 : 12, fontWeight: 700, flexShrink: 0 }}>{sets}</div>
      </div>
      <ExerciseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        exerciseName={name}
        sets={sets}
        rest={rest}
      />
    </>
  )
}
