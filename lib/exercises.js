const EXERCISE_IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const LOCAL_PATH = '/data/exercises.json'
const REMOTE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

let exerciseCache = null

export async function loadExercises() {
  if (exerciseCache) return exerciseCache

  try {
    const res = await fetch(LOCAL_PATH)
    if (res.ok) {
      exerciseCache = await res.json()
    }
  } catch {
    // fallback to GitHub
  }
  if (!exerciseCache) {
    try {
      const res = await fetch(REMOTE_URL)
      exerciseCache = await res.json()
    } catch (err) {
      console.error('Failed to load exercises:', err)
      return []
    }
  }
  return exerciseCache
}

export function searchExercises(exercises, query, limit = 20) {
  if (!exercises?.length || !query?.trim()) return exercises?.slice(0, limit) || []
  const q = query.toLowerCase().trim()
  return exercises
    .filter((e) => e.name?.toLowerCase().includes(q))
    .slice(0, limit)
}

export function findExercise(name, exercises) {
  if (!exercises || !name) return null

  const normalizedName = name.toLowerCase().trim()

  // Exact match first
  let match = exercises.find((e) => e.name?.toLowerCase() === normalizedName)
  if (match) return match

  // Fuzzy match: check if exercise name contains the search term or vice versa
  match = exercises.find(
    (e) =>
      e.name?.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(e.name?.toLowerCase() || '')
  )
  if (match) return match

  // Word-based match: split into words and find best overlap
  const searchWords = normalizedName.split(/\s+/).filter(Boolean)
  let bestMatch = null
  let bestScore = 0

  for (const exercise of exercises) {
    const exName = exercise.name?.toLowerCase() || ''
    const exerciseWords = exName.split(/\s+/)
    const score = searchWords.filter((w) =>
      exerciseWords.some((ew) => ew.includes(w) || w.includes(ew))
    ).length
    if (score > bestScore && score >= Math.min(2, searchWords.length)) {
      bestScore = score
      bestMatch = exercise
    }
  }

  return bestMatch
}

export function getExerciseImageUrl(exercise, imageIndex = 0) {
  if (!exercise || !exercise.images || !exercise.images[imageIndex]) return null
  return `${EXERCISE_IMAGE_BASE}${exercise.images[imageIndex]}`
}

export function getExerciseMuscles(exercise) {
  if (!exercise) return { primary: [], secondary: [] }
  return {
    primary: exercise.primaryMuscles || [],
    secondary: exercise.secondaryMuscles || [],
  }
}

export function getMusclesFromExerciseNames(names, exercises) {
  if (!names?.length || !exercises?.length) return { primary: [], secondary: [] }
  const primary = new Set()
  const secondary = new Set()
  for (const name of names) {
    const ex = findExercise(name, exercises)
    if (ex) {
      ;(ex.primaryMuscles || []).forEach((m) => primary.add(m))
      ;(ex.secondaryMuscles || []).forEach((m) => {
        if (!primary.has(m)) secondary.add(m)
      })
    }
  }
  return {
    primary: [...primary],
    secondary: [...secondary],
  }
}
