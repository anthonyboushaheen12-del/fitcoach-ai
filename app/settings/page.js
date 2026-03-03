'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockProfile, mockTrainers, mockWeightLogs } from '../../lib/mock-data'
import TrainerModal from '../components/TrainerModal'
import WeightModal from '../components/WeightModal'

const glass = {
  background: 'rgba(14,20,14,0.55)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(110,231,183,0.07)',
  borderRadius: 22,
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#1A3326', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
      {children}
    </div>
  )
}

function Sparkline({ data, width = 80, height = 24 }) {
  const vals = data.map(d => d.weight)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width
    const y = height - ((v - min) / (max - min || 1)) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="#6EE7B7" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(vals.length - 1) / (vals.length - 1) * width}
        cy={height - ((vals[vals.length - 1] - min) / (max - min || 1)) * height}
        r={3} fill="#6EE7B7" />
    </svg>
  )
}

function Toast({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(16,185,129,0.15)',
        border: '1px solid rgba(110,231,183,0.25)',
        borderRadius: 100, padding: '10px 20px',
        color: '#6EE7B7', fontSize: 14, fontWeight: 600,
        zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </motion.div>
  )
}

export default function Settings() {
  const [activeTrainer, setActiveTrainer] = useState(mockProfile.trainer)
  const [units, setUnits] = useState(mockProfile.units)
  const [trainerModal, setTrainerModal] = useState(false)
  const [weightModal, setWeightModal] = useState(false)
  const [toast, setToast] = useState(null)

  const trainer = mockTrainers.find(t => t.id === activeTrainer) || mockTrainers[2]
  const weightDelta = mockProfile.weight_kg - mockProfile.startWeight
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '20px 18px 32px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#E2FBE8' }}>Coach</span>
          <span style={{
            fontSize: 13, fontWeight: 700, marginLeft: 5,
            background: 'linear-gradient(135deg, #F97316, #EC4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>AI</span>
        </h1>
        <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>Settings</p>
      </div>

      {/* ─── Profile Card ─── */}
      <SectionTitle>Profile</SectionTitle>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        style={{ ...glass, padding: '20px 18px', marginBottom: 14 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#070B07',
            boxShadow: '0 0 18px rgba(110,231,183,0.3)',
          }}>
            {mockProfile.name[0]}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#E2FBE8' }}>{mockProfile.name}</div>
            <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 2 }}>
              {mockProfile.age} years · {mockProfile.gender}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Weight', value: `${mockProfile.weight_kg} kg` },
            { label: 'Height', value: `${mockProfile.height_cm} cm` },
            { label: 'Activity', value: mockProfile.activity.replace('_', ' ') },
            { label: 'Goal', value: mockProfile.goal.replace('_', ' ') },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(110,231,183,0.06)',
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#D1FAE5', textTransform: 'capitalize' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Body Stats Card ─── */}
      <SectionTitle>Body Stats</SectionTitle>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        style={{ ...glass, padding: '18px', marginBottom: 14 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 3 }}>Current Weight</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#E2FBE8', lineHeight: 1 }}>
              {mockProfile.weight_kg}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#2D5B3F', marginLeft: 4 }}>kg</span>
            </div>
          </div>
          <Sparkline data={mockWeightLogs} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, padding: '10px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(110,231,183,0.06)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, marginBottom: 2 }}>Target</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#D1FAE5' }}>{mockProfile.target_weight} kg</div>
          </div>
          <div style={{
            flex: 1, padding: '10px 12px',
            background: weightDelta < 0 ? 'rgba(110,231,183,0.06)' : 'rgba(251,113,133,0.06)',
            border: `1px solid ${weightDelta < 0 ? 'rgba(110,231,183,0.12)' : 'rgba(251,113,133,0.12)'}`,
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, marginBottom: 2 }}>Change</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: weightDelta < 0 ? '#6EE7B7' : '#FB7185' }}>
              {weightDelta > 0 ? '+' : ''}{weightDelta} kg
            </div>
          </div>
          <div style={{
            flex: 1, padding: '10px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(110,231,183,0.06)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, marginBottom: 2 }}>Remaining</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#D1FAE5' }}>
              {Math.abs(mockProfile.weight_kg - mockProfile.target_weight)} kg
            </div>
          </div>
        </div>
        <button
          onClick={() => setWeightModal(true)}
          style={{
            width: '100%', marginTop: 12, padding: '11px',
            borderRadius: 12, cursor: 'pointer',
            background: 'rgba(110,231,183,0.08)',
            border: '1px solid rgba(110,231,183,0.15)',
            color: '#6EE7B7', fontSize: 13, fontWeight: 700,
          }}
        >
          ⚖️ Log Today's Weight
        </button>
      </motion.div>

      {/* ─── Preferences Card ─── */}
      <SectionTitle>Preferences</SectionTitle>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        style={{ ...glass, overflow: 'hidden', marginBottom: 14 }}
      >
        {/* Trainer row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          borderBottom: '1px solid rgba(110,231,183,0.05)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `${trainer.color}18`,
            border: `1px solid ${trainer.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>{trainer.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#D1FAE5' }}>{trainer.name}</div>
            <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 1 }}>Current trainer</div>
          </div>
          <button
            onClick={() => setTrainerModal(true)}
            style={{
              padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
              background: 'rgba(110,231,183,0.08)',
              border: '1px solid rgba(110,231,183,0.15)',
              color: '#6EE7B7', fontSize: 12, fontWeight: 700,
            }}
          >
            Switch
          </button>
        </div>

        {/* Units toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>Units</div>
            <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 1 }}>Measurement system</div>
          </div>
          <div style={{
            display: 'flex', gap: 4, padding: 3,
            background: 'rgba(110,231,183,0.05)',
            border: '1px solid rgba(110,231,183,0.07)',
            borderRadius: 10,
          }}>
            {['metric', 'imperial'].map(u => (
              <button key={u} onClick={() => setUnits(u)} style={{
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                background: units === u ? 'rgba(110,231,183,0.12)' : 'transparent',
                border: units === u ? '1px solid rgba(110,231,183,0.2)' : '1px solid transparent',
                color: units === u ? '#6EE7B7' : '#2D5B3F',
                fontSize: 12, fontWeight: 600, transition: 'all 0.2s ease',
              }}>
                {u === 'metric' ? 'kg/cm' : 'lbs/ft'}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Data Card ─── */}
      <SectionTitle>Data</SectionTitle>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        style={{ ...glass, overflow: 'hidden', marginBottom: 32 }}
      >
        {[
          {
            label: 'Export Data', icon: '📤',
            sub: 'Download your fitness data',
            disabled: true, action: () => {},
          },
          {
            label: 'Clear Chat', icon: '🗑️',
            sub: 'Remove chat history',
            disabled: false, action: () => showToast('✓ Chat cleared'),
          },
        ].map((item, i) => (
          <button key={i} onClick={item.action} disabled={item.disabled} style={{
            width: '100%', padding: '14px 16px', cursor: item.disabled ? 'not-allowed' : 'pointer',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid rgba(110,231,183,0.05)',
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: item.disabled ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 1 }}>{item.sub}</div>
            </div>
            {!item.disabled && <span style={{ color: '#2D5B3F', fontSize: 12 }}>›</span>}
          </button>
        ))}

        {/* Reset (red border) */}
        <button
          onClick={() => showToast('⚠️ Reset requires confirmation in production')}
          style={{
            width: '100%', padding: '14px 16px', cursor: 'pointer',
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', gap: 12,
            borderTop: '1px solid rgba(251,113,133,0.08)',
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FB7185' }}>Reset Account</div>
            <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 1 }}>Delete all data permanently</div>
          </div>
        </button>
      </motion.div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <p style={{ fontSize: 11, color: '#1A3326', fontWeight: 500 }}>
          FitCoach AI v1.0 · Powered by Claude
        </p>
      </div>

      {/* Modals */}
      <TrainerModal visible={trainerModal} activeTrainerId={activeTrainer}
        onClose={() => setTrainerModal(false)}
        onSwitch={(msg, id) => { setActiveTrainer(id); showToast(msg) }} />
      <WeightModal visible={weightModal} onClose={() => setWeightModal(false)} onSave={showToast} />

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast} />}
      </AnimatePresence>
    </motion.div>
  )
}
