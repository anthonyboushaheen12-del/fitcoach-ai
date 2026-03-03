'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  mockProfile, mockWeightLogs, mockTrainers,
  mockWorkout, mockMealPlan,
} from '../../lib/mock-data'
import WeightModal from '../components/WeightModal'
import TrainerModal from '../components/TrainerModal'

/* ─── helpers ─── */
const glass = {
  background: 'rgba(14,20,14,0.55)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(110,231,183,0.07)',
  borderRadius: 22,
}

function card(delay) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: 'easeOut' },
  }
}

function MacroRing({ percent, color, size = 44, stroke = 3.5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (percent / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
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
        position: 'fixed', bottom: 88, left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(16,185,129,0.15)',
        border: '1px solid rgba(110,231,183,0.25)',
        borderRadius: 100,
        padding: '10px 20px',
        color: '#6EE7B7',
        fontSize: 14, fontWeight: 600,
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'rgba(14,20,14,0.95)',
        border: '1px solid rgba(110,231,183,0.15)',
        borderRadius: 10, padding: '7px 12px',
        fontSize: 13, color: '#6EE7B7', fontWeight: 700,
      }}>
        {payload[0].value} kg
      </div>
    )
  }
  return null
}

/* ─── main ─── */
export default function Dashboard() {
  const router = useRouter()
  const [weightModal, setWeightModal] = useState(false)
  const [trainerModal, setTrainerModal] = useState(false)
  const [activeTrainer, setActiveTrainer] = useState(mockProfile.trainer)
  const [checked, setChecked] = useState([])
  const [toast, setToast] = useState(null)

  const trainer = mockTrainers.find(t => t.id === activeTrainer) || mockTrainers[2]
  const total = mockWorkout.exercises.length
  const progress = checked.length / total
  const allDone = checked.length === total

  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const toggleExercise = i => {
    setChecked(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const macros = [
    { label: 'Calories', value: mockMealPlan.dailyCalories, unit: 'kcal', color: '#6EE7B7', pct: 78 },
    { label: 'Protein', value: mockMealPlan.protein, unit: '', color: '#FBBF24', pct: 65 },
    { label: 'Carbs', value: mockMealPlan.carbs, unit: '', color: '#93C5FD', pct: 80 },
    { label: 'Fats', value: mockMealPlan.fats, unit: '', color: '#FB7185', pct: 55 },
  ]

  return (
    <div style={{ padding: '20px 18px 0' }}>

      {/* ── A. Header ── */}
      <motion.div {...card(0)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>
            <span style={{ color: '#6EE7B7' }}>Fit</span>
            <span style={{ color: '#E2FBE8' }}>Coach</span>
            <span style={{
              fontSize: 13, fontWeight: 700, marginLeft: 5,
              background: 'linear-gradient(135deg, #F97316, #EC4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>AI</span>
          </h1>
          <p style={{ color: '#2D5B3F', fontSize: 13, fontWeight: 500, marginTop: 4 }}>
            {greeting}, {mockProfile.name} 👋
          </p>
        </div>
        <button
          onClick={() => setTrainerModal(true)}
          style={{
            width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
            background: `${trainer.color}18`,
            border: `1px solid ${trainer.color}40`,
            fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            boxShadow: `0 0 14px ${trainer.color}25`,
          }}
        >
          {trainer.emoji}
        </button>
      </motion.div>

      {/* ── B. Streak Bar ── */}
      <motion.div {...card(0.08)} style={{ ...glass, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { icon: '🔥', value: '12 days', label: 'Streak', color: '#F97316' },
            { icon: '⚡', value: '3/4', label: 'Workouts', color: '#FBBF24' },
            { icon: '📊', value: '-3.0 kg', label: 'Lost', color: '#6EE7B7' },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, padding: '10px 10px 8px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 14,
              borderTop: `2px solid ${stat.color}55`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 3 }}>{stat.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#E2FBE8', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600, marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── C. Progress Chart ── */}
      <motion.div {...card(0.16)} style={{ ...glass, padding: 0, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#E2FBE8' }}>Progress</div>
            <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 1 }}>Weight over time</div>
          </div>
          <button
            onClick={() => setWeightModal(true)}
            style={{
              padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
              background: 'rgba(110,231,183,0.08)',
              border: '1px solid rgba(110,231,183,0.15)',
              color: '#6EE7B7', fontSize: 12, fontWeight: 700,
            }}
          >
            ⚖️ Log
          </button>
        </div>
        <ResponsiveContainer width="100%" height={148}>
          <AreaChart data={mockWeightLogs} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#6EE7B7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date"
              tick={{ fill: '#2D5B3F', fontSize: 10, fontFamily: 'Outfit' }}
              axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#2D5B3F', fontSize: 10, fontFamily: 'Outfit' }}
              axisLine={false} tickLine={false}
              domain={[76, 90]} tickCount={4} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(110,231,183,0.15)', strokeWidth: 1 }} />
            <ReferenceLine y={mockProfile.target_weight} stroke="#6EE7B7"
              strokeDasharray="5 4" strokeOpacity={0.45}
              label={{ value: `${mockProfile.target_weight}kg`, fill: '#6EE7B7', fontSize: 10, position: 'insideTopRight', dx: -4, dy: -8 }} />
            <Area type="monotone" dataKey="weight"
              stroke="#6EE7B7" strokeWidth={2}
              fill="url(#wGrad)" dot={false} activeDot={{ r: 5, fill: '#6EE7B7', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── D. Today's Workout ── */}
      <motion.div {...card(0.24)} style={{ ...glass, padding: 0, marginBottom: 14, overflow: 'hidden' }}>
        {/* gradient top border */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #F97316, #EC4899)' }} />
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#E2FBE8' }}>{mockWorkout.todayName}</div>
            <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 2 }}>{total} exercises</div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(110,231,183,0.08)', borderRadius: 100, marginBottom: 14, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.35 }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #6EE7B7)', borderRadius: 100 }} />
          </div>

          {/* Exercises */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mockWorkout.exercises.map((ex, i) => (
              <div key={i} onClick={() => toggleExercise(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                {/* Numbered badge / check */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <AnimatePresence mode="wait">
                    {checked.includes(i) ? (
                      <motion.div key="chk"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, color: '#070B07', fontWeight: 800,
                          boxShadow: '0 0 10px rgba(110,231,183,0.35)',
                        }}>✓</motion.div>
                    ) : (
                      <motion.div key="num"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'rgba(110,231,183,0.08)',
                          border: '1px solid rgba(110,231,183,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#6EE7B7', fontWeight: 700,
                        }}>{i + 1}</motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: checked.includes(i) ? '#2D5B3F' : '#D1FAE5',
                    textDecoration: checked.includes(i) ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                  }}>{ex.name}</div>
                </div>
                <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, flexShrink: 0 }}>{ex.sets}</div>
              </div>
            ))}
          </div>

          {/* Completion banner */}
          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  marginTop: 16, padding: '12px', borderRadius: 14, textAlign: 'center',
                  background: 'rgba(110,231,183,0.08)',
                  border: '1px solid rgba(110,231,183,0.2)',
                  fontSize: 15, fontWeight: 700, color: '#6EE7B7',
                }}
              >
                🎉 Workout Complete!
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/plans')}
            style={{
              width: '100%', marginTop: 16, padding: '14px',
              borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}
          >
            Start Workout →
          </motion.button>
        </div>
      </motion.div>

      {/* ── E. Macros Grid ── */}
      <motion.div {...card(0.32)} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#E2FBE8', marginBottom: 10 }}>Today's Macros</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {macros.map(m => (
            <div key={m.label} style={{
              ...glass, borderRadius: 16, padding: 0, overflow: 'hidden',
            }}>
              <div style={{ height: 2, background: m.color, opacity: 0.7 }} />
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#E2FBE8', lineHeight: 1 }}>{m.value}</div>
                  {m.unit && <div style={{ fontSize: 10, color: '#2D5B3F', marginTop: 2 }}>{m.unit}</div>}
                </div>
                <MacroRing percent={m.pct} color={m.color} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── F. Nutrition Card ── */}
      <motion.div {...card(0.4)} style={{ ...glass, padding: 0, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 6px', borderBottom: '1px solid rgba(110,231,183,0.05)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#E2FBE8' }}>Nutrition Plan</div>
          <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 1 }}>{mockMealPlan.dailyCalories} kcal · {mockMealPlan.protein} protein</div>
        </div>
        <div style={{ padding: '8px 0' }}>
          {mockMealPlan.meals.map((meal, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 18px',
              borderBottom: i < mockMealPlan.meals.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{meal.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{meal.name}</div>
                <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.description}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E2FBE8' }}>{meal.calories}</div>
                <div style={{ fontSize: 10, color: '#2D5B3F' }}>{meal.protein}g P</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── G. Quick Actions ── */}
      <motion.div {...card(0.48)} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[
          { icon: '💬', label: 'Ask Mike', action: () => router.push('/chat') },
          { icon: '📷', label: 'Body Check', action: () => {} },
          { icon: '⚖️', label: 'Log Weight', action: () => setWeightModal(true) },
        ].map(btn => (
          <motion.button
            key={btn.label}
            whileTap={{ scale: 0.95 }}
            onClick={btn.action}
            style={{
              flex: 1, padding: '12px 8px',
              ...glass, borderRadius: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              cursor: 'pointer', border: '1px solid rgba(110,231,183,0.07)',
            }}
          >
            <span style={{ fontSize: 22 }}>{btn.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F' }}>{btn.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Modals */}
      <WeightModal visible={weightModal} onClose={() => setWeightModal(false)} onSave={showToast} />
      <TrainerModal visible={trainerModal} activeTrainerId={activeTrainer}
        onClose={() => setTrainerModal(false)}
        onSwitch={(msg, id) => { setActiveTrainer(id); showToast(msg) }} />

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast} />}
      </AnimatePresence>
    </div>
  )
}
