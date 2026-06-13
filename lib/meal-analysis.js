/** @typedef {{ name: string, grams: number, calories: number, protein: number, carbs: number, fats: number }} MealAnalysisItem */
/** @typedef {{ mealLabel: string, items: MealAnalysisItem[], totalCalories: number | null, totalProteinG: number | null, totalCarbsG: number | null, totalFatsG: number | null, confidence: string, notes: string }} MealAnalysis */

export const FALLBACK_MEAL_ANALYSIS = {
  mealLabel: 'Meal',
  items: [],
  totalCalories: null,
  totalProteinG: null,
  totalCarbsG: null,
  totalFatsG: null,
  confidence: 'low',
  notes: 'Could not parse this description. Try listing foods and rough amounts (e.g. 2 eggs, toast, coffee).',
}

export const FALLBACK_MEAL_PHOTO_ANALYSIS = {
  ...FALLBACK_MEAL_ANALYSIS,
  notes: 'Could not analyze this photo. Try a clearer shot with the full plate visible.',
}

function pickNumber(raw, keys) {
  if (!raw || typeof raw !== 'object') return null
  for (const k of keys) {
    const v = raw[k]
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickString(raw, keys, fallback = '') {
  if (!raw || typeof raw !== 'object') return fallback
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return fallback
}

import { extractJsonObject } from './llm-json'

export { extractJsonObject }

/**
 * @param {unknown} raw
 * @returns {MealAnalysisItem | null}
 */
export function normalizeMealItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const nested = raw.macros && typeof raw.macros === 'object' ? raw.macros : null
  const src = nested || raw

  const name = pickString(raw, ['name', 'food', 'label', 'item'], 'Food')
  const gramsRaw = pickNumber(raw, ['grams', 'weightG', 'weight_g', 'amountG', 'amount_g'])
  const grams = gramsRaw != null ? Math.max(1, Math.round(gramsRaw)) : 100

  const calories = pickNumber(src, ['calories', 'cal', 'kcal', 'energy']) ?? 0
  const protein = pickNumber(src, ['protein', 'proteinG', 'protein_g', 'proteinGrams']) ?? 0
  const carbs = pickNumber(src, ['carbs', 'carbsG', 'carbs_g', 'carbohydrates', 'carbohydratesG']) ?? 0
  const fats = pickNumber(src, ['fats', 'fat', 'fatsG', 'fats_g', 'fatG']) ?? 0

  if (!name && calories === 0 && protein === 0 && carbs === 0 && fats === 0) return null

  return {
    name: String(name || 'Food').slice(0, 120),
    grams,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fats: Math.round(fats * 10) / 10,
  }
}

/**
 * @param {unknown} raw
 * @returns {MealAnalysis}
 */
export function normalizeMealAnalysis(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...FALLBACK_MEAL_ANALYSIS }
  }

  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.foods)
      ? raw.foods
      : Array.isArray(raw.lineItems)
        ? raw.lineItems
        : []

  const items = itemsRaw.map(normalizeMealItem).filter(Boolean)

  let totalCalories = pickNumber(raw, ['totalCalories', 'total_calories', 'caloriesTotal'])
  let totalProteinG = pickNumber(raw, ['totalProteinG', 'total_protein_g', 'totalProtein', 'proteinTotal'])
  let totalCarbsG = pickNumber(raw, ['totalCarbsG', 'total_carbs_g', 'totalCarbs', 'carbsTotal'])
  let totalFatsG = pickNumber(raw, ['totalFatsG', 'total_fats_g', 'totalFats', 'fatsTotal'])

  if (items.length > 0) {
    if (totalCalories == null) totalCalories = items.reduce((s, it) => s + it.calories, 0)
    if (totalProteinG == null) totalProteinG = items.reduce((s, it) => s + it.protein, 0)
    if (totalCarbsG == null) totalCarbsG = items.reduce((s, it) => s + it.carbs, 0)
    if (totalFatsG == null) totalFatsG = items.reduce((s, it) => s + it.fats, 0)
  }

  const confidence = pickString(raw, ['confidence'], 'medium')
  const notes = pickString(raw, ['notes', 'note'], '')
  const mealLabel = pickString(raw, ['mealLabel', 'meal_label', 'label'], items.length ? 'Meal' : 'Meal')

  return {
    mealLabel,
    items,
    totalCalories: totalCalories != null ? Math.round(totalCalories) : null,
    totalProteinG: totalProteinG != null ? Math.round(totalProteinG * 10) / 10 : null,
    totalCarbsG: totalCarbsG != null ? Math.round(totalCarbsG * 10) / 10 : null,
    totalFatsG: totalFatsG != null ? Math.round(totalFatsG * 10) / 10 : null,
    confidence: ['high', 'medium', 'low'].includes(confidence) ? confidence : 'medium',
    notes,
  }
}

/**
 * Build a food-log line item from normalized meal analysis row.
 * @param {MealAnalysisItem} it
 * @param {string} portionLabel
 */
export function foodItemFromMealAnalysis(it, portionLabel = 'photo est.') {
  const g = Math.max(1, Math.round(Number(it.grams) || 100))
  const cal = Number(it.calories) || 0
  const p = Number(it.protein) || 0
  const cb = Number(it.carbs) || 0
  const f = Number(it.fats) || 0
  const scale = 100 / g
  return {
    name: String(it.name || 'Food').slice(0, 120),
    brand: '',
    image: null,
    servingSize: `${g}g (${portionLabel})`,
    per100g: {
      calories: cal * scale,
      protein: p * scale,
      carbs: cb * scale,
      fats: f * scale,
    },
  }
}
