'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { trainers as trainersList, getTrainer } from '../../lib/trainers'
import ProgressChart from '../components/ProgressChart'
import WeightModal from '../components/WeightModal'
import TrainerModal from '../components/TrainerModal'

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { text: `Good morning, ${name}`, emoji: '💪' }
  if (h >= 12 && h < 17) return { text: `Afternoon grind, ${name}`, emoji: '🔥' }
  if (h >= 17 && h < 21) return { text: `Evening session, ${name}`, emoji: '⚡' }
  return { text: `Rest up, ${name}`, emoji: '🌙' }
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [plans, setPlans] = useState({ workout: null, meal: null })
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [trainerModalOpen, setTrainerModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const trainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const profileId = localStorage.getItem('profileId')
    if (!profileId) {
      router.push('/')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    if (!profileData) {
      router.push('/')
      return
    }

    setProfile(profileData)
    localStorage.setItem('profile', JSON.stringify(profileData))

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
    const startDate = profileData?.created_at ? new Date(profileData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    if (!logs || logs.length === 0) {
      built.push({ date: new Date().toISOString().split('T')[0], weight_kg: profileData.weight_kg })
    } else {
      const hasStart = logs.some((l) => ((l.logged_at || l.created_at || '') + '').split('T')[0] === startDate)
      if (!hasStart && profileData.created_at) {
        built.push({ date: startDate, weight_kg: profileData.weight_kg })
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
      if (data.success) await loadProfile()
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
    const updated = { ...profile, weight_kg: weightKg }
    setProfile(updated)
    await supabase.from('profiles').update({ weight_kg: weightKg }).eq('id', profile.id)
    localStorage.setItem('profile', JSON.stringify(updated))
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

  async function handleSelectTrainer(t) {
    if (!profile) return
    await supabase.from('profiles').update({ trainer: t.id }).eq('id', profile.id)
    setProfile((prev) => ({ ...prev, trainer: t.id }))
    localStorage.setItem('profile', JSON.stringify({ ...profile, trainer: t.id }))
    setToast(`Switched to ${t.name}`)
    setTimeout(() => setToast(null), 2000)
  }

  if (loading || !profile) {
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

      {/* C. Progress Chart */}
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

      {/* D. Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[3] }}
      >
        {workoutContent && workoutContent.todayExercises ? (
          <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #F97316, #EC4899)' }} />
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(110,231,183,0.05)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Today&apos;s Workout
              </div>
              <div style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 600, marginTop: 4 }}>
                {workoutContent.todayName || new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
            </div>
            <div style={{ padding: '12px 20px 18px' }}>
              {workoutContent.todayExercises.slice(0, 5).map((ex, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < workoutContent.todayExercises.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(110,231,183,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6EE7B7' }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#1F4030' }}>Rest {ex.rest}</div>
                    </div>
                  </div>
                  <div className="gradient-green" style={{ fontSize: 12, fontWeight: 700 }}>{ex.sets}</div>
                </div>
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

      {/* E. Macros Card */}
      {mealContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelays[4] }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}
        >
          {[
            { label: 'Calories', value: mealContent.dailyCalories || '—', color: '#6EE7B7', pct: 0 },
            { label: 'Protein', value: mealContent.protein || '—', color: '#FBBF24', pct: 0 },
            { label: 'Carbs', value: mealContent.carbs || '—', color: '#93C5FD', pct: 0 },
            { label: 'Fats', value: mealContent.fats || '—', color: '#FB7185', pct: 0 },
          ].map((m, i) => (
            <div key={i} className="glass" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 2, background: m.color, opacity: 0.5 }} />
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={18} cy={18} r={14} fill="none" stroke="rgba(110,231,183,0.1)" strokeWidth={4} />
                  <circle cx={18} cy={18} r={14} fill="none" stroke={m.color} strokeWidth={4} strokeDasharray={`${m.pct * 0.88} 88`} strokeLinecap="round" />
                </svg>
                <div>
                  <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* F. Nutrition Summary */}
      {mealContent && mealContent.meals && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardDelays[5] }}
          className="glass"
          style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(110,231,183,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nutrition</div>
            <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>{mealContent.dailyCalories} total</div>
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

      {/* G. Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cardDelays[6] }}
        style={{ display: 'flex', gap: 10, marginBottom: 24 }}
      >
        <button
          onClick={() => router.push('/chat')}
          className="glass-sm"
          style={{ flex: 1, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>💬</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Ask {trainer.name.split(' ').pop()}</div>
        </button>
        <button
          onClick={() => router.push('/chat?prompt=body')}
          className="glass-sm"
          style={{ flex: 1, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6EE7B7' }}>Body Check</div>
        </button>
        <button
          onClick={() => setWeightModalOpen(true)}
          className="glass-sm"
          style={{ flex: 1, padding: 14, textAlign: 'center', border: '1px solid rgba(110,231,183,0.1)' }}
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
