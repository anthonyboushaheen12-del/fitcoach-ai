'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { trainers as trainersList, getTrainer } from '../../lib/trainers'

const TRAINER_LABELS = {
  scientist: 'Science',
  sergeant: 'Intensity',
  bro: 'Legends',
  holistic: 'Wellness',
  athlete: 'Athlete',
};

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [plans, setPlans] = useState({ workout: null, meal: null })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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

    // Load profile
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

    // Load active plans
    const { data: plansData } = await supabase
      .from('plans')
      .select('*')
      .eq('profile_id', profileId)
      .eq('active', true)

    if (plansData) {
      const workout = plansData.find(p => p.type === 'workout')
      const meal = plansData.find(p => p.type === 'meal')
      setPlans({ workout, meal })
    }

    setLoading(false)
  }

  async function generatePlans() {
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
        await loadProfile() // reload to get new plans
      }
    } catch (err) {
      console.error('Error generating plans:', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#2D5B3F' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏋️</div>
        Loading your dashboard...
      </div>
    )
  }

  const weightDiff = profile.weight_kg - profile.target_weight
  const progress = Math.max(0, Math.min(100, ((weightDiff > 0 ? 1 : 0) * 30))) // simplified

  // Parse plan content
  const workoutContent = plans.workout?.content || null
  const mealContent = plans.meal?.content || null

  return (
    <div style={{ padding: '18px 20px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
            <span style={{ color: '#6EE7B7' }}>Fit</span>
            <span style={{ color: '#fff' }}>Coach</span>
            <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
          </h1>
          <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>
            Hey {profile.name} — let's get after it
          </p>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(110,231,183,0.1), rgba(251,113,133,0.08))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, border: '1px solid rgba(110,231,183,0.1)',
        }}>{trainer.emoji}</div>
      </div>

      {/* Stats Card */}
      <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #6EE7B7, #F97316, #EC4899)' }} />
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600, letterSpacing: 1 }}>CURRENT</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -3, lineHeight: 1, marginTop: 4 }}>
                {profile.weight_kg}<span style={{ fontSize: 18, fontWeight: 500, color: '#2D5B3F', marginLeft: 2 }}>kg</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>TARGET</div>
                <div className="gradient-green" style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>
                  {profile.target_weight}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>TO GO</div>
                <div className="gradient-accent" style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>
                  {Math.abs(weightDiff).toFixed(0)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 18, background: 'rgba(110,231,183,0.08)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
              borderRadius: 100, boxShadow: '0 0 16px rgba(110,231,183,0.35)',
            }} />
          </div>
        </div>
      </div>

      {/* Generate Plans CTA (if no plans yet) */}
      {!plans.workout && !plans.meal && (
        <button
          onClick={generatePlans}
          disabled={generating}
          style={{
            width: '100%', padding: 18, borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, #F97316, #EC4899)',
            color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 14,
            boxShadow: '0 4px 20px rgba(249,115,22,0.25)',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? '🧬 Generating your plans...' : `🔥 Generate Plans with ${trainer.name}`}
        </button>
      )}

      {/* Macros */}
      {mealContent && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Calories', value: mealContent.dailyCalories || '—', color: '#6EE7B7' },
            { label: 'Protein', value: mealContent.protein || '—', color: '#FBBF24' },
            { label: 'Carbs', value: mealContent.carbs || '—', color: '#93C5FD' },
            { label: 'Fats', value: mealContent.fats || '—', color: '#FB7185' },
          ].map((m, i) => (
            <div key={i} className="glass" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 2, background: m.color, opacity: 0.4 }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: m.color, marginTop: 2 }}>{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workout */}
      {workoutContent && workoutContent.todayExercises && (
        <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(110,231,183,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{workoutContent.todayName || 'Today\'s Workout'}</div>
              <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500 }}>
                {workoutContent.todayExercises.length} exercises
              </div>
            </div>
            <div className="bg-gradient-accent" style={{
              color: '#fff', fontSize: 12, fontWeight: 700,
              padding: '8px 18px', borderRadius: 100,
              boxShadow: '0 4px 15px rgba(249,115,22,0.25)',
            }}>Start →</div>
          </div>
          <div style={{ padding: '4px 18px 14px' }}>
            {workoutContent.todayExercises.map((ex, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0',
                borderBottom: i < workoutContent.todayExercises.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(110,231,183,0.12), rgba(16,185,129,0.06))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#6EE7B7',
                  }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: '#1F4030' }}>Rest {ex.rest}</div>
                  </div>
                </div>
                <div className="gradient-green" style={{ fontSize: 13, fontWeight: 700 }}>{ex.sets}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meals */}
      {mealContent && mealContent.meals && (
        <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 18px', borderBottom: '1px solid rgba(110,231,183,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Nutrition</div>
            <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>
              {mealContent.dailyCalories} total
            </div>
          </div>
          <div style={{ padding: '4px 18px 14px' }}>
            {mealContent.meals.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0',
                borderBottom: i < mealContent.meals.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#1F4030' }}>{m.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{m.calories} cal</div>
                  <div className="gradient-accent" style={{ fontSize: 10, fontWeight: 600 }}>{m.protein}g protein</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat CTA */}
      <button
        onClick={() => router.push('/chat')}
        style={{
          width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
          color: '#070B07', fontSize: 15, fontWeight: 700, marginBottom: 14,
          boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
        }}
      >
        💬 Chat with {trainer.name}
      </button>

      {/* Trainer Selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#2D5B3F', letterSpacing: 1, marginBottom: 10 }}>
          SWITCH TRAINER
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {trainersList.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                await supabase.from('profiles').update({ trainer: t.id }).eq('id', profile.id)
                setProfile(prev => ({ ...prev, trainer: t.id }))
                localStorage.setItem('profile', JSON.stringify({ ...profile, trainer: t.id }))
              }}
              style={{
                flex: '1 1 0',
                minWidth: 48,
                padding: '10px 4px',
                borderRadius: 14,
                border: profile.trainer === t.id ? `2px solid ${t.color}50` : '1px solid rgba(110,231,183,0.06)',
                background: profile.trainer === t.id ? `${t.color}15` : 'rgba(14,20,14,0.4)',
                backdropFilter: 'blur(24px)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22 }}>{t.emoji}</div>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                marginTop: 3,
                color: profile.trainer === t.id ? t.color : '#2D5B3F',
              }}>
                {TRAINER_LABELS[t.id] || t.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
