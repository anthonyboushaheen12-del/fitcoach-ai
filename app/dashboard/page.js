'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getTrainer } from '../../lib/trainers'
import { useAuth } from '../components/AuthProvider'
import BrandedAuthLoading from '../components/BrandedAuthLoading'
import ProfileLoadRecovery from '../components/ProfileLoadRecovery'
import { useProfileResolutionTimeout } from '../hooks/useProfileResolutionTimeout'
import DailyMacrosCard from '../components/DailyMacrosCard'
import TodaysMealsCard from '../components/TodaysMealsCard'

const TrainerModal = dynamic(() => import('../components/TrainerModal'), { ssr: false, loading: () => null })
const FoodLogModal = dynamic(() => import('../components/FoodLogModal'), { ssr: false, loading: () => null })
const WorkoutHubCard = dynamic(() => import('../components/WorkoutHubCard'), { ssr: false, loading: () => null })
const LogWorkoutModal = dynamic(() => import('../components/LogWorkoutModal'), { ssr: false, loading: () => null })
const ProgressTimeline = dynamic(() => import('../components/ProgressTimeline'), { ssr: false, loading: () => null })
const PhotoUploadModal = dynamic(() => import('../components/PhotoUploadModal'), { ssr: false, loading: () => null })
const CompareModal = dynamic(() => import('../components/CompareModal'), { ssr: false, loading: () => null })
const ProgressPhotoDetailModal = dynamic(
  () => import('../components/ProgressPhotoDetailModal'),
  { ssr: false, loading: () => null }
)
const BodyFatLineChart = dynamic(
  () => import('../components/ProgressCharts').then((m) => m.BodyFatLineChart),
  { ssr: false, loading: () => null }
)

async function jsonHeadersWithAuth() {
  const headers = {}
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

async function fetchDashboardPlans([, profileId]) {
  if (!supabase) return []
  const res = await Promise.race([
    supabase
      .from('plans')
      .select('id, profile_id, type, content, active, created_at')
      .eq('profile_id', profileId)
      .eq('active', true),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
  ])
  if (res?.error) throw new Error(res.error.message || 'plans error')
  return res?.data || []
}

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { text: `Good morning, ${name}`, emoji: '💪' }
  if (h >= 12 && h < 17) return { text: `Afternoon grind, ${name}`, emoji: '🔥' }
  if (h >= 17 && h < 21) return { text: `Evening session, ${name}`, emoji: '⚡' }
  return { text: `Rest up, ${name}`, emoji: '🌙' }
}

function hasUsableWorkoutPlan(workoutPlanRow) {
  const c = workoutPlanRow?.content
  if (!c || typeof c !== 'object') return false
  if (Array.isArray(c.days) && c.days.length > 0) return true
  if (Array.isArray(c.todayExercises) && c.todayExercises.length > 0) return true
  if (typeof c.name === 'string' && c.name.trim().length > 0) return true
  return false
}

function hasUsableMealPlan(mealPlanRow) {
  const c = mealPlanRow?.content
  if (!c || typeof c !== 'object') return false
  const cal = c.dailyCalories
  if (typeof cal === 'number' && Number.isFinite(cal) && cal > 0) return true
  if (typeof cal === 'string' && String(cal).replace(/\D/g, '').length > 0) return true
  if (Array.isArray(c.meals) && c.meals.length > 0) return true
  return false
}

function Toast({ message }) {
  if (!message) return null
  return (
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
      {message}
    </motion.div>
  )
}

function DashboardHeader({ greeting, trainer, hasWorkoutPlan, onPhoto, onTrainer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
          <p style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: trainer.color || '#6EE7B7' }}>
            Coached by {trainer.name} {trainer.emoji}
          </p>
        ) : (
          <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: '#6B8F7A' }}>
            Log meals and photos below — set up your program when ready
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Add progress photo"
          onClick={onPhoto}
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
          aria-label="Switch trainer"
          onClick={onTrainer}
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
  )
}

function ProgressPhotosSection({ photos, onAdd, onSelectPhoto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
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
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Body check-in</div>
          <div style={{ fontSize: 11, color: '#4A6B58', marginTop: 4, lineHeight: 1.4 }}>
            Upload photos for AI physique assessment and progress tracking.
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '6px 14px',
            borderRadius: 100,
            background: 'rgba(110,231,183,0.1)',
            border: '1px solid rgba(110,231,183,0.15)',
            color: '#6EE7B7',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          + Add photo
        </button>
      </div>
      <ProgressTimeline photos={photos} onAdd={onAdd} onSelectPhoto={onSelectPhoto} />
      {photos.length >= 2 && (
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 8 }}>
            Body fat trend (estimated)
          </div>
          <BodyFatLineChart photos={photos} height={140} />
        </div>
      )}
    </motion.div>
  )
}

function AskCoachCard({ trainer, onClick }) {
  const shortName = (trainer.name || 'Coach').split(/\s+/).pop()
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      onClick={onClick}
      className="glass"
      style={{
        width: '100%',
        padding: 16,
        marginBottom: 14,
        border: `1px solid ${trainer.color}33`,
        background: `linear-gradient(135deg, ${trainer.color}12, rgba(14,20,14,0.85))`,
        borderRadius: 14,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span style={{ fontSize: 28 }}>{trainer.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Ask {shortName}</div>
        <div style={{ fontSize: 12, color: '#A7C4B8', marginTop: 2, lineHeight: 1.4 }}>
          Follow up on your program, nutrition, or training questions
        </div>
      </div>
      <span style={{ color: '#6EE7B7', fontSize: 18 }}>→</span>
    </motion.button>
  )
}

function SetupProgramCta({ onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass"
      style={{
        padding: 20,
        marginBottom: 14,
        border: '1px solid rgba(110,231,183,0.12)',
        borderTop: '3px solid #6EE7B7',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Set up your program</div>
      <p style={{ fontSize: 12, color: '#A7C4B8', lineHeight: 1.5, marginBottom: 14 }}>
        Pick a trainer and generate workout + meal plans tailored to you.
      </p>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
          color: '#070B07',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Open Program →
      </button>
    </motion.div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const {
    user,
    profile: authProfile,
    loading: authLoading,
    profileLoading,
    profileMissingConfirmed,
    profileFetchError,
    refreshProfile,
  } = useAuth()
  const profileResolutionTimedOut = useProfileResolutionTimeout(user, authProfile, 3000)
  const [trainerModalOpen, setTrainerModalOpen] = useState(false)
  const [foodLogModalOpen, setFoodLogModalOpen] = useState(false)
  const [foodLogOpenWithCamera, setFoodLogOpenWithCamera] = useState(false)
  const [workoutLogModalOpen, setWorkoutLogModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [todayMeals, setTodayMeals] = useState([])
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [progressPhotos, setProgressPhotos] = useState([])
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [photoDetail, setPhotoDetail] = useState(null)
  const [compareOpen, setCompareOpen] = useState(false)

  const profile = authProfile
  const trainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')

  const dashPlansKey = profile?.id && supabase ? ['dash-plans', profile.id] : null
  const { data: plansData, mutate: mutatePlans, isLoading: plansLoading, error: plansError } = useSWR(
    dashPlansKey,
    fetchDashboardPlans,
    { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 5000 }
  )

  const plans = useMemo(() => {
    const rows = plansData
    if (!rows) return { workout: null, meal: null }
    return {
      workout: rows.find((p) => p.type === 'workout'),
      meal: rows.find((p) => p.type === 'meal'),
    }
  }, [plansData])

  const loading = Boolean(dashPlansKey && plansLoading && plansData === undefined && !plansError)

  const latestProgressSessionId = useMemo(() => {
    let bestDate = ''
    let id = null
    for (const p of progressPhotos) {
      const sd = p.session?.session_date || ''
      if (sd && sd >= bestDate) {
        bestDate = sd
        id = p.session_id || p.session?.id || null
      }
    }
    return id
  }, [progressPhotos])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    const logMeal = q.get('logMeal')
    if (logMeal !== '1' && logMeal !== 'scan') return
    setFoodLogOpenWithCamera(logMeal === 'scan')
    setFoodLogModalOpen(true)
    router.replace('/dashboard', { scroll: false })
  }, [router])

  function openFoodLog({ camera = false } = {}) {
    setFoodLogOpenWithCamera(camera)
    setFoodLogModalOpen(true)
  }

  function closeFoodLog() {
    setFoodLogModalOpen(false)
    setFoodLogOpenWithCamera(false)
  }

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    if (user && !authProfile && !profileLoading && !authLoading && profileMissingConfirmed) {
      router.push('/onboarding')
    }
  }, [user, authProfile, profileLoading, authLoading, profileMissingConfirmed, router])

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

  async function refreshWorkoutFromBodyAnalysis(bodyAnalysis) {
    if (!profile?.id || !bodyAnalysis || typeof bodyAnalysis !== 'object') return
    setToast('Updating your workout…')
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
          type: 'workout',
          workoutPreferences,
          mealPreferences,
          bodyAnalysis,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || 'Workout refresh failed')
      }
      await mutatePlans()
      setToast(null)
    } catch {
      setToast('Photo saved; workout refresh failed — try again from Program')
      setTimeout(() => setToast(null), 4500)
    }
  }

  async function handleProgressPhotoSaved(payload) {
    await loadProgressPhotos()
    if (payload?.analysis && typeof payload.analysis === 'object') {
      await refreshWorkoutFromBodyAnalysis(payload.analysis)
    }
  }

  async function handleDeleteProgressPhoto(photoId) {
    try {
      const r = await fetch(`/api/progress-photo?id=${encodeURIComponent(photoId)}`, {
        method: 'DELETE',
        headers: await jsonHeadersWithAuth(),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not delete photo')
      await loadProgressPhotos()
      setPhotoDetail(null)
      setToast('Photo removed')
      setTimeout(() => setToast(null), 2200)
    } catch (e) {
      setToast(e?.message || 'Delete failed')
      setTimeout(() => setToast(null), 4000)
    }
  }

  useEffect(() => {
    if (!profile?.id) return
    const profileId = profile.id
    const today = new Date().toISOString().split('T')[0]
    let cancelled = false
    let idleId = null
    let timeoutId = null

    ;(async () => {
      try {
        const mealJson = await fetch(`/api/meal-log?profileId=${profileId}&date=${today}`)
          .then((r) => r.json())
          .catch(() => ({}))
        if (cancelled) return
        setTodayMeals(mealJson.meals || [])

        const runSecondary = async () => {
          if (cancelled) return
          try {
            const headers = await jsonHeadersWithAuth()
            const [photoJson, workoutJson] = await Promise.all([
              fetch(`/api/progress-photo?profileId=${profileId}`, { headers }).then((r) => r.json()).catch(() => ({})),
              fetch(`/api/workout-log?profileId=${profileId}&limit=10`).then((r) => r.json()).catch(() => ({})),
            ])
            if (cancelled) return
            setProgressPhotos(photoJson.photos || [])
            setRecentWorkouts(workoutJson.workouts || [])
          } catch {
            if (!cancelled) {
              setProgressPhotos([])
              setRecentWorkouts([])
            }
          }
        }

        if (typeof requestIdleCallback !== 'undefined') {
          idleId = requestIdleCallback(runSecondary, { timeout: 2000 })
        } else {
          timeoutId = setTimeout(runSecondary, 1)
        }
      } catch {
        if (!cancelled) {
          setProgressPhotos([])
          setTodayMeals([])
          setRecentWorkouts([])
        }
      }
    })()

    return () => {
      cancelled = true
      if (idleId != null && typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(idleId)
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [profile?.id])

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

  const showProfileRecovery =
    user &&
    !authProfile &&
    !profileLoading &&
    !authLoading &&
    !profileMissingConfirmed &&
    (!!profileFetchError || profileResolutionTimedOut)

  const showDashboardLoading =
    !showProfileRecovery &&
    (authLoading || (!profile?.id && profileLoading) || !profile)

  if (showProfileRecovery) {
    return (
      <ProfileLoadRecovery
        onRetry={() => refreshProfile()}
        onHome={() => router.push('/')}
        detail={profileFetchError}
      />
    )
  }

  if (showDashboardLoading) {
    return <BrandedAuthLoading minHeight="70vh" />
  }

  const greeting = getGreeting(profile.name?.split(' ')[0] || 'there')
  const workoutContent = plans.workout?.content || null
  const mealContent = plans.meal?.content || null
  const hasWorkoutPlan = hasUsableWorkoutPlan(plans.workout)
  const hasMealPlan = hasUsableMealPlan(plans.meal)
  const hasAnyPlan = hasWorkoutPlan || hasMealPlan
  const cardDelays = [0, 100, 200, 300]

  const headerProps = {
    greeting,
    trainer,
    hasWorkoutPlan,
    onPhoto: () => setPhotoModalOpen(true),
    onTrainer: () => setTrainerModalOpen(true),
  }

  if (loading) {
    return (
      <div className="dashboard-app-container" style={{ paddingTop: 18, paddingBottom: 24 }}>
        <Toast message={toast} />
        <DashboardHeader {...headerProps} />
        <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#8BAFA0' }}>Loading your program…</div>
        </div>
        <ProgressPhotosSection
          photos={progressPhotos}
          onAdd={() => setPhotoModalOpen(true)}
          onSelectPhoto={(p) => setPhotoDetail(p)}
        />
        <DashboardModals
          profile={profile}
          trainer={trainer}
          progressPhotos={progressPhotos}
          latestProgressSessionId={latestProgressSessionId}
          photoModalOpen={photoModalOpen}
          setPhotoModalOpen={setPhotoModalOpen}
          compareOpen={compareOpen}
          setCompareOpen={setCompareOpen}
          photoDetail={photoDetail}
          setPhotoDetail={setPhotoDetail}
          trainerModalOpen={trainerModalOpen}
          setTrainerModalOpen={setTrainerModalOpen}
          foodLogModalOpen={foodLogModalOpen}
          foodLogOpenWithCamera={foodLogOpenWithCamera}
          onCloseFoodLog={closeFoodLog}
          setFoodLogModalOpen={setFoodLogModalOpen}
          workoutLogModalOpen={workoutLogModalOpen}
          setWorkoutLogModalOpen={setWorkoutLogModalOpen}
          onProgressPhotoSaved={handleProgressPhotoSaved}
          onDeleteProgressPhoto={handleDeleteProgressPhoto}
          onSelectTrainer={handleSelectTrainer}
          onMealLogged={handleMealLogged}
          onWorkoutLogged={handleWorkoutLogged}
        />
      </div>
    )
  }

  return (
    <div className="dashboard-app-container" style={{ paddingTop: 18, paddingBottom: 24 }}>
      <Toast message={toast} />
      <DashboardHeader {...headerProps} />

      <DailyMacrosCard
        profile={profile}
        mealContent={mealContent}
        workoutContent={workoutContent}
        todayMeals={todayMeals}
        cardDelay={cardDelays[1]}
      />
      <TodaysMealsCard
        todayMeals={todayMeals}
        onLogMeal={() => openFoodLog()}
        onScanMeal={() => openFoodLog({ camera: true })}
        onCreateMealPlan={() => router.push('/plans')}
        hasMealPlan={hasMealPlan}
        cardDelay={cardDelays[2]}
      />
      <WorkoutHubCard
        router={router}
        workoutContent={workoutContent}
        hasWorkoutPlan={hasWorkoutPlan}
        recentWorkouts={recentWorkouts}
        onOpenLogWorkout={() => setWorkoutLogModalOpen(true)}
        cardDelay={cardDelays[3]}
      />

      <ProgressPhotosSection
        photos={progressPhotos}
        onAdd={() => setPhotoModalOpen(true)}
        onSelectPhoto={(p) => setPhotoDetail(p)}
      />

      <AskCoachCard trainer={trainer} onClick={() => router.push('/plans?coach=1')} />

      {!hasAnyPlan && <SetupProgramCta onClick={() => router.push('/plans')} />}

      <DashboardModals
        profile={profile}
        trainer={trainer}
        progressPhotos={progressPhotos}
        latestProgressSessionId={latestProgressSessionId}
        photoModalOpen={photoModalOpen}
        setPhotoModalOpen={setPhotoModalOpen}
        compareOpen={compareOpen}
        setCompareOpen={setCompareOpen}
        photoDetail={photoDetail}
        setPhotoDetail={setPhotoDetail}
        trainerModalOpen={trainerModalOpen}
        setTrainerModalOpen={setTrainerModalOpen}
        foodLogModalOpen={foodLogModalOpen}
        foodLogOpenWithCamera={foodLogOpenWithCamera}
        onCloseFoodLog={closeFoodLog}
        setFoodLogModalOpen={setFoodLogModalOpen}
        workoutLogModalOpen={workoutLogModalOpen}
        setWorkoutLogModalOpen={setWorkoutLogModalOpen}
        onProgressPhotoSaved={handleProgressPhotoSaved}
        onDeleteProgressPhoto={handleDeleteProgressPhoto}
        onSelectTrainer={handleSelectTrainer}
        onMealLogged={handleMealLogged}
        onWorkoutLogged={handleWorkoutLogged}
      />
    </div>
  )
}

function DashboardModals({
  profile,
  trainer,
  progressPhotos,
  latestProgressSessionId,
  photoModalOpen,
  setPhotoModalOpen,
  compareOpen,
  setCompareOpen,
  photoDetail,
  setPhotoDetail,
  trainerModalOpen,
  setTrainerModalOpen,
  foodLogModalOpen,
  foodLogOpenWithCamera,
  onCloseFoodLog,
  setFoodLogModalOpen,
  workoutLogModalOpen,
  setWorkoutLogModalOpen,
  onProgressPhotoSaved,
  onDeleteProgressPhoto,
  onSelectTrainer,
  onMealLogged,
  onWorkoutLogged,
}) {
  return (
    <>
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        profile={profile}
        latestSessionId={latestProgressSessionId}
        onSaved={onProgressPhotoSaved}
      />
      <CompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        photos={progressPhotos}
        profile={profile}
      />
      <ProgressPhotoDetailModal
        isOpen={Boolean(photoDetail)}
        photo={photoDetail}
        onClose={() => setPhotoDetail(null)}
        onCompare={progressPhotos.length >= 2 ? () => setCompareOpen(true) : undefined}
        onDelete={onDeleteProgressPhoto}
      />
      <TrainerModal
        open={trainerModalOpen}
        onClose={() => setTrainerModalOpen(false)}
        profile={profile}
        currentTrainer={trainer}
        onSelect={onSelectTrainer}
      />
      <FoodLogModal
        open={foodLogModalOpen}
        onClose={onCloseFoodLog || (() => setFoodLogModalOpen(false))}
        openWithCamera={foodLogOpenWithCamera}
        profileId={profile?.id}
        onLog={onMealLogged}
      />
      <LogWorkoutModal
        open={workoutLogModalOpen}
        onClose={() => setWorkoutLogModalOpen(false)}
        profileId={profile?.id}
        onLog={onWorkoutLogged}
      />
    </>
  )
}
