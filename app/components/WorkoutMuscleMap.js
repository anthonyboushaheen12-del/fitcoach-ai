'use client'

import { useState, useEffect } from 'react'
import { loadExercises, getMusclesFromExerciseNames } from '../../lib/exercises'
import MuscleMap from './MuscleMap'

export default function WorkoutMuscleMap({ exerciseNames = [], view = 'both', size = 'small' }) {
  const [muscles, setMuscles] = useState({ primary: [], secondary: [] })

  useEffect(() => {
    if (!exerciseNames?.length) return
    let cancelled = false
    loadExercises().then((exercises) => {
      if (cancelled) return
      const names = exerciseNames.map((ex) => (typeof ex === 'string' ? ex : ex?.name)).filter(Boolean)
      setMuscles(getMusclesFromExerciseNames(names, exercises))
    })
    return () => { cancelled = true }
  }, [exerciseNames?.join(',')])

  if (!exerciseNames?.length) return null

  return (
    <MuscleMap
      highlightedMuscles={muscles.primary}
      secondaryMuscles={muscles.secondary}
      view={view}
      size={size}
    />
  )
}
