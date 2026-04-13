/**
 * Estimated daily calorie and macro targets from profile + training volume.
 * Shared by client (Plans UI) and server (generate-plan).
 */

function inferGoalKey(profile) {
  const g = String(profile?.goal || '').toLowerCase()
  if (g.includes('lose') || g.includes('fat') || g.includes('cut') || g.includes('lean')) return 'lose_fat'
  if (g.includes('muscle') || g.includes('bulk') || g.includes('gain') || g.includes('mass')) return 'build_muscle'
  return 'maintain'
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {Record<string, unknown> | null | undefined} workoutContent — plan JSON with daysPerWeek, etc.
 * @returns {{ calories: number, proteinG: number, carbsG: number, fatsG: number, note: string | null }}
 */
export function computeNutritionTargets(profile, workoutContent) {
  const w = Number(profile?.weight_kg)
  const h = Number(profile?.height_cm)
  const age = Number(profile?.age)
  const ageSafe = Number.isFinite(age) && age > 10 && age < 100 ? age : 30
  const gender = String(profile?.gender || '').toLowerCase()
  const goal = inferGoalKey(profile)

  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
    const proteinG = Number.isFinite(w) && w > 0 ? Math.round(w * 1.8) : 130
    return {
      calories: 2200,
      proteinG,
      carbsG: 220,
      fatsG: 70,
      note: 'Approximate defaults — add height and weight in your profile for tighter targets.',
    }
  }

  const bmr =
    gender === 'female' || gender === 'f'
      ? 10 * w + 6.25 * h - 5 * ageSafe - 161
      : 10 * w + 6.25 * h - 5 * ageSafe + 5

  const days = Number(workoutContent?.daysPerWeek)
  const daysSafe = Number.isFinite(days) && days >= 1 && days <= 7 ? days : 4
  const af = daysSafe >= 6 ? 1.725 : daysSafe >= 4 ? 1.55 : daysSafe >= 2 ? 1.375 : 1.2
  let tdee = bmr * af

  if (goal === 'lose_fat') tdee *= 0.82
  else if (goal === 'build_muscle') tdee *= 1.08

  const calories = Math.round(tdee / 50) * 50
  const proteinG = Math.round(goal === 'lose_fat' ? w * 2.0 : w * 1.8)
  const fatsG = Math.round((calories * 0.28) / 9)
  const carbsG = Math.max(80, Math.round((calories - proteinG * 4 - fatsG * 9) / 4))

  return { calories, proteinG, carbsG, fatsG, note: null }
}
