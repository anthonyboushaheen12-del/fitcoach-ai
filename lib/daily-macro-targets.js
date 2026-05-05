import { computeNutritionTargets } from './nutrition-targets'
import { parseDailyCaloriesNumber } from './meal-plan-summary'

function parseGramTarget(v) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v)
  return parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10) || 0
}

/**
 * Daily macro targets: saved meal plan wins; else profile + workout formula.
 * @param {Record<string, unknown> | null | undefined} mealContent
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {Record<string, unknown> | null | undefined} workoutContent
 */
export function getDailyMacroTargets(mealContent, profile, workoutContent) {
  if (mealContent && typeof mealContent === 'object') {
    const calN =
      typeof mealContent.dailyCalories === 'number' && Number.isFinite(mealContent.dailyCalories)
        ? Math.round(mealContent.dailyCalories)
        : parseDailyCaloriesNumber(mealContent.dailyCalories)
    const p = parseGramTarget(mealContent.protein)
    const c = parseGramTarget(mealContent.carbs)
    const f = parseGramTarget(mealContent.fats)

    if (Number.isFinite(calN) && calN > 0 && (p > 0 || c > 0 || f > 0)) {
      return {
        calories: calN,
        protein: p || Math.round((calN * 0.3) / 4),
        carbs: c || Math.max(80, Math.round((calN * 0.4) / 4)),
        fats: f || Math.round((calN * 0.3) / 9),
        source: 'plan',
        note: null,
      }
    }
    if (Number.isFinite(calN) && calN > 0) {
      const est = computeNutritionTargets(profile, workoutContent)
      return {
        calories: calN,
        protein: parseGramTarget(mealContent.protein) || est.proteinG,
        carbs: parseGramTarget(mealContent.carbs) || est.carbsG,
        fats: parseGramTarget(mealContent.fats) || est.fatsG,
        source: 'plan',
        note: null,
      }
    }
  }

  const est = computeNutritionTargets(profile, workoutContent)
  return {
    calories: est.calories,
    protein: est.proteinG,
    carbs: est.carbsG,
    fats: est.fatsG,
    source: 'estimated',
    note: est.note,
  }
}
