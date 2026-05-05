'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import ExerciseRow from './ExerciseRow'

const WorkoutMuscleMap = dynamic(() => import('./WorkoutMuscleMap'), { ssr: false, loading: () => null })

export default function WorkoutHubCard({
  router,
  workoutContent,
  hasWorkoutPlan,
  recentWorkouts,
  onOpenLogWorkout,
  cardDelay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardDelay / 1000 }}
      style={{ marginBottom: 14 }}
    >
      {workoutContent && workoutContent.todayExercises ? (
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #10B981, #F97316, #EC4899)' }} />
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid rgba(110,231,183,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>WORKOUT</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>Today</div>
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
          <div style={{ padding: '12px 18px 16px' }}>
            {workoutContent.todayExercises.slice(0, 6).map((ex, i) => (
              <ExerciseRow
                key={i}
                name={ex.name}
                sets={ex.sets}
                rest={ex.rest}
                index={i + 1}
                isLast={i >= Math.min(6, workoutContent.todayExercises.length) - 1}
              />
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => router.push('/plans')}
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
                Open program &amp; coach
              </button>
              <button
                type="button"
                onClick={onOpenLogWorkout}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(110,231,183,0.28)',
                  background: 'rgba(16,185,129,0.12)',
                  color: '#6EE7B7',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Log what I did
              </button>
              {hasWorkoutPlan && (
                <button
                  type="button"
                  onClick={() => router.push('/plans?edit=workout')}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 12,
                    border: '1px solid rgba(110,231,183,0.15)',
                    background: 'transparent',
                    color: '#A7C4B8',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Quick-edit exercises
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass" style={{ padding: 20, border: '1px dashed rgba(110,231,183,0.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>WORKOUT</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 8 }}>Today</div>
          <p style={{ fontSize: 12, color: '#94A89E', marginTop: 8, lineHeight: 1.45 }}>
            {hasWorkoutPlan
              ? 'No session template for today — log a workout or open your program.'
              : 'Build a program with your trainer, or log any session you did.'}
          </p>
          {recentWorkouts.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 700, marginBottom: 6 }}>Recent</div>
              {recentWorkouts.slice(0, 2).map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: 10,
                    background: 'rgba(14,20,14,0.5)',
                    borderRadius: 10,
                    marginBottom: 6,
                    fontSize: 11,
                    color: '#D1FAE5',
                  }}
                >
                  {new Date(w.logged_at).toLocaleDateString()} · {(w.exercises || []).slice(0, 2).map((e) => e.name).join(', ')}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={onOpenLogWorkout}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(110,231,183,0.3)',
                background: 'rgba(16,185,129,0.2)',
                color: '#6EE7B7',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Log workout
            </button>
            <button
              type="button"
              onClick={() => router.push('/plans')}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Program
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
