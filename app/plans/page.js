'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getTrainer } from '../../lib/trainers'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEAL_EMOJIS = ['🍳', '🥗', '🍌', '🥩']

export default function Plans() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('today')
  const [expandedDay, setExpandedDay] = useState(null)
  const [checkedExercises, setCheckedExercises] = useState({})

  useEffect(() => {
    const stored = localStorage.getItem('profile')
    if (!stored) { router.push('/'); return }
    const p = JSON.parse(stored)
    setProfile(p)
    loadPlans(p.id)
  }, [])

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
    const key = `${dayIdx}-${exIdx}`
    setCheckedExercises((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading || !profile) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#2D5B3F' }}>Loading plans...</div>
    )
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

  const getCheckedCount = (exercises, dayIdx) => {
    return exercises?.filter((_, exIdx) => checkedExercises[`${dayIdx}-${exIdx}`]).length || 0
  }
  const todayChecked = getCheckedCount(todayExercises, todayDayIndex)
  const todayTotal = todayExercises.length
  const allComplete = todayTotal > 0 && todayChecked === todayTotal

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span className="gradient-accent" style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>AI</span>
        </h1>
        <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>Your active programs</p>
      </div>

      {activeWorkout && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['today', 'week'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: view === v ? '2px solid rgba(110,231,183,0.4)' : '1px solid rgba(110,231,183,0.1)',
                  background: view === v ? 'rgba(110,231,183,0.1)' : 'transparent',
                  color: view === v ? '#6EE7B7' : '#2D5B3F',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {v === 'today' ? 'Today' : 'Full Week'}
              </button>
            ))}
          </div>

          {view === 'today' ? (
            <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #6EE7B7)' }} />
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  {todayWorkout?.name || activeWorkout.content?.todayName || "Today's Workout"}
                </div>
                <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 12 }}>
                  {todayExercises.length} exercises · Rest between sets as indicated
                </div>
                <div style={{ height: 6, borderRadius: 100, background: 'rgba(110,231,183,0.15)', marginBottom: 16, overflow: 'hidden' }}>
                  <motion.div
                    style={{
                      height: '100%',
                      width: `${(todayChecked / Math.max(todayTotal, 1)) * 100}%`,
                      background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
                      borderRadius: 100,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {allComplete && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      padding: 16,
                      background: 'rgba(110,231,183,0.1)',
                      borderRadius: 14,
                      textAlign: 'center',
                      marginBottom: 16,
                      border: '1px solid rgba(110,231,183,0.2)',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🎉</span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#6EE7B7', marginTop: 4 }}>Workout Complete!</div>
                  </motion.div>
                )}
                {todayExercises.map((ex, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: i < todayExercises.length - 1 ? '1px solid rgba(110,231,183,0.06)' : 'none',
                    }}
                  >
                    <button
                      onClick={() => toggleExercise(todayDayIndex, i)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        border: checkedExercises[`${todayDayIndex}-${i}`] ? 'none' : '2px solid rgba(110,231,183,0.3)',
                        background: checkedExercises[`${todayDayIndex}-${i}`] ? 'linear-gradient(135deg, #10B981, #6EE7B7)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginRight: 12,
                      }}
                    >
                      {checkedExercises[`${todayDayIndex}-${i}`] && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }} style={{ color: '#070B07', fontSize: 14 }}>✓</motion.span>
                      )}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#D1FAE5', textDecoration: checkedExercises[`${todayDayIndex}-${i}`] ? 'line-through' : 'none', opacity: checkedExercises[`${todayDayIndex}-${i}`] ? 0.7 : 1 }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#1F4030', marginTop: 2 }}>Rest {ex.rest || '60s'}</div>
                    </div>
                    <div className="gradient-green" style={{ fontSize: 13, fontWeight: 700 }}>{ex.sets}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {workoutDays.map((day, dayIdx) => {
                const isExpanded = expandedDay === dayIdx
                const isToday = dayIdx === todayDayIndex
                const exs = day.exercises || []
                const checked = getCheckedCount(exs, dayIdx)
                const total = exs.length
                const complete = total > 0 && checked === total

                return (
                  <motion.div
                    key={dayIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dayIdx * 0.05 }}
                    className="glass"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      border: isToday ? '2px solid rgba(110,231,183,0.35)' : '1px solid rgba(110,231,183,0.07)',
                      boxShadow: isToday ? '0 0 20px rgba(110,231,183,0.15)' : 'none',
                    }}
                  >
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}
                      style={{
                        width: '100%',
                        padding: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{day.name}</div>
                        <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 2 }}>
                          {exs.length} exercises
                          {complete && <span style={{ color: '#6EE7B7', marginLeft: 8 }}>✓ Done</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, color: '#6EE7B7' }}>{isExpanded ? '−' : '+'}</div>
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(110,231,183,0.06)' }}>
                        <div style={{ height: 4, borderRadius: 100, background: 'rgba(110,231,183,0.1)', marginBottom: 12, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(checked / Math.max(total, 1)) * 100}%`, background: 'linear-gradient(90deg, #10B981, #6EE7B7)', borderRadius: 100 }} />
                        </div>
                        {exs.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 0',
                              borderBottom: exIdx < exs.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none',
                            }}
                          >
                            <button
                              onClick={() => toggleExercise(dayIdx, exIdx)}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 8,
                                border: checkedExercises[`${dayIdx}-${exIdx}`] ? 'none' : '2px solid rgba(110,231,183,0.25)',
                                background: checkedExercises[`${dayIdx}-${exIdx}`] ? 'linear-gradient(135deg, #10B981, #6EE7B7)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                                flexShrink: 0,
                              }}
                            >
                              {checkedExercises[`${dayIdx}-${exIdx}`] && <span style={{ color: '#070B07', fontSize: 12 }}>✓</span>}
                            </button>
                            <div style={{ flex: 1, fontSize: 13, color: '#D1FAE5', textDecoration: checkedExercises[`${dayIdx}-${exIdx}`] ? 'line-through' : 'none', opacity: checkedExercises[`${dayIdx}-${exIdx}`] ? 0.7 : 1 }}>{ex.name}</div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#6EE7B7' }}>{ex.sets}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {!activeWorkout && (
        <div className="glass" style={{ padding: 24, textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏋️</div>
          <div style={{ color: '#2D5B3F', fontSize: 14 }}>No workout plan yet</div>
          <button onClick={() => router.push('/dashboard')} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(110,231,183,0.2)', background: 'rgba(110,231,183,0.08)', color: '#6EE7B7', fontSize: 13, fontWeight: 600 }}>Go to Dashboard</button>
        </div>
      )}

      {activeMeal && (
        <div className="glass" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #F97316, #FBBF24)' }} />
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              🥗 {activeMeal.content?.name || 'Meal Plan'}
            </div>
            <div style={{ fontSize: 12, color: '#2D5B3F', marginBottom: 12 }}>
              {activeMeal.content?.dailyCalories} · {activeMeal.content?.protein} protein
            </div>
            {activeMeal.content?.meals && activeMeal.content.meals.map((meal, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(110,231,183,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{MEAL_EMOJIS[i] || '🍽️'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{meal.name}</div>
                    <div style={{ fontSize: 11, color: '#1F4030' }}>{meal.description}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{meal.calories} cal</div>
                  <div className="gradient-accent" style={{ fontSize: 10, fontWeight: 600 }}>{meal.protein}g P</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeMeal && (
        <div className="glass" style={{ padding: 24, textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🥗</div>
          <div style={{ color: '#2D5B3F', fontSize: 14 }}>No meal plan yet</div>
        </div>
      )}

      <button onClick={() => router.push('/dashboard')} style={{
        width: '100%', padding: 14, borderRadius: 14,
        border: '1px solid rgba(249,115,22,0.2)',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(236,72,153,0.05))',
        color: '#FB923C', fontSize: 13, fontWeight: 700,
      }}>
        ↻ Regenerate plans from Dashboard
      </button>
    </div>
  )
}
