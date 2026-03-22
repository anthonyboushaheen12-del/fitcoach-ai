'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getTrainer, trainers as trainersList } from '../../lib/trainers'
import { useAuth } from '../components/AuthProvider'
import ExerciseRow from '../components/ExerciseRow'
import WorkoutMuscleMap from '../components/WorkoutMuscleMap'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEAL_EMOJIS = ['🍳', '🥗', '🍌', '🥩']

const WORKOUT_QUIZ_BODY_STEP = 0
const WORKOUT_QUIZ_STEP_COUNT = 7

const LABEL_MAP = {
  beginner: '🟢 Beginner',
  intermediate: '🟡 Intermediate',
  advanced: '🔴 Advanced',
  overall_muscle: '💪 Overall Muscle',
  legs_glutes: '🦵 Legs & Glutes',
  upper_body: '🏋️ Upper Body',
  arms: '💪 Arms',
  core: '🔥 Core & Abs',
  athletic: '⚡ Athletic Performance',
  cardio: '🏃 Cardio & Endurance',
  full_gym: '🏢 Full Gym',
  home_gym: '🏠 Home Gym',
  barbell_only: '🏋️ Barbell & Rack',
  dumbbells_only: '💪 Dumbbells Only',
  bodyweight: '🤸 Bodyweight',
  '30-45': '⚡ 30-45 min',
  '45-60': '💪 45-60 min',
  '60-90': '🔥 60-90 min',
  3: '3 days/week',
  4: '4 days/week',
  5: '5 days/week',
  6: '6 days/week',
}

function formatWorkoutPrefLabel(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.map((v) => LABEL_MAP[v] ?? String(v)).join(', ')
  return LABEL_MAP[value] ?? String(value)
}

function hasActiveWorkoutPlan(planRows) {
  return (planRows || []).some((p) => p.type === 'workout' && p.active)
}

const WORKOUT_STEPS = [
  {
    id: 'experience',
    q: "What's your training experience?",
    options: [
      { value: 'beginner', label: 'Beginner — Less than 6 months', emoji: '🟢' },
      { value: 'intermediate', label: 'Intermediate — 6 months to 2 years', emoji: '🟡' },
      { value: 'advanced', label: 'Advanced — 2+ years', emoji: '🔴' },
    ],
    multi: false,
  },
  {
    id: 'daysPerWeek',
    q: 'How many days per week can you train?',
    options: [
      { value: 3, label: '3 days' },
      { value: 4, label: '4 days' },
      { value: 5, label: '5 days' },
      { value: 6, label: '6 days' },
    ],
    multi: false,
  },
  {
    id: 'focus',
    q: 'What do you want to focus on?',
    options: [
      { value: 'overall_muscle', label: 'Overall Muscle Building', emoji: '💪' },
      { value: 'legs_glutes', label: 'Legs & Glutes', emoji: '🦵' },
      { value: 'upper_body', label: 'Upper Body (Chest, Back, Shoulders)', emoji: '🏋️' },
      { value: 'arms', label: 'Arms (Biceps, Triceps)', emoji: '💪' },
      { value: 'core', label: 'Core & Abs', emoji: '🔥' },
      { value: 'athletic', label: 'Athletic Performance', emoji: '⚡' },
      { value: 'cardio', label: 'Cardio & Endurance', emoji: '🏃' },
    ],
    multi: true,
  },
  {
    id: 'equipment',
    q: 'What equipment do you have access to?',
    options: [
      { value: 'full_gym', label: 'Full Gym (all equipment)', emoji: '🏢' },
      { value: 'home_gym', label: 'Home Gym (dumbbells, bench, pull-up bar)', emoji: '🏠' },
      { value: 'barbell_only', label: 'Barbell & Rack Only', emoji: '🏋️' },
      { value: 'dumbbells_only', label: 'Dumbbells Only', emoji: '💪' },
      { value: 'bodyweight', label: 'Bodyweight Only', emoji: '🤸' },
    ],
    multi: true,
  },
  {
    id: 'sessionDuration',
    q: 'How long are your workout sessions?',
    options: [
      { value: '30-45', label: '30-45 minutes (quick)', emoji: '⚡' },
      { value: '45-60', label: '45-60 minutes (standard)', emoji: '💪' },
      { value: '60-90', label: '60-90 minutes (thorough)', emoji: '🔥' },
    ],
    multi: false,
  },
  {
    id: 'injuries',
    q: 'Any injuries or limitations?',
    optional: true,
    textarea: true,
  },
]

const MEAL_STEPS = [
  {
    id: 'diet',
    q: 'Any dietary preferences?',
    options: [
      { value: 'no_restrictions', label: 'No restrictions', emoji: '🥩' },
      { value: 'vegetarian', label: 'Vegetarian', emoji: '🌿' },
      { value: 'vegan', label: 'Vegan', emoji: '🌱' },
      { value: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
      { value: 'keto', label: 'Keto / Low Carb', emoji: '🥓' },
      { value: 'halal', label: 'Halal', emoji: '🕌' },
      { value: 'kosher', label: 'Kosher', emoji: '✡️' },
    ],
    multi: false,
  },
  {
    id: 'mealsPerDay',
    q: 'How many meals do you prefer per day?',
    options: [
      { value: 3, label: '3 meals' },
      { value: 4, label: '4 meals (3 + 1 snack)' },
      { value: 5, label: '5 meals (3 + 2 snacks)' },
      { value: 6, label: '6 meals (serious bulking)' },
    ],
    multi: false,
  },
  {
    id: 'cookingAbility',
    q: 'How much time can you spend cooking?',
    options: [
      { value: 'minimal', label: 'Minimal — Quick meals (under 15 min)', emoji: '⚡' },
      { value: 'moderate', label: 'Moderate — Basic meals (15-30 min)', emoji: '🍳' },
      { value: 'advanced', label: 'Advanced — Detailed recipes (30+ min)', emoji: '👨‍🍳' },
    ],
    multi: false,
  },
  {
    id: 'allergies',
    q: 'Any allergies or foods you hate?',
    optional: true,
    textarea: true,
  },
  {
    id: 'budget',
    q: "What's your food budget like?",
    options: [
      { value: 'budget', label: 'Budget-friendly', emoji: '💰' },
      { value: 'moderate', label: 'Moderate', emoji: '💎' },
      { value: 'premium', label: 'No limit', emoji: '👑' },
    ],
    multi: false,
  },
]

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

export default function Plans() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, refreshProfile } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('overview')
  const [subView, setSubView] = useState('today')
  const [expandedDay, setExpandedDay] = useState(null)
  const [checkedExercises, setCheckedExercises] = useState({})
  const [workoutQuizStep, setWorkoutQuizStep] = useState(0)
  const [mealQuizStep, setMealQuizStep] = useState(0)
  const [workoutPrefs, setWorkoutPrefs] = useState({})
  const [mealPrefs, setMealPrefs] = useState({})
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [direction, setDirection] = useState(1)
  const [bodyGoalImageBase64, setBodyGoalImageBase64] = useState(null)
  const [bodyGoalImageMediaType, setBodyGoalImageMediaType] = useState('image/jpeg')
  const [bodyGoalPreviewUrl, setBodyGoalPreviewUrl] = useState(null)
  const [bodyGoalDescription, setBodyGoalDescription] = useState('')
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [trainerRecommendation, setTrainerRecommendation] = useState(null)
  const [selectedTrainerId, setSelectedTrainerId] = useState('bro')
  const [pendingGenerateType, setPendingGenerateType] = useState(null)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    if (user && !profile) { router.push('/onboarding'); return }
  }, [user, profile, router])

  useEffect(() => {
    const start = searchParams.get('start')
    if (start === 'workout') {
      setWorkoutQuizStep(WORKOUT_QUIZ_BODY_STEP)
      setView('workout-quiz')
    }
    if (start === 'meal') setView('meal-quiz')
  }, [searchParams])

  useEffect(() => {
    if (!profile?.id) return
    loadPlans(profile.id)
  }, [profile?.id])

  useEffect(() => {
    if (profile?.preferences?.workout) setWorkoutPrefs(profile.preferences.workout)
    if (profile?.preferences?.meal) setMealPrefs(profile.preferences.meal)
  }, [profile?.preferences])

  async function loadPlans(profileId) {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  function toggleExercise(dayIdx, exIdx) {
    setCheckedExercises((prev) => ({ ...prev, [`${dayIdx}-${exIdx}`]: !prev[`${dayIdx}-${exIdx}`] }))
  }

  const updateWorkoutPref = (key, value) => {
    setWorkoutPrefs((p) => ({ ...p, [key]: value }))
  }
  const updateMealPref = (key, value) => {
    setMealPrefs((p) => ({ ...p, [key]: value }))
  }

  const toggleMulti = (key, value, isWorkout) => {
    const setter = isWorkout ? updateWorkoutPref : updateMealPref
    const prefs = isWorkout ? workoutPrefs : mealPrefs
    const arr = Array.isArray(prefs[key]) ? prefs[key] : []
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
    setter(key, next)
  }

  function clearBodyGoalUpload() {
    setBodyGoalImageBase64(null)
    setBodyGoalPreviewUrl(null)
    setBodyGoalDescription('')
    setBodyGoalImageMediaType('image/jpeg')
  }

  function handleBodyGoalFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!ok) {
      setGenError('Please use JPG, PNG, or WebP')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result
      if (typeof dataUrl !== 'string') return
      setBodyGoalPreviewUrl(dataUrl)
      const comma = dataUrl.indexOf(',')
      setBodyGoalImageBase64(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
      setBodyGoalImageMediaType(file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function fetchTrainerRecommendation(mealOnly) {
    if (!profile) return
    setRecommendLoading(true)
    setGenError(null)
    try {
      const res = await fetch('/api/recommend-trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          workoutPreferences: mealOnly ? {} : workoutPrefs,
          bodyGoalImage: bodyGoalImageBase64 || undefined,
          bodyGoalImageMediaType: bodyGoalImageBase64 ? bodyGoalImageMediaType : undefined,
          bodyGoalDescription: bodyGoalDescription?.trim() || undefined,
          mealOnlyContext: !!mealOnly,
        }),
      })
      const data = await res.json().catch(() => ({}))
      const rec = {
        trainerId: data.trainerId || 'bro',
        trainerName: data.trainerName,
        trainerEmoji: data.trainerEmoji,
        reasoning: data.reasoning,
        confidence: data.confidence,
        alternativeId: data.alternativeId,
        alternativeReason: data.alternativeReason,
      }
      setTrainerRecommendation(rec)
      setSelectedTrainerId(rec.trainerId)
      setPendingGenerateType(mealOnly ? 'meal' : 'workout')
      setView('trainer-recommend')
    } catch (err) {
      setGenError(err?.message || 'Could not analyze goals')
      const rec = {
        trainerId: 'bro',
        trainerName: 'The Gym Legends',
        trainerEmoji: '💪',
        reasoning: 'We matched you with The Gym Legends — a solid default while we finish setup.',
        confidence: 'medium',
        alternativeId: 'scientist',
        alternativeReason: 'For a more data-driven style.',
      }
      setTrainerRecommendation(rec)
      setSelectedTrainerId('bro')
      setPendingGenerateType(mealOnly ? 'meal' : 'workout')
      setView('trainer-recommend')
    } finally {
      setRecommendLoading(false)
    }
  }

  async function runGenerateWorkoutApi(trainerId) {
    if (!profile) return
    const workoutPreferences = {
      ...workoutPrefs,
      bodyGoalDescription: bodyGoalDescription?.trim() || undefined,
    }
    const res = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile.id,
        profile: { ...profile, trainer: trainerId },
        trainerId,
        onboardingContext: profile?.onboarding_context,
        type: 'workout',
        workoutPreferences,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      throw new Error(
        data.error || data.details || `Plan generation failed (${res.status}). Try again.`
      )
    }
    await Promise.all([loadPlans(profile.id), refreshProfile()])
    setView('overview')
    setWorkoutQuizStep(WORKOUT_QUIZ_BODY_STEP)
    clearBodyGoalUpload()
    setTrainerRecommendation(null)
    setPendingGenerateType(null)
    router.push('/dashboard')
  }

  async function runGenerateMealApi(trainerId) {
    if (!profile) return
    const mealPreferences = {
      ...mealPrefs,
      bodyGoalDescription: bodyGoalDescription?.trim() || undefined,
    }
    const res = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile.id,
        profile: { ...profile, trainer: trainerId },
        trainerId,
        onboardingContext: profile?.onboarding_context,
        type: 'meal',
        mealPreferences,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      throw new Error(
        data.error || data.details || `Meal plan generation failed (${res.status}). Try again.`
      )
    }
    await Promise.all([loadPlans(profile.id), refreshProfile()])
    setView('overview')
    setMealQuizStep(0)
    setTrainerRecommendation(null)
    setPendingGenerateType(null)
    router.push('/dashboard')
  }

  async function confirmTrainerAndGenerate() {
    if (!profile || !selectedTrainerId) return
    setGenerating(true)
    setGenError(null)
    try {
      await supabase.from('profiles').update({ trainer: selectedTrainerId }).eq('id', profile.id)
      await refreshProfile()
      const tid = selectedTrainerId
      if (pendingGenerateType === 'meal') {
        await runGenerateMealApi(tid)
      } else {
        await runGenerateWorkoutApi(tid)
      }
    } catch (err) {
      setGenError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function onWorkoutQuizGenerateClick() {
    if (!profile) return
    await fetchTrainerRecommendation(false)
  }

  async function onMealQuizGenerateClick() {
    if (!profile) return
    if (hasActiveWorkoutPlan(plans)) {
      setGenerating(true)
      setGenError(null)
      try {
        await runGenerateMealApi(profile.trainer || 'bro')
      } catch (err) {
        setGenError(err?.message || 'Failed to generate meal plan')
      } finally {
        setGenerating(false)
      }
      return
    }
    await fetchTrainerRecommendation(true)
  }

  if (loading || !profile) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#2D5B3F' }}>Loading plans...</div>
  }

  const trainer = getTrainer(profile.trainer)
  const activeWorkout = plans.find((p) => p.type === 'workout' && p.active)
  const activeMeal = plans.find((p) => p.type === 'meal' && p.active)

  const todayIdx = new Date().getDay()
  const todayStr = DAY_NAMES[todayIdx]
  const workoutDays = activeWorkout?.content?.days || []
  const split = activeWorkout?.content?.split || []
  let todayDayIndex = 0
  for (let i = 0; i < split.length; i++) {
    if (String(split[i]).startsWith(todayStr)) {
      todayDayIndex = i
      break
    }
  }
  const todayWorkout = workoutDays[todayDayIndex] || workoutDays[0]
  const todayExercises = todayWorkout?.exercises || activeWorkout?.content?.todayExercises || []
  const getCheckedCount = (exercises, dayIdx) =>
    exercises?.filter((_, exIdx) => checkedExercises[`${dayIdx}-${exIdx}`]).length || 0
  const todayChecked = getCheckedCount(todayExercises, todayDayIndex)
  const todayTotal = todayExercises.length
  const allComplete = todayTotal > 0 && todayChecked === todayTotal

  const optionBtn = (field, value, label, emoji, selected, onClick, multi) => (
    <motion.button
      key={value}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      style={{
        padding: '14px 16px',
        background: selected ? 'linear-gradient(135deg, rgba(110,231,183,0.12), rgba(16,185,129,0.06))' : 'rgba(14,20,14,0.55)',
        border: selected ? '2px solid rgba(110,231,183,0.3)' : '1px solid rgba(110,231,183,0.07)',
        borderRadius: 14,
        color: selected ? '#6EE7B7' : '#2D5B3F',
        fontSize: 14,
        fontWeight: 600,
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backdropFilter: 'blur(24px)',
      }}
    >
      {emoji && <span style={{ fontSize: 20 }}>{emoji}</span>}
      {label}
    </motion.button>
  )

  if (view === 'trainer-recommend' && trainerRecommendation) {
    const picked = getTrainer(selectedTrainerId)
    const others = trainersList.filter((t) => t.id !== selectedTrainerId)
    return (
      <div style={{ padding: '18px 20px 24px' }}>
        <button
          type="button"
          onClick={() => {
            setView(pendingGenerateType === 'meal' ? 'meal-quiz' : 'workout-quiz')
            if (pendingGenerateType !== 'meal') setWorkoutQuizStep(WORKOUT_QUIZ_STEP_COUNT - 1)
            else setMealQuizStep(MEAL_STEPS.length - 1)
          }}
          style={{ background: 'none', border: 'none', color: '#6EE7B7', fontSize: 14, fontWeight: 600, marginBottom: 16 }}
        >
          ← Back
        </button>
        <div className="glass" style={{ padding: 22, textAlign: 'center', border: '1px solid rgba(110,231,183,0.12)', borderTop: `3px solid ${picked.color}` }}>
          <div style={{ fontSize: 14, color: '#2D5B3F', marginBottom: 12 }}>Based on your goals, we recommend:</div>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>{picked.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: picked.color }}>{picked.name}</div>
          <div style={{ fontSize: 13, color: '#D1FAE5', marginTop: 6, marginBottom: 14 }}>{picked.style}</div>
          <p style={{ fontSize: 14, color: '#E2FBE8', lineHeight: 1.55, textAlign: 'left', marginBottom: 20 }}>
            {trainerRecommendation.reasoning}
          </p>
          {genError && <div style={{ color: '#FB7185', fontSize: 13, marginBottom: 12 }}>{genError}</div>}
          <button
            type="button"
            onClick={confirmTrainerAndGenerate}
            disabled={generating}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 15,
              fontWeight: 700,
              opacity: generating ? 0.65 : 1,
              marginBottom: 20,
            }}
          >
            {generating
              ? `${picked.emoji} ${pendingGenerateType === 'meal' ? 'Designing your nutrition' : 'Building your workout'}...`
              : `Train with ${picked.name}`}
          </button>
          <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 10 }}>Or choose a different coach:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {others.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTrainerId(t.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: selectedTrainerId === t.id ? `2px solid ${t.color}` : '1px solid rgba(110,231,183,0.15)',
                  background: selectedTrainerId === t.id ? `${t.color}22` : 'rgba(14,20,14,0.5)',
                  color: selectedTrainerId === t.id ? t.color : '#D1FAE5',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t.emoji} {t.name.split(' ').slice(-2).join(' ')}
              </button>
            ))}
          </div>
          {trainerRecommendation.alternativeReason && (
            <p style={{ fontSize: 11, color: '#1F4030', marginTop: 14, lineHeight: 1.45 }}>
              Also consider {getTrainer(trainerRecommendation.alternativeId || 'scientist').name}: {trainerRecommendation.alternativeReason}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (view === 'workout-quiz') {
    const steps = WORKOUT_STEPS
    const onBodyStep = workoutQuizStep === WORKOUT_QUIZ_BODY_STEP
    const stepIdx = workoutQuizStep - 1
    const step = !onBodyStep ? steps[stepIdx] : null
    const isLast = workoutQuizStep === WORKOUT_QUIZ_STEP_COUNT - 1
    const isFirst = workoutQuizStep === WORKOUT_QUIZ_BODY_STEP
    const canNext = onBodyStep
      ? true
      : step.textarea
        ? true
        : step.multi
          ? (workoutPrefs[step.id]?.length || 0) > 0
          : workoutPrefs[step.id] != null && workoutPrefs[step.id] !== ''

    if (recommendLoading) {
      return (
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ fontSize: 48, marginBottom: 16 }}>
            🎯
          </motion.div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#6EE7B7' }}>Analyzing your goals...</div>
          <div style={{ fontSize: 13, color: '#2D5B3F', marginTop: 8 }}>Finding your best AI coach match</div>
        </div>
      )
    }

    return (
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => (isFirst ? setView('overview') : setWorkoutQuizStep(workoutQuizStep - 1))}
            style={{ background: 'none', border: 'none', color: '#6EE7B7', fontSize: 14, fontWeight: 600 }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 8 }}>Workout Plan</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {Array.from({ length: WORKOUT_QUIZ_STEP_COUNT }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 100, background: 'rgba(110,231,183,0.08)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: i <= workoutQuizStep ? '100%' : 0 }}
                transition={{ duration: 0.3 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #6EE7B7)', borderRadius: 100 }}
              />
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {onBodyStep ? (
            <motion.div key="body-goal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                Upload a physique you&apos;d like to work toward
              </h2>
              <p style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 16, lineHeight: 1.5 }}>
                This helps us understand your aesthetic goals and match you with the right coaching style
              </p>
              <label
                style={{
                  display: 'block',
                  minHeight: 200,
                  borderRadius: 16,
                  border: '2px dashed rgba(110,231,183,0.25)',
                  background: 'rgba(14,20,14,0.45)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleBodyGoalFile} />
                {bodyGoalPreviewUrl ? (
                  <>
                    <img src={bodyGoalPreviewUrl} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        clearBodyGoalUpload()
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        padding: '6px 10px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      ✕ Remove
                    </button>
                  </>
                ) : (
                  <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontSize: 40 }}>📷</span>
                    <span style={{ fontSize: 14, color: '#6EE7B7', fontWeight: 600 }}>Tap to upload inspiration photo</span>
                    <span style={{ fontSize: 12, color: '#2D5B3F' }}>JPG, PNG, or WebP</span>
                  </div>
                )}
              </label>
              {bodyGoalPreviewUrl && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Describe what you like about this physique (optional)
                  </label>
                  <textarea
                    placeholder="e.g. Lean with visible abs, broad shoulders, athletic build"
                    value={bodyGoalDescription}
                    onChange={(e) => setBodyGoalDescription(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setWorkoutQuizStep(1)}
                style={{
                  marginTop: 16,
                  background: 'none',
                  border: 'none',
                  color: '#2D5B3F',
                  fontSize: 13,
                  fontWeight: 600,
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                Skip this step
              </button>
            </motion.div>
          ) : step.textarea ? (
            <motion.div key={step.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{step.q}</h2>
              <textarea
                placeholder="e.g. Bad left shoulder, lower back issues... Leave blank if none"
                value={workoutPrefs[step.id] || ''}
                onChange={(e) => updateWorkoutPref(step.id, e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => updateWorkoutPref(step.id, '')}
                  style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(110,231,183,0.2)', background: 'transparent', color: '#2D5B3F', fontSize: 13 }}
                >
                  No limitations
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={step.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{step.q}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {step.options.map((opt) => (
                  <div key={opt.value}>
                    {optionBtn(
                      step.id,
                      opt.value,
                      opt.label,
                      opt.emoji,
                      step.multi ? (workoutPrefs[step.id] || []).includes(opt.value) : workoutPrefs[step.id] === opt.value,
                      () => (step.multi ? toggleMulti(step.id, opt.value, true) : updateWorkoutPref(step.id, opt.value)),
                      step.multi
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isLast ? (
          <div style={{ marginTop: 24 }}>
            <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#6EE7B7', marginBottom: 8 }}>We&apos;ll match you with a coach, then build your program</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(workoutPrefs)
                  .filter(([k, v]) => v && (Array.isArray(v) ? v.length : true))
                  .map(([k, v]) => (
                    <span key={k} style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(110,231,183,0.15)', fontSize: 12, color: '#6EE7B7' }}>
                      {formatWorkoutPrefLabel(v)}
                    </span>
                  ))}
                {bodyGoalDescription?.trim() && (
                  <span style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(110,231,183,0.15)', fontSize: 12, color: '#6EE7B7' }}>
                    Goal image note
                  </span>
                )}
              </div>
            </div>
            {genError && <div style={{ color: '#FB7185', fontSize: 13, marginBottom: 12 }}>{genError}</div>}
            <button
              type="button"
              onClick={onWorkoutQuizGenerateClick}
              disabled={generating || recommendLoading}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 15,
                fontWeight: 700,
                opacity: generating || recommendLoading ? 0.6 : 1,
              }}
            >
              Generate My Workout Plan
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setWorkoutQuizStep(workoutQuizStep + 1)}
            disabled={!canNext}
            style={{
              width: '100%',
              marginTop: 24,
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: canNext ? 'linear-gradient(135deg, #10B981, #6EE7B7)' : 'rgba(110,231,183,0.2)',
              color: canNext ? '#070B07' : '#2D5B3F',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Continue →
          </button>
        )}
      </div>
    )
  }

  if (view === 'meal-quiz') {
    const steps = MEAL_STEPS
    const step = steps[mealQuizStep]
    const isLast = mealQuizStep === steps.length - 1
    const isFirst = mealQuizStep === 0
    const canNext = step.textarea
      ? true
      : step.multi
        ? (mealPrefs[step.id]?.length || 0) > 0
        : mealPrefs[step.id] != null && mealPrefs[step.id] !== ''

    if (recommendLoading) {
      return (
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ fontSize: 48, marginBottom: 16 }}>
            🎯
          </motion.div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#FB923C' }}>Analyzing your goals...</div>
          <div style={{ fontSize: 13, color: '#2D5B3F', marginTop: 8 }}>Finding your best AI coach match</div>
        </div>
      )
    }

    return (
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => isFirst ? setView('overview') : setMealQuizStep(mealQuizStep - 1)}
            style={{ background: 'none', border: 'none', color: '#6EE7B7', fontSize: 14, fontWeight: 600 }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 8 }}>Meal Plan</h1>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 100, background: 'rgba(249,115,22,0.15)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: i <= mealQuizStep ? '100%' : 0 }}
                transition={{ duration: 0.3 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #F97316, #EC4899)', borderRadius: 100 }}
              />
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {step.textarea ? (
            <motion.div key={step.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{step.q}</h2>
              <textarea
                placeholder="e.g. Lactose intolerant, hate broccoli... Leave blank if none"
                value={mealPrefs[step.id] || ''}
                onChange={(e) => updateMealPref(step.id, e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100, marginBottom: 12 }}
              />
              <button
                onClick={() => updateMealPref(step.id, '')}
                style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(249,115,22,0.3)', background: 'transparent', color: '#2D5B3F', fontSize: 13 }}
              >
                No allergies
              </button>
            </motion.div>
          ) : (
            <motion.div key={step.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{step.q}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {step.options.map((opt) => (
                  <div key={opt.value}>
                    {optionBtn(
                      step.id,
                      opt.value,
                      opt.label,
                      opt.emoji,
                      step.multi ? (mealPrefs[step.id] || []).includes(opt.value) : mealPrefs[step.id] === opt.value,
                      () => (step.multi ? toggleMulti(step.id, opt.value, false) : updateMealPref(step.id, opt.value)),
                      step.multi
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isLast ? (
          <div style={{ marginTop: 24 }}>
            <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#F97316', marginBottom: 8 }}>
                {hasActiveWorkoutPlan(plans)
                  ? `${trainer.name} will design your nutrition`
                  : 'We may match a coach first, then design your nutrition'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(mealPrefs).filter(([k, v]) => v && (Array.isArray(v) ? v.length : true)).map(([k, v]) => (
                  <span key={k} style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(249,115,22,0.15)', fontSize: 12, color: '#FB923C' }}>
                    {Array.isArray(v) ? v.join(', ') : v}
                  </span>
                ))}
              </div>
            </div>
            {genError && <div style={{ color: '#FB7185', fontSize: 13, marginBottom: 12 }}>{genError}</div>}
            <button
              type="button"
              onClick={onMealQuizGenerateClick}
              disabled={generating || recommendLoading}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EC4899)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                opacity: generating || recommendLoading ? 0.6 : 1,
              }}
            >
              {generating ? `${trainer.emoji} Designing your nutrition...` : 'Generate My Meal Plan'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setMealQuizStep(mealQuizStep + 1)}
            disabled={!canNext}
            style={{
              width: '100%',
              marginTop: 24,
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: canNext ? 'linear-gradient(135deg, #F97316, #EC4899)' : 'rgba(249,115,22,0.2)',
              color: canNext ? '#fff' : '#2D5B3F',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Continue →
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
        </h1>
        <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>Your plans</p>
      </div>

      {activeWorkout ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: '#6EE7B7', fontWeight: 600 }}>Workout</span>
            <button
              type="button"
              onClick={() => {
                setWorkoutQuizStep(WORKOUT_QUIZ_BODY_STEP)
                setView('workout-quiz')
              }}
              style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(110,231,183,0.3)', background: 'transparent', color: '#6EE7B7', fontSize: 12, fontWeight: 600 }}
            >
              Regenerate Workout
            </button>
          </div>
          <div className="glass" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(110,231,183,0.07)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #6EE7B7)' }} />
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                {activeWorkout.content?.name || "Workout Plan"}
              </div>
              <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 16 }}>
                {activeWorkout.content?.daysPerWeek || 4} days/week
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['today', 'week'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setSubView(v)}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: subView === v ? '2px solid rgba(110,231,183,0.4)' : '1px solid rgba(110,231,183,0.1)',
                      background: subView === v ? 'rgba(110,231,183,0.1)' : 'transparent',
                      color: subView === v ? '#6EE7B7' : '#2D5B3F',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {v === 'today' ? 'Today' : 'Full Week'}
                  </button>
                ))}
              </div>
              {subView === 'today' ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#D1FAE5', marginBottom: 8 }}>{todayWorkout?.name || activeWorkout.content?.todayName}</div>
                  <div style={{ height: 6, borderRadius: 100, background: 'rgba(110,231,183,0.15)', marginBottom: 12, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', width: `${(todayChecked / Math.max(todayTotal, 1)) * 100}%`, background: 'linear-gradient(90deg, #10B981, #6EE7B7)', borderRadius: 100 }} transition={{ duration: 0.3 }} />
                  </div>
                  {allComplete && <div style={{ padding: 12, background: 'rgba(110,231,183,0.1)', borderRadius: 12, textAlign: 'center', marginBottom: 12, color: '#6EE7B7' }}>🎉 Workout Complete!</div>}
                  {todayExercises.map((ex, i) => (
                    <ExerciseRow key={i} name={ex.name} sets={ex.sets} rest={ex.rest || '60s'} showCheckbox onToggle={() => toggleExercise(todayDayIndex, i)} isChecked={checkedExercises[`${todayDayIndex}-${i}`]} isLast={i >= todayExercises.length - 1} />
                  ))}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workoutDays.map((day, dayIdx) => {
                    const isExpanded = expandedDay === dayIdx
                    const exs = day.exercises || []
                    const checked = getCheckedCount(exs, dayIdx)
                    const total = exs.length
                    return (
                      <div key={dayIdx} className="glass-sm" style={{ padding: 0 }}>
                        <button onClick={() => setExpandedDay(isExpanded ? null : dayIdx)} style={{ width: '100%', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{day.name}</div>
                            <div style={{ fontSize: 11, color: '#2D5B3F' }}>{exs.length} exercises {checked === total && total > 0 && '✓'}</div>
                          </div>
                          <span style={{ color: '#6EE7B7' }}>{isExpanded ? '−' : '+'}</span>
                        </button>
                        {isExpanded && (
                          <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(110,231,183,0.06)' }}>
                            <WorkoutMuscleMap exerciseNames={exs.map((e) => e.name)} view="both" size="small" />
                            {exs.map((ex, exIdx) => (
                              <ExerciseRow key={exIdx} name={ex.name} sets={ex.sets} rest={ex.rest || '60s'} showCheckbox onToggle={() => toggleExercise(dayIdx, exIdx)} isChecked={checkedExercises[`${dayIdx}-${exIdx}`]} isLast={exIdx >= exs.length - 1} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass" style={{ padding: 24, marginBottom: 20, textAlign: 'center', border: '1px dashed rgba(110,231,183,0.2)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏋️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Create Your Workout Plan</div>
          <div style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 16 }}>Answer a few questions and your AI trainer will build a personalized program</div>
          <button
            onClick={() => {
              setWorkoutQuizStep(WORKOUT_QUIZ_BODY_STEP)
              setView('workout-quiz')
            }}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Start Workout Quiz →
          </button>
        </div>
      )}

      {activeMeal ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: '#F97316', fontWeight: 600 }}>Meal Plan</span>
            <button
              onClick={() => setView('meal-quiz')}
              style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(249,115,22,0.3)', background: 'transparent', color: '#FB923C', fontSize: 12, fontWeight: 600 }}
            >
              Regenerate Meal Plan
            </button>
          </div>
          <div className="glass" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(249,115,22,0.1)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #F97316, #FBBF24)' }} />
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>🥗 {activeMeal.content?.name || 'Meal Plan'}</div>
              <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 12 }}>{activeMeal.content?.dailyCalories} · {activeMeal.content?.protein} protein</div>
              {activeMeal.content?.meals?.map((meal, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(110,231,183,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{MEAL_EMOJIS[i] || '🍽️'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{meal.name}</div>
                      <div style={{ fontSize: 11, color: '#1F4030' }}>{meal.description}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{meal.calories} cal</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass" style={{ padding: 24, textAlign: 'center', border: '1px dashed rgba(249,115,22,0.2)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🥗</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Create Your Meal Plan</div>
          <div style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 16 }}>Tell us about your preferences and your trainer will design your nutrition</div>
          <button
            onClick={() => setView('meal-quiz')}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #F97316, #EC4899)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Start Nutrition Quiz →
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 14,
          border: '1px solid rgba(249,115,22,0.2)',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(236,72,153,0.05))',
          color: '#FB923C',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Back to Dashboard
      </button>
    </div>
  )
}
