'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { trainers as trainersList, getTrainer } from '../../lib/trainers'
import { useAuth } from '../components/AuthProvider'
import ProgressChart from '../components/ProgressChart'
import WeightModal from '../components/WeightModal'
import TrainerModal from '../components/TrainerModal'
import ExerciseRow from '../components/ExerciseRow'
import WorkoutMuscleMap from '../components/WorkoutMuscleMap'
import FoodLogModal from '../components/FoodLogModal'

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { text: `Good morning, ${name}`, emoji: '💪' }
  if (h >= 12 && h < 17) return { text: `Afternoon grind, ${name}`, emoji: '🔥' }
  if (h >= 17 && h < 21) return { text: `Evening session, ${name}`, emoji: '⚡' }
  return { text: `Rest up, ${name}`, emoji: '🌙' }
}

export default function Dashboard() {
  const router = useRouter()
  const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth()
  const [plans, setPlans] = useState({ workout: null, meal: null })
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [trainerModalOpen, setTrainerModalOpen] = useState(false)
  const [foodLogModalOpen, setFoodLogModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [todayMeals, setTodayMeals] = useState([])

  const profile = authProfile
  const trainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    if (user && !authProfile) {
      router.push('/onboarding')
      return
    }
  }, [user, authProfile, router])

  useEffect(() => {
    if (!profile?.id) return
    loadPlansAndWeightLogs()
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/meal-log?profileId=${profile.id}&date=${today}`)
      .then((r) => r.json())
      .then((data) => setTodayMeals(data.meals || []))
      .catch(() => setTodayMeals([]))
  }, [profile?.id])

  async function loadPlansAndWeightLogs() {
    if (!profile) return
    const profileId = profile.id

    const { data: plansData } = await supabase
      .from('plans')
      .select('*')
      .eq('profile_id', profileId)
      .eq('active', true)

    if (plansData) {
      const workout = plansData.find((p) => p.type === 'workout')
      const meal = plansData.find((p) => p.type === 'meal')
      setPlans({ workout, meal })
    }

    const { data: logs } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
      .limit(60)

    const built = []
    const startDate = profile?.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    if (!logs || logs.length === 0) {
      built.push({ date: new Date().toISOString().split('T')[0], weight_kg: profile.weight_kg })
    } else {
      const hasStart = logs.some((l) => ((l.logged_at || l.created_at || '') + '').split('T')[0] === startDate)
      if (!hasStart && profile.created_at) {
        built.push({ date: startDate, weight_kg: profile.weight_kg })
      }
      logs.forEach((l) => {
        const raw = l.logged_at || l.created_at || new Date().toISOString()
        const d = (typeof raw === 'string' ? raw : new Date(raw).toISOString()).split('T')[0]
        built.push({ date: d, weight_kg: l.weight_kg })
      })
      built.sort((a, b) => a.date.localeCompare(b.date))
    }
    setWeightLogs(built)

    setLoading(false)
  }

  async function generatePlans() {
    if (!profile) return
    setGenerating(true)
    try {
      let onboardingContext = profile?.onboarding_context || null
      if (!onboardingContext) {
        const storedOnboarding = localStorage.getItem('onboardingContext')
        if (storedOnboarding) {
          try {
            onboardingContext = JSON.parse(storedOnboarding)
          } catch {
            onboardingContext = null
          }
        }
      }

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          profile: profile,
          trainerId: profile.trainer,
          onboardingContext,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshProfile()
        await loadPlansAndWeightLogs()
      }
    } catch (err) {
      console.error('Error generating plans:', err)
    } finally {
      setGenerating(false)
    }
  }

  async function handleLogWeight(weightKg) {
    if (!profile) return
    await supabase.from('weight_logs').insert({
      profile_id: profile.id,
      weight_kg: weightKg,
    })
    await supabase.from('profiles').update({ weight_kg: weightKg }).eq('id', profile.id)
    await refreshProfile()
    setWeightLogs((prev) => {
      const today = new Date().toISOString().split('T')[0]
      const idx = prev.findIndex((d) => d.date === today)
      let next
      if (idx >= 0) {
        next = [...prev]
        next[idx] = { ...next[idx], weight_kg: weightKg }
      } else {
        next = [...prev, { date: today, weight_kg: weightKg }]
      }
      return next.sort((a, b) => a.date.localeCompare(b.date))
    })
  }

  async function handleMealLogged() {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/meal-log?profileId=${profile.id}&date=${today}`)
    const data = await res.json()
    setTodayMeals(data.meals || [])
    setToast('Meal logged!')
    setTimeout(() => setToast(null), 2000)
  }

  async function handleSelectTrainer(t) {
    if (!profile) return
    await supabase.from('profiles').update({ trainer: t.id }).eq('id', profile.id)
    await refreshProfile()
    setToast(`Switched to ${t.name}`)
    setTimeout(() => setToast(null), 2000)
  }

  if (authLoading || loading || !profile) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#2D5B3F' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 32, marginBottom: 12 }}>🏋️</motion.div>
        Loading your dashboard...
      </div>
    )
  }

  const workoutContent = plans.workout?.content || null
  const mealContent = plans.meal?.content || null
  const greeting = getGreeting(profile.name?.split(' ')[0] || 'there')
  const startWeight = weightLogs[0]?.weight_kg ?? profile.weight_kg
  const currentWeight = profile.weight_kg
  const weightDiff = currentWeight - startWeight
  const progressDir = profile.goal === 'lose_fat' ? (weightDiff < 0 ? 'good' : 'bad') : profile.goal === 'build_muscle' ? (weightDiff > 0 ? 'good' : 'bad') : 'neutral'

  const cardDelays = [0, 100, 200, 300, 400, 500, 600]

  return (
    <div style={{ padding: '18px 20px 0' }}>
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            background: 'rgba(14,20,14,0.95)',
            border: '1px solid rgba(110,231,183,0.3)',
            borderRadius: 12,
            color: '#6EE7B7',
            fontSize: 14,
            fontWeight: 600,
            zIndex: 50,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {toast}
        </motion.div>
      )}

      {/* A. Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[0] }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.8 }}>
            <span style={{ color: '#6EE7B7' }}>Fit</span>
            <span style={{ color: '#fff' }}>Coach</span>
            <span className="gradient-accent" style={{ fontSize: 12, fontWeight: 600, marginLeft: 6 }}>AI</span>
          </h1>
          <p style={{ fontSize: 14, color: '#D1FAE5', fontWeight: 500, marginTop: 4 }}>
            {greeting.text} {greeting.emoji}
          </p>
        </div>
        <button
          onClick={() => setTrainerModalOpen(true)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'rgba(14,20,14,0.55)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(110,231,183,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          {trainer.emoji}
        </button>
      </motion.div>

      {/* B. Streak & Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[1] }}
        className="glass"
        style={{ padding: 18, marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}
      >
        <div style={{ borderTop: '2px solid #F97316', paddingTop: 8, borderRadius: 4 }}>
          <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>🔥 STREAK</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Day 1</div>
        </div>
        <div style={{ borderTop: '2px solid #6EE7B7', paddingTop: 8, borderRadius: 4 }}>
          <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>⚡ THIS WEEK</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>0/4</div>
        </div>
        <div style={{ borderTop: '2px solid #93C5FD', paddingTop: 8, borderRadius: 4 }}>
          <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>📊 PROGRESS</div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: progressDir === 'good' ? '#6EE7B7' : progressDir === 'bad' ? '#FB7185' : '#93C5FD',
          }}>
            {weightDiff >= 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
          </div>
        </div>
      </motion.div>

      {/* C. Muscle Coverage (weekly) */}
      {workoutContent?.days?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelays[2] }}
          className="glass"
          style={{ padding: 18, marginBottom: 14 }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Muscle Coverage</div>
          <div style={{ fontSize: 11, color: '#2D5B3F', marginBottom: 12 }}>This week</div>
          <WorkoutMuscleMap
            exerciseNames={(workoutContent.days || []).flatMap((d) => (d.exercises || []).map((e) => e.name))}
            view="both"
            size="medium"
          />
        </motion.div>
      )}

      {/* D. Progress Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[2] }}
        className="glass"
        style={{ padding: 18, marginBottom: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Weight Progress</div>
          <button
            onClick={() => setWeightModalOpen(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 10,
              border: '1px solid rgba(110,231,183,0.2)',
              background: 'rgba(110,231,183,0.08)',
              color: '#6EE7B7',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Log Weight
          </button>
        </div>
        <ProgressChart data={weightLogs} targetWeight={profile.target_weight} height={160} />
      </motion.div>

      {/* E. Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[3] }}
      >
        {workoutContent && workoutContent.todayExercises ? (
          <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #F97316, #EC4899)' }} />
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(110,231,183,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  Today&apos;s Workout
                </div>
                <div style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 600, marginTop: 4 }}>
                  {workoutContent.todayName || new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <WorkoutMuscleMap
                  exerciseNames={workoutContent.todayExercises?.map((e) => e.name) || []}
                  view="both"
                  size="small"
                />
              </div>
            </div>
            <div style={{ padding: '12px 20px 18px' }}>
              {workoutContent.todayExercises.slice(0, 5).map((ex, i) => (
                <ExerciseRow
                  key={i}
                  name={ex.name}
                  sets={ex.sets}
                  rest={ex.rest}
                  index={i + 1}
                  isLast={i >= Math.min(5, workoutContent.todayExercises.length) - 1}
                />
              ))}
              <button
                onClick={() => router.push('/plans')}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                  color: '#070B07',
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                }}
              >
                Start Workout →
              </button>
            </div>
          </div>
        ) : (
          <div className="glass" style={{ padding: 24, marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Your trainer is ready</div>
            <div style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 16 }}>Generate your custom workout and meal plan</div>
            <button
              onClick={generatePlans}
              disabled={generating}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EC4899)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(249,115,22,0.25)',
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? 'Generating...' : 'Generate My Plan'}
            </button>
          </div>
        )}
      </motion.div>

      {/* F. Macros Card */}
      {mealContent && (() => {
        const parseTarget = (v) => parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0
        const targetCal = parseTarget(mealContent.dailyCalories) || 2000
        const targetP = parseTarget(mealContent.protein) || 150
        const targetC = parseTarget(mealContent.carbs) || 200
        const targetF = parseTarget(mealContent.fats) || 65
        const actual = todayMeals.reduce(
          (a, m) => ({
            cal: a.cal + (parseFloat(m.total_calories) || 0),
            p: a.p + (parseFloat(m.total_protein) || 0),
            c: a.c + (parseFloat(m.total_carbs) || 0),
            f: a.f + (parseFloat(m.total_fats) || 0),
          }),
          { cal: 0, p: 0, c: 0, f: 0 }
        )
        const macros = [
          { label: 'Calories', actual: Math.round(actual.cal), target: targetCal, color: '#6EE7B7' },
          { label: 'Protein', actual: actual.p.toFixed(1), target: targetP, color: '#FBBF24' },
          { label: 'Carbs', actual: actual.c.toFixed(1), target: targetC, color: '#93C5FD' },
          { label: 'Fats', actual: actual.f.toFixed(1), target: targetF, color: '#FB7185' },
        ]
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: cardDelays[4] }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}
          >
            {macros.map((m, i) => {
              const pct = Math.min(1, m.actual / Math.max(m.target, 1))
              return (
                <div key={i} className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: 2, background: m.color, opacity: 0.5 }} />
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={18} cy={18} r={14} fill="none" stroke="rgba(110,231,183,0.1)" strokeWidth={4} />
                      <circle cx={18} cy={18} r={14} fill="none" stroke={m.color} strokeWidth={4} strokeDasharray={`${pct * 88} 88`} strokeLinecap="round" />
                    </svg>
                    <div>
                      <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.actual}/{m.target}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )
      })()}

      {/* G. Nutrition Summary */}
      {mealContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelays[5] }}
          className="glass"
          style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(110,231,183,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nutrition</div>
            <button
              onClick={() => setFoodLogModalOpen(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid rgba(110,231,183,0.3)',
                background: 'rgba(16,185,129,0.2)',
                color: '#6EE7B7',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              🍽️ Log Meal
            </button>
          </div>
          <div style={{ padding: '4px 18px 14px' }}>
            {mealContent.meals && ['🍳', '🥗', '🍌', '🥩'].map((emoji, i) => {
              const m = mealContent.meals[i]
              if (!m) return null
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < mealContent.meals.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: '#1F4030' }}>{m.description}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{m.calories} cal</div>
                    <div className="gradient-accent" style={{ fontSize: 10, fontWeight: 600 }}>{m.protein}g protein</div>
                  </div>
                </div>
              )
            })}
            {todayMeals.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6EE7B7', marginTop: 12, marginBottom: 8 }}>Meals Logged Today</div>
                {todayMeals.map((meal, i) => (
                  <div key={meal.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(110,231,183,0.04)', fontSize: 12 }}>
                    <span style={{ color: '#D1FAE5' }}>{meal.meal_name} · {new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    <span style={{ color: '#6EE7B7', fontWeight: 600 }}>{Math.round(parseFloat(meal.total_calories) || 0)} cal · {parseFloat(meal.total_protein || 0).toFixed(1)}g P</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* H. Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[6] }}
        style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}
      >
        <button
          onClick={() => router.push('/chat')}
          className="glass-sm"
          style={{ flex: 1, minWidth: 100, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>💬</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Ask {trainer.name.split(' ').pop()}</div>
        </button>
        <button
          onClick={() => setFoodLogModalOpen(true)}
          className="glass-sm"
          style={{ flex: 1, minWidth: 100, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>🍽️</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Log Meal</div>
        </button>
        <button
          onClick={() => router.push('/chat?prompt=body')}
          className="glass-sm"
          style={{ flex: 1, minWidth: 100, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Body Check</div>
        </button>
        <button
          onClick={() => setWeightModalOpen(true)}
          className="glass-sm"
          style={{ flex: 1, minWidth: 100, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>⚖️</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Log Weight</div>
        </button>
      </motion.div>

      <WeightModal
        open={weightModalOpen}
        onClose={() => setWeightModalOpen(false)}
        profile={profile}
        onSave={handleLogWeight}
      />
      <TrainerModal
        open={trainerModalOpen}
        onClose={() => setTrainerModalOpen(false)}
        profile={profile}
        currentTrainer={trainer}
        onSelect={handleSelectTrainer}
      />
      <FoodLogModal
        open={foodLogModalOpen}
        onClose={() => setFoodLogModalOpen(false)}
        profileId={profile?.id}
        onLog={handleMealLogged}
      />
    </div>
  )
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
