'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { trainers, getTrainer } from '../../lib/trainers'
import { useAuth } from '../components/AuthProvider'

const steps = ['basics', 'body', 'goals', 'trainer']

const TIPS = [
  'Tip: Progressive overload is the #1 driver of muscle growth',
  'Tip: Consistency beats intensity — show up, then optimize',
  'Tip: Sleep and recovery are when your body actually builds muscle',
  'Tip: Hit your protein target first — 1.6-2.2g per kg bodyweight',
  'Tip: Track your weight weekly to stay accountable',
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generatingPlans, setGeneratingPlans] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    weight_kg: '',
    height_cm: '',
    activity: '',
    goal: '',
    trainer: 'bro',
    units: 'metric',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (!generatingPlans) return
    const t = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3000)
    return () => clearInterval(t)
  }, [generatingPlans])

  const goNext = () => {
    if (step < steps.length - 1) {
      setDirection(1)
      setStep(step + 1)
    } else handleSubmit()
  }
  const goBack = () => {
    setDirection(-1)
    setStep(step - 1)
  }

  const canNext = () => {
    if (step === 0) return form.name && form.age && form.gender
    if (step === 1) return form.weight_kg && form.height_cm && form.activity
    if (step === 2) return form.goal && String(form.goal).trim().length >= 10
    if (step === 3) return form.trainer
    return false
  }

  const handleSubmit = async () => {
    if (!user || !supabase) return
    setLoading(true)
    try {
      const goalText = String(form.goal || '').trim()
      const ageVal = form.age ? parseInt(form.age, 10) : null
      const weightVal = form.weight_kg ? parseFloat(form.weight_kg) : null
      const heightVal = form.height_cm ? parseFloat(form.height_cm) : null

      const insertPayload = {
        user_id: user.id,
        name: String(form.name || '').trim() || 'User',
        age: Number.isInteger(ageVal) && ageVal > 0 ? ageVal : null,
        gender: String(form.gender || ''),
        weight_kg: typeof weightVal === 'number' && !Number.isNaN(weightVal) && weightVal > 0 ? weightVal : null,
        height_cm: typeof heightVal === 'number' && !Number.isNaN(heightVal) && heightVal > 0 ? heightVal : null,
        activity: String(form.activity || ''),
        goal: goalText || 'General fitness',
        trainer: String(form.trainer || 'bro'),
        units: String(form.units || 'metric'),
      }
      if (insertPayload.weight_kg === null || insertPayload.height_cm === null) {
        alert('Please enter valid weight and height.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([insertPayload])
        .select()

      if (error) {
        console.error('Supabase profile insert error:', error)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Insert payload:', JSON.stringify(insertPayload, null, 2))
        alert('Error: ' + (error.message || 'Failed to create profile'))
        setLoading(false)
        return
      }

      const onboardingContext = { detailedGoal: goalText }
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_context: onboardingContext })
          .eq('id', data[0].id)
      } catch (persistErr) {
        console.warn('Could not persist onboarding context:', persistErr)
      }

      const fullProfile = { ...data[0], onboarding_context: onboardingContext }
      localStorage.setItem('profileId', data[0].id)
      localStorage.setItem('profile', JSON.stringify(fullProfile))
      localStorage.setItem('onboardingContext', JSON.stringify(onboardingContext))

      await refreshProfile()

      setLoading(false)
      setGeneratingPlans(true)

      try {
        const res = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: data[0].id,
            profile: fullProfile,
            trainerId: form.trainer,
            onboardingContext,
          }),
        })
        const result = await res.json()
        if (result.success) {
          await refreshProfile()
        }
      } catch (planErr) {
        console.warn('Plan generation failed, continuing to dashboard:', planErr)
      }
      router.push('/dashboard')
    } catch (err) {
      console.error('Error creating profile:', err)
      const errMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err))
      alert(`Something went wrong: ${errMsg}\n\nCheck the browser console for full details.`)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(14,20,14,0.55)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(110,231,183,0.07)',
    borderRadius: 14,
    color: '#E2FBE8',
    fontSize: 15,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 500,
  }

  const optionButton = (field, value, label, emoji, staggerIndex = 0) => (
    <motion.button
      key={value}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: staggerIndex * 0.05, duration: 0.25 }}
      onClick={() => update(field, value)}
      style={{
        padding: '14px 16px',
        background: form[field] === value
          ? 'linear-gradient(135deg, rgba(110,231,183,0.12), rgba(16,185,129,0.06))'
          : 'rgba(14,20,14,0.55)',
        border: form[field] === value
          ? '2px solid rgba(110,231,183,0.3)'
          : '1px solid rgba(110,231,183,0.07)',
        borderRadius: 14,
        color: form[field] === value ? '#6EE7B7' : '#2D5B3F',
        fontSize: 14,
        fontWeight: 600,
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(24px)',
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      {label}
    </motion.button>
  )

  if (!user) return null

  if (generatingPlans) {
    const trainer = getTrainer(form.trainer)
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ minHeight: '100vh', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: 72, marginBottom: 24 }}
        >
          {trainer.emoji}
        </motion.div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
          {trainer.name} is building your program...
        </div>
        <div style={{ width: '100%', maxWidth: 240, height: 6, borderRadius: 100, background: 'rgba(110,231,183,0.15)', marginBottom: 32, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #6EE7B7)', borderRadius: 100 }}
          />
        </div>
        <motion.p
          key={tipIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 13, color: '#2D5B3F', textAlign: 'center', maxWidth: 320 }}
        >
          {TIPS[tipIndex]}
        </motion.p>
      </motion.div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span style={{
            fontSize: 16,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #F97316, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginLeft: 6,
          }}>AI</span>
        </h1>
        <p style={{ color: '#2D5B3F', fontSize: 14, marginTop: 8 }}>
          Your AI-powered personal trainer
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 100, background: 'rgba(110,231,183,0.08)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: i <= step ? '100%' : 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: 100,
                background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
                boxShadow: '0 0 8px rgba(110,231,183,0.3)',
              }}
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 0 && (
          <motion.div
            key="step0"
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.25 }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Let&apos;s get started</h2>
            <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>Tell us a bit about yourself</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Your name</label>
                <input type="text" placeholder="e.g. Anthony" value={form.name} onChange={(e) => update('name', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Age</label>
                <input type="number" placeholder="e.g. 26" value={form.age} onChange={(e) => update('age', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Gender</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {optionButton('gender', 'male', 'Male', '👨', 0)}
                  {optionButton('gender', 'female', 'Female', '👩', 1)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.25 }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Your body stats</h2>
            <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>We&apos;ll use these to personalize your plans</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['metric', 'imperial'].map((unit) => (
                  <button
                    key={unit}
                    onClick={() => update('units', unit)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 12,
                      border: form.units === unit ? '2px solid rgba(110,231,183,0.3)' : '1px solid rgba(110,231,183,0.07)',
                      background: form.units === unit ? 'rgba(110,231,183,0.08)' : 'transparent',
                      color: form.units === unit ? '#6EE7B7' : '#2D5B3F',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {unit === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lbs/ft)'}
                  </button>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Weight ({form.units === 'metric' ? 'kg' : 'lbs'})</label>
                <input type="number" placeholder={form.units === 'metric' ? 'e.g. 85' : 'e.g. 187'} value={form.weight_kg} onChange={(e) => update('weight_kg', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Height ({form.units === 'metric' ? 'cm' : 'inches'})</label>
                <input type="number" placeholder={form.units === 'metric' ? 'e.g. 178' : 'e.g. 70'} value={form.height_cm} onChange={(e) => update('height_cm', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Activity level</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {optionButton('activity', 'sedentary', 'Sedentary — desk job, no exercise', '🪑', 0)}
                  {optionButton('activity', 'light', 'Light — exercise 1-2x/week', '🚶', 1)}
                  {optionButton('activity', 'moderate', 'Moderate — exercise 3-4x/week', '🏃', 2)}
                  {optionButton('activity', 'active', 'Active — exercise 5-6x/week', '💪', 3)}
                  {optionButton('activity', 'very_active', 'Very active — intense daily training', '🔥', 4)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.25 }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>What&apos;s your goal?</h2>
            <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>Tell your trainer what you want to achieve</p>
            <div>
              <textarea
                placeholder="e.g. Lose 8kg in 4 months, get a bigger chest with visible abs, and improve energy levels"
                value={form.goal}
                onChange={(e) => update('goal', e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
              />
              {form.goal && form.goal.trim().length < 10 && (
                <p style={{ fontSize: 12, color: '#FB7185', marginTop: 6 }}>Please enter at least 10 characters</p>
              )}
            </div>
          </motion.div>
        )}
        {step === 3 && (
          <motion.div
            key="step3"
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.25 }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Pick your trainer</h2>
            <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>You can switch anytime</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trainers.map((t, i) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  onClick={() => update('trainer', t.id)}
                  style={{
                    padding: '18px 16px',
                    background: form.trainer === t.id ? `linear-gradient(135deg, ${t.color}15, ${t.color}08)` : 'rgba(14,20,14,0.55)',
                    border: form.trainer === t.id ? `2px solid ${t.color}50` : '1px solid rgba(110,231,183,0.07)',
                    borderRadius: 16,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    backdropFilter: 'blur(24px)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{t.emoji}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: form.trainer === t.id ? t.color : '#D1FAE5' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: form.trainer === t.id ? '#6EE7B7' : '#2D5B3F', marginTop: 2 }}>{t.style}</div>
                  </div>
                  {form.trainer === t.id && (
                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 10px ${t.color}60` }} />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
        {step > 0 && (
          <button
            onClick={goBack}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 14,
              border: '1px solid rgba(110,231,183,0.1)',
              background: 'transparent',
              color: '#6EE7B7',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
        )}
        <motion.button
          onClick={goNext}
          disabled={!canNext() || loading}
          animate={canNext() ? { boxShadow: ['0 4px 20px rgba(16,185,129,0.25)', '0 4px 28px rgba(16,185,129,0.4)', '0 4px 20px rgba(16,185,129,0.25)'] } : {}}
          transition={{ duration: 2, repeat: canNext() ? Infinity : 0 }}
          style={{
            flex: 2,
            padding: 16,
            borderRadius: 14,
            border: 'none',
            background: canNext()
              ? step === steps.length - 1
                ? 'linear-gradient(135deg, #F97316, #EC4899)'
                : 'linear-gradient(135deg, #10B981, #6EE7B7)'
              : 'rgba(110,231,183,0.08)',
            color: canNext() ? (step === steps.length - 1 ? '#fff' : '#070B07') : '#1A3326',
            fontSize: 15,
            fontWeight: 700,
            boxShadow: canNext() ? '0 4px 20px rgba(16,185,129,0.25)' : 'none',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Setting up...' : step === steps.length - 1 ? 'Start Training 🔥' : 'Continue →'}
        </motion.button>
      </div>
    </div>
  )
}
