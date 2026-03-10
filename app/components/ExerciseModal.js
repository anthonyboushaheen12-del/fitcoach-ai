'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadExercises, findExercise, getExerciseImageUrl, getExerciseMuscles } from '../../lib/exercises'
import MuscleMap from './MuscleMap'

const EQUIPMENT_EMOJI = {
  barbell: '🏋️',
  dumbbell: '🏋️',
  kettlebell: '🥎',
  cable: '🔗',
  body_only: '🧍',
  bands: '🧲',
  machine: '⚙️',
  e_z_curl_bar: '🏋️',
  other: '📦',
}

export default function ExerciseModal({ open, onClose, exerciseName, sets, rest }) {
  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState({ 0: false, 1: false })

  useEffect(() => {
    if (!open || !exerciseName) {
      setExercise(null)
      setLoading(true)
      setImageErrors({ 0: false, 1: false })
      return
    }

    let cancelled = false
    async function load() {
      try {
        const exercises = await loadExercises()
        if (cancelled) return
        const found = findExercise(exerciseName, exercises)
        setExercise(found)
      } catch (err) {
        console.error('Exercise load:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, exerciseName])

  if (!open) return null

  const muscles = exercise ? getExerciseMuscles(exercise) : { primary: [], secondary: [] }
  const equipment = exercise?.equipment?.toLowerCase?.() || 'other'
  const emoji = EQUIPMENT_EMOJI[equipment] || EQUIPMENT_EMOJI.other
  const img0 = exercise ? getExerciseImageUrl(exercise, 0) : null
  const img1 = exercise ? getExerciseImageUrl(exercise, 1) : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="glass"
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                {exercise?.name || exerciseName}
              </h2>
              {(sets || rest) && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#6EE7B7' }}>
                  {sets && <span>{sets}</span>}
                  {sets && rest && <span> · </span>}
                  {rest && <span>Rest {rest}</span>}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'rgba(110,231,183,0.1)',
                border: '1px solid rgba(110,231,183,0.2)',
                color: '#6EE7B7',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, minHeight: 100 }}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    aspectRatio: 4 / 3,
                    borderRadius: 14,
                    background: 'rgba(110,231,183,0.08)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : exercise ? (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {[0, 1].map((i) => {
                  const url = i === 0 ? img0 : img1
                  const failed = imageErrors[i]
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        aspectRatio: 4 / 3,
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid rgba(110,231,183,0.15)',
                        background: failed || !url ? 'rgba(110,231,183,0.06)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {url && !failed ? (
                        <img
                          src={url}
                          alt={i === 0 ? 'Start' : 'End'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={() => setImageErrors((p) => ({ ...p, [i]: true }))}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: '#2D5B3F', textAlign: 'center', padding: 8 }}>
                          {exercise.name}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {muscles.primary.map((m) => (
                  <span
                    key={m}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: 'rgba(16,185,129,0.25)',
                      border: '1px solid rgba(110,231,183,0.3)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6EE7B7',
                      textTransform: 'capitalize',
                    }}
                  >
                    {m}
                  </span>
                ))}
                {muscles.secondary.map((m) => (
                  <span
                    key={m}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: 'rgba(110,231,183,0.08)',
                      border: '1px solid rgba(110,231,183,0.1)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#2D5B3F',
                      textTransform: 'capitalize',
                    }}
                  >
                    {m}
                  </span>
                ))}
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: 'rgba(110,231,183,0.08)',
                    border: '1px solid rgba(110,231,183,0.1)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#2D5B3F',
                  }}
                >
                  {emoji} {exercise.equipment}
                </span>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: 'rgba(110,231,183,0.08)',
                    border: '1px solid rgba(110,231,183,0.1)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#2D5B3F',
                    textTransform: 'capitalize',
                  }}
                >
                  {exercise.level}
                </span>
                {exercise.force && (
                  <span style={{ fontSize: 10, color: '#1F4030', alignSelf: 'center' }}>
                    {exercise.force}
                  </span>
                )}
              </div>

              <MuscleMap
                highlightedMuscles={muscles.primary}
                secondaryMuscles={muscles.secondary}
                view="both"
                size="small"
              />

              {exercise.instructions?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Instructions</div>
                  <ol style={{ paddingLeft: 20, fontSize: 13, color: '#D1FAE5', lineHeight: 1.7 }}>
                    {exercise.instructions.map((step, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: '#2D5B3F', fontSize: 14 }}>
              No details found for this exercise. Displaying name only.
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
