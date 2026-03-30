'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getTrainer } from '../../lib/trainers'
import { useAuth } from '../components/AuthProvider'
import BrandedAuthLoading from '../components/BrandedAuthLoading'
import { useProfileResolutionTimeout } from '../hooks/useProfileResolutionTimeout'
import ProgressChart from '../components/ProgressChart'
import WeightModal from '../components/WeightModal'
import TrainerModal from '../components/TrainerModal'
import ExerciseRow from '../components/ExerciseRow'
import WorkoutMuscleMap from '../components/WorkoutMuscleMap'
import FoodLogModal from '../components/FoodLogModal'
import LogWorkoutModal from '../components/LogWorkoutModal'
import BodyImageSlot from '../components/BodyImageSlot'
import ProgressTimeline from '../components/ProgressTimeline'
import PhotoUploadModal from '../components/PhotoUploadModal'
import CompareModal from '../components/CompareModal'
import { BodyFatLineChart } from '../components/ProgressCharts'

async function jsonHeadersWithAuth() {
  const headers = {}
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { text: `Good morning, ${name}`, emoji: '💪' }
  if (h >= 12 && h < 17) return { text: `Afternoon grind, ${name}`, emoji: '🔥' }
  if (h >= 17 && h < 21) return { text: `Evening session, ${name}`, emoji: '⚡' }
  return { text: `Rest up, ${name}`, emoji: '🌙' }
}

/** True only when we have a real generated plan (not just a stale/empty row). */
function hasUsableWorkoutPlan(workoutPlanRow) {
  const c = workoutPlanRow?.content
  if (!c || typeof c !== 'object') return false
  if (Array.isArray(c.days) && c.days.length > 0) return true
  if (Array.isArray(c.todayExercises) && c.todayExercises.length > 0) return true
  if (typeof c.name === 'string' && c.name.trim().length > 0) return true
  return false
}

export default function Dashboard() {
  const router = useRouter()
  const { user, profile: authProfile, loading: authLoading, profileLoading, refreshProfile } = useAuth()
  const profileResolutionTimedOut = useProfileResolutionTimeout(user, authProfile, 3000)
  const [plans, setPlans] = useState({ workout: null, meal: null })
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [trainerModalOpen, setTrainerModalOpen] = useState(false)
  const [foodLogModalOpen, setFoodLogModalOpen] = useState(false)
  const [workoutLogModalOpen, setWorkoutLogModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [todayMeals, setTodayMeals] = useState([])
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [chartHeight, setChartHeight] = useState(160)
  const [progressPhotos, setProgressPhotos] = useState([])
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [programAdjustText, setProgramAdjustText] = useState('')
  const [adjustScope, setAdjustScope] = useState('both')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [adjustError, setAdjustError] = useState(null)

  const profile = authProfile
  const trainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    if (user && !authProfile && !profileLoading && !authLoading) {
      router.push('/onboarding')
      return
    }
  }, [user, authProfile, profileLoading, authLoading, router])

  const missingProfileId = Boolean(profile) && !profile?.id

  useEffect(() => {
    if (profile?.id) {
      loadPlansAndWeightLogs()
      return
    }
    if (user && !profileLoading && missingProfileId) {
      setLoading(false)
    }
  }, [user, profile?.id, profileLoading, missingProfileId])

  useEffect(() => {
    if (!profile?.id) return
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/meal-log?profileId=${profile.id}&date=${today}`)
      .then((r) => r.json())
      .then((data) => setTodayMeals(data.meals || []))
      .catch(() => setTodayMeals([]))
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    fetch(`/api/workout-log?profileId=${profile.id}&limit=10`)
      .then((r) => r.json())
      .then((data) => setRecentWorkouts(data.workouts || []))
      .catch(() => setRecentWorkouts([]))
  }, [profile?.id])

  async function loadProgressPhotos() {
    if (!profile?.id) return
    try {
      const r = await fetch(`/api/progress-photo?profileId=${profile.id}`, {
        headers: await jsonHeadersWithAuth(),
      })
      const d = await r.json().catch(() => ({}))
      setProgressPhotos(d.photos || [])
    } catch {
      setProgressPhotos([])
    }
  }

  useEffect(() => {
    loadProgressPhotos()
  }, [profile?.id])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setChartHeight(mq.matches ? 250 : 160)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  function buildWeightLogsFromProfile(profileRow, logs) {
    const built = []
    const startDate = profileRow?.created_at
      ? new Date(profileRow.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    if (!logs || logs.length === 0) {
      built.push({ date: new Date().toISOString().split('T')[0], weight_kg: profileRow.weight_kg })
    } else {
      const hasStart = logs.some((l) => ((l.logged_at || l.created_at || '') + '').split('T')[0] === startDate)
      if (!hasStart && profileRow.created_at) {
        built.push({ date: startDate, weight_kg: profileRow.weight_kg })
      }
      logs.forEach((l) => {
        const raw = l.logged_at || l.created_at || new Date().toISOString()
        const d = (typeof raw === 'string' ? raw : new Date(raw).toISOString()).split('T')[0]
        built.push({ date: d, weight_kg: l.weight_kg })
      })
      built.sort((a, b) => a.date.localeCompare(b.date))
    }
    return built
  }

  async function loadPlansAndWeightLogs(options = { showLoading: true }) {
    const showLoading = options?.showLoading !== false
    if (!profile?.id) {
      setLoading(false)
      return
    }
    const profileId = profile.id
    const profileRow = profile

    if (showLoading) setLoading(true)

    try {
      if (!supabase) {
        setPlans({ workout: null, meal: null })
        setWeightLogs(buildWeightLogsFromProfile(profileRow, null))
        return
      }

      const TIMEOUT_MS = 3000
      const queries = Promise.all([
        supabase
          .from('plans')
          .select('*')
          .eq('profile_id', profileId)
          .eq('active', true),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: true })
          .limit(60),
      ])
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Dashboard data load timed out')), TIMEOUT_MS)
      )

      const [plansResult, logsResult] = await Promise.race([queries, timeout])

      const plansData = plansResult?.data
      const logs = logsResult?.data

      if (plansData) {
        const workout = plansData.find((p) => p.type === 'workout')
        const meal = plansData.find((p) => p.type === 'meal')
        setPlans({ workout, meal })
      } else {
        setPlans({ workout: null, meal: null })
      }

      setWeightLogs(buildWeightLogsFromProfile(profileRow, logs))
    } catch (err) {
      console.error('Dashboard plans/weight load failed:', err)
      setPlans({ workout: null, meal: null })
      setWeightLogs(buildWeightLogsFromProfile(profileRow, null))
    } finally {
      setLoading(false)
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

  async function handleAnalyze() {
    if (!profile?.id) return
    setAnalysisLoading(true)
    setAnalysisResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysisResult(data.summary || data.recommendation)
    } catch (err) {
      setAnalysisResult(`Error: ${err?.message || 'Analysis failed'}`)
    } finally {
      setAnalysisLoading(false)
    }
  }

  async function handleWorkoutLogged() {
    const res = await fetch(`/api/workout-log?profileId=${profile.id}&limit=10`)
    const data = await res.json()
    setRecentWorkouts(data.workouts || [])
    setToast('Workout logged!')
    setTimeout(() => setToast(null), 2000)
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

  async function handleRegenerateWithAdjustments() {
    if (!profile?.id) return
    const text = programAdjustText.trim()
    if (!text) {
      setAdjustError('Describe what you want to change first.')
      return
    }
    setAdjustLoading(true)
    setAdjustError(null)
    try {
      const workoutPreferences = { ...(profile.preferences?.workout || {}) }
      const mealPreferences = { ...(profile.preferences?.meal || {}) }
      const tid = profile.trainer || 'bro'
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await jsonHeadersWithAuth()),
        },
        body: JSON.stringify({
          profileId: profile.id,
          profile: { ...profile, trainer: tid },
          trainerId: tid,
          onboardingContext: profile?.onboarding_context,
          type: adjustScope,
          workoutPreferences,
          mealPreferences,
          programAdjustments: text,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || `Could not update your program (${res.status}).`)
      }
      await Promise.all([loadPlansAndWeightLogs({ showLoading: false }), refreshProfile()])
      setProgramAdjustText('')
      setToast('Program updated from your notes')
      setTimeout(() => setToast(null), 2500)
    } catch (err) {
      setAdjustError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setAdjustLoading(false)
    }
  }

  const showProfileStuckError =
    user &&
    !authProfile &&
    profileResolutionTimedOut &&
    (profileLoading || authLoading)

  const showDashboardLoading =
    !showProfileStuckError &&
    (authLoading || (!profile?.id && profileLoading) || !profile)

  if (showProfileStuckError) {
    return (
      <div className="dashboard-app-container" style={{ paddingTop: 48, paddingBottom: 32, textAlign: 'center' }}>
        <p style={{ color: '#FB7185', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Couldn&apos;t load your profile</p>
        <p style={{ color: '#2D5B3F', fontSize: 14, maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.5 }}>
          Check your connection or Supabase status, then try again.
        </p>
        <button
          type="button"
          onClick={() => refreshProfile()}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.35)',
            background: 'rgba(16,185,129,0.2)',
            color: '#6EE7B7',
            fontWeight: 600,
            marginRight: 12,
          }}
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.15)',
            background: 'transparent',
            color: '#A7C4B8',
            fontWeight: 600,
          }}
        >
          Home
        </button>
      </div>
    )
  }

  if (showDashboardLoading) {
    return <BrandedAuthLoading minHeight="70vh" />
  }

  const hasAnyPlan = !!(plans.workout || plans.meal)
  const greeting = getGreeting(profile.name?.split(' ')[0] || 'there')
  const cardDelaysPre = [0, 100, 200, 300, 400, 500, 600, 700]
  const skeletonPulse = {
    animation: 'pulse 1.2s ease-in-out infinite',
    borderRadius: 12,
    background: 'rgba(110,231,183,0.12)',
  }

  if (loading && profile?.id) {
    const skTrainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')
    return (
      <div className="dashboard-app-container" style={{ paddingTop: 18, paddingBottom: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelaysPre[0] }}
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
            <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: '#6B8F7A' }}>
              Loading your plan and stats…
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
            <button
              type="button"
              aria-label="Add progress photo"
              onClick={() => setPhotoModalOpen(true)}
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
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              📷
            </button>
            <button
              type="button"
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
                cursor: 'pointer',
              }}
            >
              {skTrainer.emoji}
            </button>
          </div>
        </motion.div>

        <div className="card-grid" style={{ marginBottom: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass" style={{ padding: 18, borderTop: '3px solid rgba(110,231,183,0.15)' }}>
              <div style={{ ...skeletonPulse, height: 10, width: '40%', marginBottom: 12 }} />
              <div style={{ ...skeletonPulse, height: 22, width: '55%' }} />
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              borderBottom: '1px solid rgba(110,231,183,0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Progress photos</div>
              <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 4, lineHeight: 1.4 }}>
                Add new check-in photos whenever you want — same angles help comparisons.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 100,
                background: 'rgba(110,231,183,0.1)',
                border: '1px solid rgba(110,231,183,0.15)',
                color: '#6EE7B7',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              + Add photo
            </button>
          </div>
          <ProgressTimeline
            photos={progressPhotos}
            onAdd={() => setPhotoModalOpen(true)}
            onSelectPhoto={() => {
              if (progressPhotos.length >= 2) setCompareOpen(true)
            }}
          />
          {progressPhotos.length >= 2 && (
            <div style={{ padding: '0 18px 16px' }}>
              <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 8 }}>Body fat trend (estimated)</div>
              <BodyFatLineChart photos={progressPhotos} height={140} />
            </div>
          )}
        </div>

        <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ ...skeletonPulse, height: 14, width: '70%', marginBottom: 14 }} />
          <div style={{ ...skeletonPulse, height: 10, width: '100%', marginBottom: 10 }} />
          <div style={{ ...skeletonPulse, height: 10, width: '90%', marginBottom: 10 }} />
          <div style={{ ...skeletonPulse, height: 10, width: '85%' }} />
        </div>

        <PhotoUploadModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          profile={profile}
          onSaved={loadProgressPhotos}
        />
        <CompareModal
          isOpen={compareOpen}
          onClose={() => setCompareOpen(false)}
          photos={progressPhotos}
          profile={profile}
        />
        <TrainerModal
          open={trainerModalOpen}
          onClose={() => setTrainerModalOpen(false)}
          profile={profile}
          currentTrainer={skTrainer}
          onSelect={handleSelectTrainer}
        />
      </div>
    )
  }

  if (!hasAnyPlan) {
    const headerPhotoBtnStyle = {
      width: 48,
      height: 48,
      borderRadius: 16,
      background: 'rgba(14,20,14,0.55)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(110,231,183,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      flexShrink: 0,
      cursor: 'pointer',
    }
    return (
      <div className="dashboard-app-container" style={{ paddingTop: 24, paddingBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
              <span style={{ color: '#6EE7B7' }}>Fit</span>
              <span style={{ color: '#fff' }}>Coach</span>
              <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
            </h1>
            <p style={{ fontSize: 13, color: '#A7C4B8', fontWeight: 500, marginTop: 6 }}>
              {greeting.text} {greeting.emoji}
            </p>
          </div>
          <button
            type="button"
            aria-label="Add progress photo"
            onClick={() => setPhotoModalOpen(true)}
            style={headerPhotoBtnStyle}
          >
            📷
          </button>
        </div>

        <div
          className="glass"
          style={{ padding: 0, marginBottom: 24, overflow: 'hidden', border: '1px solid rgba(110,231,183,0.12)' }}
        >
          <div
            style={{
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              borderBottom: '1px solid rgba(110,231,183,0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Progress photos</div>
              <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 4, lineHeight: 1.4 }}>
                Add new check-in photos whenever you want — same angles help comparisons.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 100,
                background: 'rgba(110,231,183,0.1)',
                border: '1px solid rgba(110,231,183,0.15)',
                color: '#6EE7B7',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              + Add photo
            </button>
          </div>
          <ProgressTimeline
            photos={progressPhotos}
            onAdd={() => setPhotoModalOpen(true)}
            onSelectPhoto={() => {
              if (progressPhotos.length >= 2) setCompareOpen(true)
            }}
          />
          {progressPhotos.length >= 2 && (
            <div style={{ padding: '0 18px 16px' }}>
              <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 8 }}>Body fat trend (estimated)</div>
              <BodyFatLineChart photos={progressPhotos} height={140} />
            </div>
          )}
        </div>
        <PhotoUploadModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          profile={profile}
          onSaved={loadProgressPhotos}
        />
        <CompareModal
          isOpen={compareOpen}
          onClose={() => setCompareOpen(false)}
          photos={progressPhotos}
          profile={profile}
        />

        <div
          className="glass"
          style={{
            padding: 0,
            marginBottom: 24,
            overflow: 'hidden',
            background: 'rgba(14, 20, 14, 0.92)',
            WebkitBackfaceVisibility: 'visible',
            border: '1px solid rgba(110,231,183,0.12)',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #6EE7B7, #F97316, #EC4899)' }} />
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Welcome to FitCoach AI
            </h2>
            <p
              style={{
                fontSize: 14,
                color: '#B8D4C4',
                lineHeight: 1.6,
                marginBottom: 24,
                maxWidth: 400,
                margin: '0 auto 24px',
              }}
            >
              Let&apos;s build your personalized training program. Answer a few questions and we&apos;ll match you with the perfect AI coach.
            </p>
            <button
              type="button"
              onClick={() => router.push('/plans?start=workout')}
              style={{
                width: '100%',
                maxWidth: 320,
                margin: '0 auto',
                display: 'block',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 16,
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
                cursor: 'pointer',
              }}
            >
              Create My Program →
            </button>
          </div>
        </div>

        <div className="card-grid">
          {[
            { emoji: '🏋️', title: 'Personalized Workouts', desc: 'Tailored to your goals, experience, and equipment' },
            { emoji: '🥗', title: 'Smart Nutrition', desc: 'Meal plans designed for your preferences and dietary needs' },
            { emoji: '💬', title: 'AI Coaching', desc: 'Chat with your trainer anytime for advice and motivation' },
          ].map((card, i) => (
            <div key={i} className="glass" style={{ padding: '20px 18px', background: 'rgba(14, 20, 14, 0.92)', WebkitBackfaceVisibility: 'visible' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{card.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#D1FAE5', marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 12, color: '#8BAFA0', lineHeight: 1.5 }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const workoutContent = plans.workout?.content || null
  const mealContent = plans.meal?.content || null
  const hasWorkoutPlan = hasUsableWorkoutPlan(plans.workout)
  const startWeight = weightLogs[0]?.weight_kg ?? profile.weight_kg
  const currentWeight = profile.weight_kg
  const swN = typeof startWeight === 'number' && !Number.isNaN(startWeight) ? startWeight : null
  const cwN = typeof currentWeight === 'number' && !Number.isNaN(currentWeight) ? currentWeight : null
  const weightDiff = (cwN ?? 0) - (swN ?? 0)
  const progressDir = profile.goal === 'lose_fat' ? (weightDiff < 0 ? 'good' : 'bad') : profile.goal === 'build_muscle' ? (weightDiff > 0 ? 'good' : 'bad') : 'neutral'

  const cardDelays = [0, 100, 200, 300, 400, 500, 600, 700]

  return (
    <div className="dashboard-app-container" style={{ paddingTop: 18, paddingBottom: 24 }}>
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
          {hasWorkoutPlan ? (
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginTop: 6,
                color: trainer.color || '#6EE7B7',
              }}
            >
              Coached by {trainer.name} {trainer.emoji}
            </p>
          ) : (
            <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: '#6B8F7A' }}>
              Default mode — log habits below or create your program for a full plan
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Add progress photo"
            onClick={() => setPhotoModalOpen(true)}
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
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            📷
          </button>
          <button
            type="button"
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
              cursor: 'pointer',
            }}
          >
            {trainer.emoji}
          </button>
        </div>
      </motion.div>

      {!hasWorkoutPlan && (
        <div
          className="glass"
          style={{
            padding: 0,
            marginBottom: 16,
            overflow: 'hidden',
            border: '1px solid rgba(110,231,183,0.12)',
            background: 'rgba(14, 20, 14, 0.92)',
            WebkitBackfaceVisibility: 'visible',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #6EE7B7)' }} />
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Build your workout program</div>
              <p style={{ fontSize: 12, color: '#B8D4C4', lineHeight: 1.45, marginTop: 4 }}>
                Everything below works now with defaults. Add a plan for personalized training & coach match.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/plans?start=workout')}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Create My Program →
            </button>
          </div>
        </div>
      )}

      {/* B. Streak & Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[1] }}
        className="card-grid"
        style={{ marginBottom: 14 }}
      >
        <div className="glass" style={{ padding: 18, borderTop: '3px solid #F97316' }}>
          <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>🔥 STREAK</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Day 1</div>
          {!hasWorkoutPlan && <div style={{ fontSize: 9, color: '#4A6B58', marginTop: 2 }}>default</div>}
        </div>
        <div className="glass" style={{ padding: 18, borderTop: '3px solid #6EE7B7' }}>
          <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>⚡ THIS WEEK</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>0/4</div>
          {!hasWorkoutPlan && <div style={{ fontSize: 9, color: '#4A6B58', marginTop: 2 }}>placeholder</div>}
        </div>
        <div className="glass" style={{ padding: 18, borderTop: '3px solid #93C5FD' }}>
          <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>📊 PROGRESS</div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: progressDir === 'good' ? '#6EE7B7' : progressDir === 'bad' ? '#FB7185' : '#93C5FD',
          }}>
            {(cwN == null || swN == null) ? '—' : `${weightDiff >= 0 ? '+' : ''}${weightDiff.toFixed(1)} kg`}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[1] + 40 }}
        className="glass"
        style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}
      >
        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            borderBottom: '1px solid rgba(110,231,183,0.05)',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Progress photos</div>
            <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 4, lineHeight: 1.4 }}>
              Add new check-in photos whenever you want — same angles help comparisons.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPhotoModalOpen(true)}
            style={{
              padding: '6px 14px',
              borderRadius: 100,
              background: 'rgba(110,231,183,0.1)',
              border: '1px solid rgba(110,231,183,0.15)',
              color: '#6EE7B7',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            + Add photo
          </button>
        </div>
        <ProgressTimeline
          photos={progressPhotos}
          onAdd={() => setPhotoModalOpen(true)}
          onSelectPhoto={() => {
            if (progressPhotos.length >= 2) setCompareOpen(true)
          }}
        />
        {progressPhotos.length >= 2 && (
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 8 }}>Body fat trend (estimated)</div>
            <BodyFatLineChart photos={progressPhotos} height={140} />
          </div>
        )}
      </motion.div>

      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        profile={profile}
        onSaved={loadProgressPhotos}
      />
      <CompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        photos={progressPhotos}
        profile={profile}
      />

      {/* Adjust program (free-form) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[1] + 50 }}
        className="glass"
        style={{
          padding: 18,
          marginBottom: 14,
          border: '1px solid rgba(110,231,183,0.14)',
          background: 'rgba(14, 20, 14, 0.92)',
          WebkitBackfaceVisibility: 'visible',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Change your program</div>
        <p style={{ fontSize: 12, color: '#8BAFA0', lineHeight: 1.5, marginBottom: 12 }}>
          Tell the coach anything you want different—schedule, exercises, equipment, injuries, diet tweaks, macro targets, foods to avoid, etc. We&apos;ll regenerate your active plan using your saved quiz answers plus these notes.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {[
            { id: 'both', label: 'Workout + meals' },
            { id: 'workout', label: 'Workout only' },
            { id: 'meal', label: 'Meals only' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAdjustScope(id)}
              style={{
                padding: '8px 14px',
                borderRadius: 100,
                border: adjustScope === id ? '1px solid rgba(110,231,183,0.45)' : '1px solid rgba(110,231,183,0.12)',
                background: adjustScope === id ? 'rgba(16,185,129,0.2)' : 'rgba(14,20,14,0.5)',
                color: adjustScope === id ? '#6EE7B7' : '#A7C4B8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={programAdjustText}
          onChange={(e) => {
            setProgramAdjustText(e.target.value.slice(0, 2000))
            if (adjustError) setAdjustError(null)
          }}
          placeholder="e.g. Swap barbell bench for dumbbells, only have 3 days/week now, no dairy, more protein at breakfast…"
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.15)',
            background: 'rgba(8,12,8,0.65)',
            color: '#E2FBE8',
            fontSize: 14,
            fontFamily: "'Outfit', sans-serif",
            resize: 'vertical',
            minHeight: 96,
            marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#4A6B58' }}>{programAdjustText.length}/2000</span>
          <button
            type="button"
            disabled={adjustLoading || !programAdjustText.trim()}
            onClick={handleRegenerateWithAdjustments}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background:
                adjustLoading || !programAdjustText.trim()
                  ? 'rgba(74,107,88,0.4)'
                  : 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: adjustLoading || !programAdjustText.trim() ? '#6B8F7A' : '#070B07',
              fontSize: 14,
              fontWeight: 700,
              cursor: adjustLoading || !programAdjustText.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {adjustLoading ? 'Updating…' : 'Update program'}
          </button>
        </div>
        {adjustError && (
          <p style={{ fontSize: 12, color: '#FB7185', marginTop: 10, marginBottom: 0 }}>{adjustError}</p>
        )}
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
        <ProgressChart data={weightLogs} targetWeight={profile.target_weight} height={chartHeight} />
      </motion.div>

      <div className="dashboard-desktop-2col">
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
              {hasWorkoutPlan && (
                <button
                  type="button"
                  onClick={() => router.push('/plans?edit=workout')}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(110,231,183,0.25)',
                    background: 'rgba(16,185,129,0.08)',
                    color: '#6EE7B7',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Edit trainer workout (exercises)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="glass" style={{ padding: 24, marginBottom: 14, border: '1px dashed rgba(110,231,183,0.2)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🏋️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Today&apos;s Workout</div>
            <div style={{ fontSize: 13, color: '#94A89E', marginBottom: 16 }}>
              {hasWorkoutPlan ? 'Log your workout or open your plan in Plans.' : 'No generated plan yet — log a session or create your program for scheduled workouts.'}
            </div>
            {recentWorkouts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, marginBottom: 6 }}>Recent</div>
                {recentWorkouts.slice(0, 2).map((w) => (
                  <div key={w.id} style={{ padding: 10, background: 'rgba(14,20,14,0.5)', borderRadius: 10, marginBottom: 6, fontSize: 12, color: '#D1FAE5' }}>
                    {new Date(w.logged_at).toLocaleDateString()} · {(w.exercises || []).slice(0, 2).map((e) => e.name).join(', ')}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setWorkoutLogModalOpen(true)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid rgba(110,231,183,0.3)',
                  background: 'rgba(16,185,129,0.2)',
                  color: '#6EE7B7',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Log Workout
              </button>
              <button
                onClick={() => router.push('/plans?start=workout')}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                  color: '#070B07',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Create Plan
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* F. Nutrition */}
      {(() => {
        const parseTarget = (v) => parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0
        const targetCal = mealContent ? parseTarget(mealContent.dailyCalories) : 2000
        const targetP = mealContent ? parseTarget(mealContent.protein) : 150
        const targetC = mealContent ? parseTarget(mealContent.carbs) : 200
        const targetF = mealContent ? parseTarget(mealContent.fats) : 65
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
            style={{ marginBottom: 14 }}
          >
            <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(110,231,183,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nutrition</div>
                  {!mealContent && (
                    <div style={{ fontSize: 10, color: '#5A7A68', fontWeight: 600, marginTop: 2 }}>Default targets (2000 cal) · meal plan optional</div>
                  )}
                </div>
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
                {todayMeals.length > 0 ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6EE7B7', marginBottom: 8 }}>Meals Logged Today</div>
                ) : (
                  <div style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 8 }}>No meals logged yet today</div>
                )}
                {todayMeals.map((meal, i) => (
                  <div key={meal.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(110,231,183,0.04)', fontSize: 12 }}>
                    <span style={{ color: '#D1FAE5' }}>{meal.meal_name} · {new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    <span style={{ color: '#6EE7B7', fontWeight: 600 }}>{Math.round(parseFloat(meal.total_calories) || 0)} cal · {parseFloat(meal.total_protein || 0).toFixed(1)}g P</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
            </div>
            {!mealContent && (
              <button
                onClick={() => router.push('/plans?start=meal')}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px dashed rgba(249,115,22,0.3)',
                  background: 'transparent',
                  color: '#F97316',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Create Meal Plan for personalized targets →
              </button>
            )}
          </motion.div>
        )
      })()}
      </div>

      {/* G. Meal Plan Meals (only when plan exists) */}
      {mealContent && mealContent.meals?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelays[5] }}
          className="glass"
          style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(110,231,183,0.05)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Your Meal Plan</div>
          </div>
          <div style={{ padding: '4px 18px 14px' }}>
            {['🍳', '🥗', '🍌', '🥩'].map((emoji, i) => {
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
          </div>
        </motion.div>
      )}

      {/* H. Body Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[5] }}
        className="glass"
        style={{ padding: 18, marginBottom: 14 }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Body Progress</div>
        <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 14 }}>Track your physique. Goal can be someone whose body you want to achieve.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <BodyImageSlot
            label="My current physique"
            imageUrl={profile.body_image_url}
            userId={user?.id}
            profileId={profile.id}
            slot="current"
            onUpload={refreshProfile}
          />
          <BodyImageSlot
            label="Body I want to achieve"
            hint="e.g. athlete or reference photo"
            imageUrl={profile.goal_body_image_url}
            userId={user?.id}
            profileId={profile.id}
            slot="goal"
            onUpload={refreshProfile}
          />
        </div>
      </motion.div>

      {/* I. Get AI Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[6] }}
        className="glass"
        style={{ padding: 18, marginBottom: 14 }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Get AI Analysis</div>
        <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 14 }}>Review your habits and get personalized recommendations</div>
        <button
          onClick={handleAnalyze}
          disabled={analysisLoading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.3)',
            background: 'rgba(16,185,129,0.2)',
            color: '#6EE7B7',
            fontSize: 14,
            fontWeight: 600,
            opacity: analysisLoading ? 0.7 : 1,
          }}
        >
          {analysisLoading ? 'Analyzing...' : 'Analyze my progress'}
        </button>
        {analysisResult && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: 'rgba(14,20,14,0.6)',
              borderRadius: 12,
              border: '1px solid rgba(110,231,183,0.1)',
              fontSize: 13,
              color: '#D1FAE5',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}
          >
            {analysisResult}
          </div>
        )}
        {analysisResult && (
          <button
            onClick={() => router.push('/plans')}
            style={{
              width: '100%',
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Create Plan →
          </button>
        )}
      </motion.div>

      {/* J. Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[7] }}
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
          onClick={() => setWorkoutLogModalOpen(true)}
          className="glass-sm"
          style={{ flex: 1, minWidth: 100, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>🏋️</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Log Workout</div>
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
      <LogWorkoutModal
        open={workoutLogModalOpen}
        onClose={() => setWorkoutLogModalOpen(false)}
        profileId={profile?.id}
        onLog={handleWorkoutLogged}
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
