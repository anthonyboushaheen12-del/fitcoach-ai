'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { mockTrainers } from '../lib/mock-data'

const STEPS = ['basics', 'body', 'goals', 'trainer']

const TIPS = [
  "Progressive overload is the #1 driver of muscle growth",
  "Sleep 7-9 hours — your muscles grow while you rest",
  "Protein target: 1.6-2.2g per kg of bodyweight",
  "Mobility is positional power — it lets you train harder, safer",
  "Data > Feelings — track everything",
]

function LoadingScreen({ trainer }) {
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 72, marginBottom: 28, filter: 'drop-shadow(0 0 24px rgba(110,231,183,0.3))' }}
      >
        {trainer?.emoji || '💪'}
      </motion.div>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#E2FBE8', marginBottom: 8, letterSpacing: -0.5 }}>
        {trainer?.name || 'Your Trainer'} is building your program...
      </h2>
      <p style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 48 }}>Personalizing everything for you</p>

      <div style={{
        padding: '20px 24px',
        background: 'rgba(14,20,14,0.55)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(110,231,183,0.07)',
        borderRadius: 18,
        maxWidth: 340,
        minHeight: 88,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            style={{ fontSize: 14, color: '#6EE7B7', fontWeight: 500, lineHeight: 1.6, fontStyle: 'italic' }}
          >
            "{TIPS[tipIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 44 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#6EE7B7' }}
          />
        ))}
      </div>
    </motion.div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(14,20,14,0.55)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(110,231,183,0.07)',
  borderRadius: 14,
  color: '#E2FBE8',
  fontSize: 15,
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 500,
  outline: 'none',
}

const labelStyle = { fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }

function OptionBtn({ field, value, label, emoji, selected, onSelect, delay = 0 }) {
  const active = selected === value
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <button
        onClick={() => onSelect(field, value)}
        style={{
          width: '100%', padding: '14px 16px',
          background: active ? 'linear-gradient(135deg, rgba(110,231,183,0.12), rgba(16,185,129,0.06))' : 'rgba(14,20,14,0.55)',
          border: active ? '2px solid rgba(110,231,183,0.3)' : '1px solid rgba(110,231,183,0.07)',
          borderRadius: 14,
          color: active ? '#6EE7B7' : '#2D5B3F',
          fontSize: 14, fontWeight: 600, textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          transition: 'all 0.2s ease', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 20 }}>{emoji}</span>{label}
      </button>
    </motion.div>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', age: '', gender: '',
    weight_kg: '', height_cm: '', activity: '',
    goal: '', target_weight: '',
    trainer: 'bro', units: 'metric',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.age && form.gender
    if (step === 1) return form.weight_kg && form.height_cm && form.activity
    if (step === 2) return form.goal && form.target_weight
    if (step === 3) return !!form.trainer
    return false
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) { setDirection(1); setStep(s => s + 1) }
    else { setLoading(true); setTimeout(() => router.push('/dashboard'), 3000) }
  }

  const handleBack = () => { setDirection(-1); setStep(s => s - 1) }

  const selectedTrainer = mockTrainers.find(t => t.id === form.trainer)

  if (loading) return <LoadingScreen trainer={selectedTrainer} />

  const stepVariants = {
    enter: dir => ({ x: dir > 0 ? 52 : -52, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: dir => ({ x: dir > 0 ? -52 : 52, opacity: 0 }),
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 48px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#E2FBE8' }}>Coach</span>
          <span style={{
            fontSize: 14, fontWeight: 700, marginLeft: 6,
            background: 'linear-gradient(135deg, #F97316, #EC4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>AI</span>
        </h1>
        <p style={{ color: '#2D5B3F', fontSize: 13, marginTop: 6 }}>Your AI-powered personal trainer</p>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: i <= step ? 'linear-gradient(90deg, #10B981, #6EE7B7)' : 'rgba(110,231,183,0.08)',
              boxShadow: i <= step ? '0 0 8px rgba(110,231,183,0.3)' : 'none',
            }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, height: 4, borderRadius: 100 }}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          {/* STEP 0 — Basics */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#E2FBE8', marginBottom: 4 }}>Let's get started</h2>
              <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>Tell us a bit about yourself</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Your name</label>
                  <input type="text" placeholder="e.g. Anthony" value={form.name}
                    onChange={e => update('name', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Age</label>
                  <input type="number" placeholder="e.g. 27" value={form.age}
                    onChange={e => update('age', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <OptionBtn field="gender" value="male" label="Male" emoji="👨" selected={form.gender} onSelect={update} delay={0} />
                    <OptionBtn field="gender" value="female" label="Female" emoji="👩" selected={form.gender} onSelect={update} delay={0.05} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — Body */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#E2FBE8', marginBottom: 4 }}>Your body stats</h2>
              <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>We'll use these to personalize your plans</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['metric', 'imperial'].map(unit => (
                    <button key={unit} onClick={() => update('units', unit)} style={{
                      flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer',
                      border: form.units === unit ? '2px solid rgba(110,231,183,0.3)' : '1px solid rgba(110,231,183,0.07)',
                      background: form.units === unit ? 'rgba(110,231,183,0.08)' : 'transparent',
                      color: form.units === unit ? '#6EE7B7' : '#2D5B3F',
                      fontSize: 13, fontWeight: 600, transition: 'all 0.2s ease',
                    }}>
                      {unit === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lbs/ft)'}
                    </button>
                  ))}
                </div>
                <div>
                  <label style={labelStyle}>Weight ({form.units === 'metric' ? 'kg' : 'lbs'})</label>
                  <input type="number" placeholder={form.units === 'metric' ? 'e.g. 85' : 'e.g. 187'}
                    value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Height ({form.units === 'metric' ? 'cm' : 'inches'})</label>
                  <input type="number" placeholder={form.units === 'metric' ? 'e.g. 178' : 'e.g. 70'}
                    value={form.height_cm} onChange={e => update('height_cm', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Activity level</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { v: 'sedentary', l: 'Sedentary — desk job, no exercise', e: '🪑' },
                      { v: 'light', l: 'Light — exercise 1-2x/week', e: '🚶' },
                      { v: 'moderate', l: 'Moderate — exercise 3-4x/week', e: '🏃' },
                      { v: 'active', l: 'Active — exercise 5-6x/week', e: '💪' },
                      { v: 'very_active', l: 'Very active — intense daily training', e: '🔥' },
                    ].map(({ v, l, e }, i) => (
                      <OptionBtn key={v} field="activity" value={v} label={l} emoji={e}
                        selected={form.activity} onSelect={update} delay={i * 0.05} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Goals */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#E2FBE8', marginBottom: 4 }}>What's your goal?</h2>
              <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>This shapes your entire program</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { v: 'lose_fat', l: 'Lose fat — get leaner and more defined', e: '🔥' },
                    { v: 'build_muscle', l: 'Build muscle — get bigger and stronger', e: '💪' },
                    { v: 'recomp', l: 'Body recomp — lose fat & gain muscle', e: '⚡' },
                    { v: 'maintain', l: 'Maintain — stay where I am', e: '🎯' },
                  ].map(({ v, l, e }, i) => (
                    <OptionBtn key={v} field="goal" value={v} label={l} emoji={e}
                      selected={form.goal} onSelect={update} delay={i * 0.05} />
                  ))}
                </div>
                <div>
                  <label style={labelStyle}>Target weight ({form.units === 'metric' ? 'kg' : 'lbs'})</label>
                  <input type="number" placeholder={form.units === 'metric' ? 'e.g. 78' : 'e.g. 172'}
                    value={form.target_weight} onChange={e => update('target_weight', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Trainer */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#E2FBE8', marginBottom: 4 }}>Pick your trainer</h2>
              <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>You can switch anytime</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mockTrainers.map((t, i) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    onClick={() => update('trainer', t.id)}
                    style={{
                      padding: '18px 16px', cursor: 'pointer',
                      background: form.trainer === t.id ? `linear-gradient(135deg, ${t.color}18, ${t.color}08)` : 'rgba(14,20,14,0.55)',
                      border: form.trainer === t.id ? `2px solid ${t.color}55` : '1px solid rgba(110,231,183,0.07)',
                      borderRadius: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
                      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                      transition: 'all 0.2s ease',
                      boxShadow: form.trainer === t.id ? `0 0 18px ${t.color}22` : 'none',
                    }}
                  >
                    <div style={{
                      width: 50, height: 50, borderRadius: 14,
                      background: `${t.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26, flexShrink: 0,
                    }}>{t.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: form.trainer === t.id ? t.color : '#D1FAE5' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 2 }}>{t.style}</div>
                    </div>
                    {form.trainer === t.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: t.color, boxShadow: `0 0 10px ${t.color}80`,
                        }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
        {step > 0 && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleBack} style={{
            flex: 1, padding: 16, borderRadius: 14, cursor: 'pointer',
            border: '1px solid rgba(110,231,183,0.1)', background: 'transparent',
            color: '#6EE7B7', fontSize: 15, fontWeight: 600,
          }}>
            ← Back
          </motion.button>
        )}
        <motion.button
          animate={canNext() ? { boxShadow: ['0 4px 20px rgba(16,185,129,0.2)', '0 4px 28px rgba(16,185,129,0.42)', '0 4px 20px rgba(16,185,129,0.2)'] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={!canNext()}
          style={{
            flex: 2, padding: 16, borderRadius: 14, border: 'none',
            background: canNext()
              ? step === STEPS.length - 1 ? 'linear-gradient(135deg, #F97316, #EC4899)' : 'linear-gradient(135deg, #10B981, #6EE7B7)'
              : 'rgba(110,231,183,0.06)',
            color: canNext() ? (step === STEPS.length - 1 ? '#fff' : '#070B07') : '#1A3326',
            fontSize: 15, fontWeight: 700, cursor: canNext() ? 'pointer' : 'default',
            transition: 'background 0.2s ease, color 0.2s ease',
          }}
        >
          {step === STEPS.length - 1 ? 'Start Training 🔥' : 'Continue →'}
        </motion.button>
      </div>
    </div>
  )
}
