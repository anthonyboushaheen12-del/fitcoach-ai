'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { trainers, getTrainer } from '../lib/trainers'

const steps = ['basics', 'body', 'goals', 'trainer']

const TIPS = [
  'Tip: Progressive overload is the #1 driver of muscle growth',
  'Tip: Consistency beats intensity — show up, then optimize',
  'Tip: Sleep and recovery are when your body actually builds muscle',
  'Tip: Hit your protein target first — 1.6-2.2g per kg bodyweight',
  'Tip: Track your weight weekly to stay accountable',
]

export default function Onboarding() {
  const router = useRouter()
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
    custom_goal: '',
    detailed_goal: '',
    target_weight: '',
    has_current_body_photo: '',
    current_body_photo: '',
    aspiration_photo: '',
    has_workout_plan: '',
    workout_plan_details: '',
    has_meal_plan: '',
    meal_plan_details: '',
    trainer: 'bro',
    units: 'metric',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

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
    if (step === 2) {
      if (!form.goal || !form.target_weight) return false
      if (form.goal === 'custom') return form.custom_goal.trim().length > 0
      if (!form.detailed_goal.trim()) return false
      if (!form.has_current_body_photo) return false
      if (form.has_current_body_photo === 'yes' && !form.current_body_photo) return false
      if (!form.has_workout_plan || !form.has_meal_plan) return false
      if (form.has_workout_plan === 'yes' && !form.workout_plan_details.trim()) return false
      if (form.has_meal_plan === 'yes' && !form.meal_plan_details.trim()) return false
      return true
    }
    if (step === 3) return form.trainer
    return false
  }

  const handleImageUpload = (field, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.')
      return
    }
    // Keep images small so onboarding context can fit in localStorage safely.
    if (file.size > 1 * 1024 * 1024) {
      alert('Please upload an image under 1MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        update(field, reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const onboardingContext = {
        detailedGoal: form.detailed_goal.trim(),
        hasCurrentBodyPhoto: form.has_current_body_photo,
        currentBodyPhoto: form.has_current_body_photo === 'yes' ? form.current_body_photo : '',
        aspirationPhoto: form.aspiration_photo || '',
        hasWorkoutPlan: form.has_workout_plan,
        workoutPlanDetails: form.workout_plan_details.trim(),
        hasMealPlan: form.has_meal_plan,
        mealPlanDetails: form.meal_plan_details.trim(),
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          name: form.name,
          age: parseInt(form.age),
          gender: form.gender,
          weight_kg: parseFloat(form.weight_kg),
          height_cm: parseFloat(form.height_cm),
          activity: form.activity,
          goal: form.goal === 'custom' ? form.custom_goal.trim() : form.goal,
          target_weight: parseFloat(form.target_weight),
          trainer: form.trainer,
          units: form.units,
        }])
        .select()

      if (error) throw error

      // Persist onboarding context to Supabase if `onboarding_context` exists.
      // Keep onboarding working even if the column hasn't been added yet.
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_context: onboardingContext })
          .eq('id', data[0].id)
      } catch (persistErr) {
        console.warn('Could not persist onboarding context in Supabase:', persistErr)
      }

      // Save profile ID to localStorage for now (no auth yet)
      localStorage.setItem('profileId', data[0].id)
      const fullProfile = { ...data[0], onboarding_context: onboardingContext }
      localStorage.setItem('profile', JSON.stringify(fullProfile))
      localStorage.setItem('aspirationGoal', form.goal === 'custom' ? form.custom_goal.trim() : '')
      localStorage.setItem('onboardingContext', JSON.stringify(onboardingContext))

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
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', data[0].id).single()
          if (profileData) {
            const { data: plansData } = await supabase.from('plans').select('*').eq('profile_id', data[0].id).eq('active', true)
            const workout = plansData?.find((p) => p.type === 'workout')
            const meal = plansData?.find((p) => p.type === 'meal')
            localStorage.setItem('profile', JSON.stringify(profileData))
          }
        }
      } catch (planErr) {
        console.warn('Plan generation failed, continuing to dashboard:', planErr)
      }
      router.push('/dashboard')
    } catch (err) {
      console.error('Error creating profile:', err)
      alert('Something went wrong. Check console for details.')
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

  const inputFocusStyle = {
    ...inputStyle,
    borderColor: 'rgba(110,231,183,0.2)',
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
      {/* Header */}
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

      {/* Progress bar */}
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

      {/* Step content with slide animation */}
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Let's get started
          </h2>
          <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>
            Tell us a bit about yourself
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Your name
              </label>
              <input
                type="text"
                placeholder="e.g. Anthony"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Age
              </label>
              <input
                type="number"
                placeholder="e.g. 26"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Gender
              </label>
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Your body stats
          </h2>
          <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>
            We'll use these to personalize your plans
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Unit toggle */}
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
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Weight ({form.units === 'metric' ? 'kg' : 'lbs'})
              </label>
              <input
                type="number"
                placeholder={form.units === 'metric' ? 'e.g. 85' : 'e.g. 187'}
                value={form.weight_kg}
                onChange={(e) => update('weight_kg', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Height ({form.units === 'metric' ? 'cm' : 'inches'})
              </label>
              <input
                type="number"
                placeholder={form.units === 'metric' ? 'e.g. 178' : 'e.g. 70'}
                value={form.height_cm}
                onChange={(e) => update('height_cm', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Activity level
              </label>
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            What's your goal?
          </h2>
          <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>
            This shapes your entire program
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {optionButton('goal', 'lose_fat', 'Lose fat — get leaner and more defined', '🔥', 0)}
              {optionButton('goal', 'build_muscle', 'Build muscle — get bigger and stronger', '💪', 1)}
              {optionButton('goal', 'recomp', 'Body recomp — lose fat & gain muscle', '⚡', 2)}
              {optionButton('goal', 'maintain', 'Maintain — stay where I am', '🎯', 3)}
              {optionButton('goal', 'custom', 'Custom goal — I want to define my own target', '📝', 4)}
            </div>

            {form.goal === 'custom' && (
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Tell us your custom goal
                </label>
                <textarea
                  placeholder="e.g. Improve endurance for soccer while adding lean muscle and staying injury-free."
                  value={form.custom_goal}
                  onChange={(e) => update('custom_goal', e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Be specific about your goal *
              </label>
              <textarea
                placeholder="e.g. Lose 8kg in 4 months, keep strength, and improve energy levels."
                value={form.detailed_goal}
                onChange={(e) => update('detailed_goal', e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }}
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Target weight ({form.units === 'metric' ? 'kg' : 'lbs'})
              </label>
              <input
                type="number"
                placeholder={form.units === 'metric' ? 'e.g. 78' : 'e.g. 172'}
                value={form.target_weight}
                onChange={(e) => update('target_weight', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Current body photo *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {optionButton('has_current_body_photo', 'yes', 'Yes — I will upload a photo', '📷', 0)}
                {optionButton('has_current_body_photo', 'no', 'No — skip for now', '🚫', 1)}
              </div>
              {form.has_current_body_photo === 'yes' && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('current_body_photo', e)}
                    style={{
                      ...inputStyle,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      marginTop: 10,
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#1F4030', marginTop: 6 }}>
                    Upload your current physique photo (max 1MB).
                  </div>
                  {form.current_body_photo && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={form.current_body_photo}
                        alt="Current body preview"
                        style={{
                          width: '100%',
                          maxHeight: 180,
                          objectFit: 'cover',
                          borderRadius: 12,
                          border: '1px solid rgba(110,231,183,0.12)',
                        }}
                      />
                      <button
                        onClick={() => update('current_body_photo', '')}
                        style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(251,113,133,0.25)',
                          background: 'transparent',
                          color: '#FB7185',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Remove photo
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Do you currently follow a workout plan? *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {optionButton('has_workout_plan', 'yes', 'Yes', '🏋️', 0)}
                {optionButton('has_workout_plan', 'no', 'No', '🚫', 1)}
              </div>
            </div>

            {form.has_workout_plan === 'yes' && (
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Current workout plan details *
                </label>
                <textarea
                  placeholder="e.g. 4-day upper/lower, ~60 mins/session, progressive overload focus."
                  value={form.workout_plan_details}
                  onChange={(e) => update('workout_plan_details', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 82 }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Do you currently follow a meal plan? *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {optionButton('has_meal_plan', 'yes', 'Yes', '🥗', 0)}
                {optionButton('has_meal_plan', 'no', 'No', '🚫', 1)}
              </div>
            </div>

            {form.has_meal_plan === 'yes' && (
              <div>
                <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Current meal plan details *
                </label>
                <textarea
                  placeholder="e.g. 2,200 kcal/day, high-protein, meal prep 5 days/week."
                  value={form.meal_plan_details}
                  onChange={(e) => update('meal_plan_details', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 82 }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                Body aspiration photo (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('aspiration_photo', e)}
                style={{
                  ...inputStyle,
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ fontSize: 11, color: '#1F4030', marginTop: 6 }}>
                Optional: upload a reference physique photo (max 1MB).
              </div>
              {form.aspiration_photo && (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={form.aspiration_photo}
                    alt="Aspiration preview"
                    style={{
                      width: '100%',
                      maxHeight: 180,
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: '1px solid rgba(110,231,183,0.12)',
                    }}
                  />
                  <button
                    onClick={() => update('aspiration_photo', '')}
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(251,113,133,0.25)',
                      background: 'transparent',
                      color: '#FB7185',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Pick your trainer
          </h2>
          <p style={{ color: '#2D5B3F', fontSize: 14, marginBottom: 24 }}>
            You can switch anytime
          </p>

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
                  background: form.trainer === t.id
                    ? `linear-gradient(135deg, ${t.color}15, ${t.color}08)`
                    : 'rgba(14,20,14,0.55)',
                  border: form.trainer === t.id
                    ? `2px solid ${t.color}50`
                    : '1px solid rgba(110,231,183,0.07)',
                  borderRadius: 16,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  backdropFilter: 'blur(24px)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: `${t.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  flexShrink: 0,
                }}>{t.emoji}</div>
                <div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: form.trainer === t.id ? t.color : '#D1FAE5',
                  }}>{t.name}</div>
                  <div style={{
                    fontSize: 12,
                    color: form.trainer === t.id ? '#6EE7B7' : '#2D5B3F',
                    marginTop: 2,
                  }}>{t.style}</div>
                </div>
                {form.trainer === t.id && (
                  <div style={{
                    marginLeft: 'auto',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: t.color,
                    boxShadow: `0 0 10px ${t.color}60`,
                  }} />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
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