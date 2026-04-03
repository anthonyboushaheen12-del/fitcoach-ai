/**
 * Normalize goal-engine exercises for dashboard / ExerciseRow (name, sets, rest).
 * @param {object} ex
 */
function normalizeExercise(ex) {
  if (!ex || typeof ex !== 'object') {
    return { name: '', sets: '', rest: '90s' }
  }
  const name = typeof ex.name === 'string' ? ex.name : ''
  let sets = typeof ex.sets === 'string' ? ex.sets : ''
  const intensity =
    typeof ex.intensity === 'string' && ex.intensity.trim() ? ex.intensity.trim() : ''
  if (intensity && !sets.includes(intensity)) {
    sets = sets ? `${sets} · ${intensity}` : intensity
  }
  const rest =
    typeof ex.rest === 'string' && ex.rest.trim()
      ? ex.rest.trim()
      : '90s'
  return { name, sets, rest }
}

function normalizeWorkoutDays(days) {
  if (!Array.isArray(days)) return []
  return days.map((d) => ({
    name: typeof d?.name === 'string' ? d.name : 'Day',
    focus: typeof d?.focus === 'string' ? d.focus : undefined,
    exercises: Array.isArray(d?.exercises)
      ? d.exercises.map(normalizeExercise)
      : [],
  }))
}

/**
 * Build workout plan content compatible with generate-plan / dashboard.
 * @param {object} exerciseBlock - goal plan.exercise
 */
export function buildWorkoutPlanContent(exerciseBlock) {
  if (!exerciseBlock || typeof exerciseBlock !== 'object') return null

  const days = normalizeWorkoutDays(exerciseBlock.days)
  const first = days[0]
  const splitType =
    typeof exerciseBlock.splitType === 'string'
      ? exerciseBlock.splitType
      : 'Goal workout plan'

  const split = days.map((d) => d.name)
  const todayName = first?.name
    ? first.name.replace(/^Day \d+ —?\s*/i, '').trim() || first.name
    : 'Day 1'

  return {
    name: splitType,
    daysPerWeek: Math.min(7, Math.max(1, days.length || 4)),
    split,
    todayName,
    todayExercises: first?.exercises?.length ? first.exercises : [],
    days,
    cardio: Array.isArray(exerciseBlock.cardio) ? exerciseBlock.cardio : [],
    specialFocus: Array.isArray(exerciseBlock.specialFocus)
      ? exerciseBlock.specialFocus
      : [],
  }
}

/**
 * Build meal plan content compatible with existing meal cards.
 * @param {object} goalSummary
 * @param {object} nutritionBlock - goal plan.nutrition
 */
export function buildMealPlanContent(goalSummary, nutritionBlock) {
  if (!nutritionBlock || typeof nutritionBlock !== 'object') return null

  const objective =
    goalSummary && typeof goalSummary.objective === 'string'
      ? goalSummary.objective
      : 'Goal nutrition'

  const meals = Array.isArray(nutritionBlock.meals)
    ? nutritionBlock.meals.map((m) => ({
        name: typeof m?.name === 'string' ? m.name : 'Meal',
        emoji: typeof m?.emoji === 'string' ? m.emoji : undefined,
        description:
          typeof m?.description === 'string'
            ? m.description
            : String(m?.description ?? ''),
        calories:
          typeof m?.calories === 'number' ? m.calories : Number(m?.calories) || 0,
        protein:
          typeof m?.protein === 'number' ? m.protein : Number(m?.protein) || 0,
      }))
    : []

  return {
    name: `${objective} — Nutrition`,
    dailyCalories: nutritionBlock.dailyCalories ?? '—',
    protein: nutritionBlock.protein ?? '—',
    carbs: nutritionBlock.carbs ?? '—',
    fats: nutritionBlock.fats ?? '—',
    meals,
    keyRules: Array.isArray(nutritionBlock.keyRules)
      ? nutritionBlock.keyRules
      : [],
  }
}

/**
 * Apply goal plan to active workout + meal plans (client: pass supabase instance).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} profileId
 * @param {object} fullPlan - parsed API plan object
 * @param {string} trainerId
 */
export async function applyGoalToPlans(supabase, profileId, fullPlan, trainerId) {
  if (!supabase || !profileId || !fullPlan) {
    return { error: 'Missing supabase, profileId, or plan' }
  }

  const workoutContent = buildWorkoutPlanContent(fullPlan.exercise)
  const mealContent = buildMealPlanContent(fullPlan.goalSummary, fullPlan.nutrition)

  const { error: offW } = await supabase
    .from('plans')
    .update({ active: false })
    .eq('profile_id', profileId)
    .eq('type', 'workout')
  if (offW) return { error: offW.message }

  const { error: offM } = await supabase
    .from('plans')
    .update({ active: false })
    .eq('profile_id', profileId)
    .eq('type', 'meal')
  if (offM) return { error: offM.message }

  if (workoutContent) {
    const { error: wErr } = await supabase.from('plans').insert({
      profile_id: profileId,
      type: 'workout',
      content: workoutContent,
      trainer: trainerId,
      active: true,
    })
    if (wErr) return { error: wErr.message }
  }

  if (mealContent) {
    const { error: mErr } = await supabase.from('plans').insert({
      profile_id: profileId,
      type: 'meal',
      content: mealContent,
      trainer: trainerId,
      active: true,
    })
    if (mErr) return { error: mErr.message }
  }

  return { ok: true }
}
