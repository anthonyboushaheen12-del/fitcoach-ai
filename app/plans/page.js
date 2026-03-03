'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockWorkout, mockMealPlan, mockProfile } from '../../lib/mock-data'

const glass = {
  background: 'rgba(14,20,14,0.55)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(110,231,183,0.07)',
  borderRadius: 22,
}

const TODAY_INDEX = 0 // Monday = index 0

export default function Plans() {
  const [view, setView] = useState('today')
  const [expanded, setExpanded] = useState(mockWorkout.days[TODAY_INDEX].name)
  const [checked, setChecked] = useState([])

  const toggleExercise = (key) =>
    setChecked(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])

  const toggleDay = (name) => setExpanded(prev => prev === name ? null : name)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '20px 18px 0' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#E2FBE8' }}>Coach</span>
          <span style={{
            fontSize: 13, fontWeight: 700, marginLeft: 5,
            background: 'linear-gradient(135deg, #F97316, #EC4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>AI</span>
        </h1>
        <p style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 500, marginTop: 3 }}>Your active programs</p>
      </div>

      {/* Toggle */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20,
        padding: '4px',
        background: 'rgba(14,20,14,0.55)',
        border: '1px solid rgba(110,231,183,0.07)',
        borderRadius: 14,
      }}>
        {['today', 'week'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '9px', borderRadius: 11, cursor: 'pointer',
            background: view === v ? 'rgba(110,231,183,0.12)' : 'transparent',
            border: view === v ? '1px solid rgba(110,231,183,0.2)' : '1px solid transparent',
            color: view === v ? '#6EE7B7' : '#2D5B3F',
            fontSize: 13, fontWeight: 700,
            transition: 'all 0.2s ease',
          }}>
            {v === 'today' ? 'Today' : 'Full Week'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── TODAY VIEW ─── */}
        {view === 'today' && (
          <motion.div
            key="today"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Workout card */}
            <div style={{ ...glass, padding: 0, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #F97316, #EC4899)' }} />
              <div style={{ padding: '16px 18px 18px' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#E2FBE8' }}>
                    {mockWorkout.todayName}
                  </div>
                  <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 2 }}>
                    {mockWorkout.exercises.length} exercises
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mockWorkout.exercises.map((ex, i) => {
                    const key = `today-${i}`
                    const done = checked.includes(key)
                    return (
                      <div key={i} onClick={() => toggleExercise(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                        <AnimatePresence mode="wait">
                          {done ? (
                            <motion.div key="chk"
                              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                              style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, color: '#070B07', fontWeight: 800,
                              }}>✓</motion.div>
                          ) : (
                            <motion.div key="num"
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(110,231,183,0.08)',
                                border: '1px solid rgba(110,231,183,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, color: '#6EE7B7', fontWeight: 700,
                              }}>{i + 1}</motion.div>
                          )}
                        </AnimatePresence>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: done ? '#2D5B3F' : '#D1FAE5',
                            textDecoration: done ? 'line-through' : 'none',
                            transition: 'all 0.2s',
                          }}>{ex.name}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>{ex.sets}</div>
                          {ex.rest !== '-' && <div style={{ fontSize: 10, color: '#2D5B3F', marginTop: 1 }}>Rest {ex.rest}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Meal plan */}
            <NutritionCard />
          </motion.div>
        )}

        {/* ─── FULL WEEK VIEW ─── */}
        {view === 'week' && (
          <motion.div
            key="week"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {mockWorkout.days.map((day, di) => {
                const isToday = di === TODAY_INDEX
                const isOpen = expanded === day.name
                return (
                  <div key={di} style={{
                    ...glass,
                    borderRadius: 18, overflow: 'hidden',
                    border: isToday
                      ? '1px solid rgba(110,231,183,0.25)'
                      : '1px solid rgba(110,231,183,0.07)',
                    boxShadow: isToday ? '0 0 20px rgba(110,231,183,0.08)' : 'none',
                  }}>
                    {isToday && <div style={{ height: 2, background: 'linear-gradient(90deg, #10B981, #6EE7B7)' }} />}

                    <button onClick={() => toggleDay(day.name)} style={{
                      width: '100%', padding: '14px 16px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? '#6EE7B7' : '#D1FAE5' }}>
                          {day.name}
                          {isToday && <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 700,
                            color: '#6EE7B7', background: 'rgba(110,231,183,0.1)',
                            border: '1px solid rgba(110,231,183,0.2)',
                            padding: '2px 7px', borderRadius: 100,
                          }}>TODAY</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 2 }}>
                          {day.exercises.length} exercises
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ color: '#2D5B3F', fontSize: 12, flexShrink: 0 }}
                      >▾</motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            borderTop: '1px solid rgba(110,231,183,0.06)',
                            padding: '12px 16px 14px',
                            display: 'flex', flexDirection: 'column', gap: 10,
                          }}>
                            {day.exercises.map((ex, ei) => {
                              const key = `${di}-${ei}`
                              const done = checked.includes(key)
                              return (
                                <div key={ei} onClick={() => toggleExercise(key)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                  <AnimatePresence mode="wait">
                                    {done ? (
                                      <motion.div key="chk"
                                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                        style={{
                                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                          background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: 11, color: '#070B07', fontWeight: 800,
                                        }}>✓</motion.div>
                                    ) : (
                                      <motion.div key="num"
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        style={{
                                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                          background: 'rgba(110,231,183,0.06)',
                                          border: '1px solid rgba(110,231,183,0.12)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: 10, color: '#6EE7B7', fontWeight: 700,
                                        }}>{ei + 1}</motion.div>
                                    )}
                                  </AnimatePresence>
                                  <div style={{ flex: 1 }}>
                                    <span style={{
                                      fontSize: 13, fontWeight: 600,
                                      color: done ? '#2D5B3F' : '#D1FAE5',
                                      textDecoration: done ? 'line-through' : 'none',
                                    }}>{ex.name}</span>
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>{ex.sets}</div>
                                    {ex.rest !== '-' && <div style={{ fontSize: 10, color: '#2D5B3F' }}>Rest {ex.rest}</div>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            <NutritionCard />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function NutritionCard() {
  return (
    <div style={{
      background: 'rgba(14,20,14,0.55)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(110,231,183,0.07)',
      borderRadius: 22, overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{ padding: '16px 18px 10px', borderBottom: '1px solid rgba(110,231,183,0.05)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#E2FBE8' }}>Nutrition Plan</div>
        <div style={{ fontSize: 12, color: '#2D5B3F', marginTop: 1 }}>
          {mockMealPlan.dailyCalories} kcal · {mockMealPlan.protein} protein · {mockMealPlan.carbs} carbs · {mockMealPlan.fats} fats
        </div>
      </div>
      {mockMealPlan.meals.map((meal, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 18px',
          borderBottom: i < mockMealPlan.meals.length - 1 ? '1px solid rgba(110,231,183,0.04)' : 'none',
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{meal.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{meal.name}</div>
            <div style={{ fontSize: 11, color: '#2D5B3F', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.description}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E2FBE8' }}>{meal.calories}</div>
            <div style={{ fontSize: 10, color: '#2D5B3F' }}>{meal.protein}g P</div>
          </div>
        </div>
      ))}
    </div>
  )
}
