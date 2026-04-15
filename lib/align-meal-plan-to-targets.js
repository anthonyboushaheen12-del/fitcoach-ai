/**
 * Snap generated meal plan numbers to computed nutrition targets (calories + macros).
 * Pure function; safe to run after LLM JSON parse.
 *
 * @param {Record<string, unknown>} mealPlan
 * @param {{ calories: number, proteinG: number, carbsG: number, fatsG: number, note?: string | null } | null | undefined} targets
 * @returns {{ mealPlan: Record<string, unknown>, meta: { scaled: boolean, beforeSum: number, afterSum: number } }}
 */
export function alignMealPlanToTargets(mealPlan, targets) {
  const emptyMeta = { scaled: false, beforeSum: 0, afterSum: 0 }
  if (!mealPlan || typeof mealPlan !== 'object') {
    return { mealPlan: mealPlan || {}, meta: emptyMeta }
  }

  const c = Number(targets?.calories)
  const p = Number(targets?.proteinG)
  const carb = Number(targets?.carbsG)
  const f = Number(targets?.fatsG)
  if (![c, p, carb, f].every((n) => Number.isFinite(n) && n > 0)) {
    return { mealPlan: { ...mealPlan }, meta: emptyMeta }
  }

  const out = { ...mealPlan }
  out.dailyCalories = formatCaloriesHeader(c)
  out.protein = formatGramsHeader(p)
  out.carbs = formatGramsHeader(carb)
  out.fats = formatGramsHeader(f)

  const mealsRaw = Array.isArray(mealPlan.meals) ? mealPlan.meals : []
  if (mealsRaw.length === 0) {
    return {
      mealPlan: out,
      meta: { scaled: false, beforeSum: 0, afterSum: 0 },
    }
  }

  const meals = mealsRaw.map((m) => (m && typeof m === 'object' ? { ...m } : {}))
  let beforeSum = 0
  for (const m of meals) {
    const cal = Number(m.calories)
    beforeSum += Number.isFinite(cal) && cal > 0 ? cal : 0
  }

  const n = meals.length
  let scaled = false

  if (beforeSum > 0) {
    const factor = c / beforeSum
    scaled = Math.abs(factor - 1) > 1e-6
    for (const m of meals) {
      const cal0 = Number(m.calories)
      const calSafe = Number.isFinite(cal0) && cal0 > 0 ? cal0 : 0
      const pr0 = Number(m.protein)
      const hasProt = Number.isFinite(pr0) && pr0 >= 0
      m.calories = calSafe > 0 ? Math.max(1, Math.round(calSafe * factor)) : Math.max(1, Math.round(c / n))
      if (hasProt) {
        m.protein = Math.max(0, Math.round(pr0 * factor * 10) / 10)
      }
    }
  } else {
    scaled = true
    const per = Math.max(1, Math.round(c / n))
    const perP = Math.max(0, Math.round((p / n) * 10) / 10)
    for (const m of meals) {
      m.calories = per
      if ('protein' in m || mealsRaw.some((x) => x && typeof x === 'object' && 'protein' in x)) {
        m.protein = perP
      }
    }
  }

  snapMealCaloriesToTotal(meals, c)
  snapMealProteinToTotal(meals, p)

  const afterSum = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0)
  out.meals = meals

  return {
    mealPlan: out,
    meta: { scaled, beforeSum, afterSum },
  }
}

function formatCaloriesHeader(n) {
  const r = Math.round(n)
  return `${r.toLocaleString('en-US')} cal`
}

function formatGramsHeader(n) {
  return `${Math.round(n)}g`
}

/**
 * Fix rounding so meal calories sum to targetCal exactly (adjust largest meal).
 * @param {Record<string, unknown>[]} meals
 * @param {number} targetCal
 */
function snapMealCaloriesToTotal(meals, targetCal) {
  if (!meals.length) return
  let sum = 0
  for (const m of meals) {
    const v = Number(m.calories)
    sum += Number.isFinite(v) ? v : 0
  }
  let diff = Math.round(targetCal) - sum
  if (diff === 0) return
  let idx = 0
  let best = -1
  meals.forEach((m, i) => {
    const v = Number(m.calories) || 0
    if (v > best) {
      best = v
      idx = i
    }
  })
  const cur = Number(meals[idx].calories) || 0
  meals[idx].calories = Math.max(1, cur + diff)
}

/**
 * @param {Record<string, unknown>[]} meals
 * @param {number} targetProt
 */
function snapMealProteinToTotal(meals, targetProt) {
  const indices = meals.map((_, i) => i)
    .filter((i) => {
      const m = meals[i]
      return m && typeof m === 'object' && 'protein' in m && Number.isFinite(Number(m.protein))
    })
  if (!indices.length) return

  const target = Math.round(targetProt * 10) / 10
  let sum = 0
  for (const i of indices) {
    sum += Number(meals[i].protein) || 0
  }

  if (sum <= 0) {
    const per = Math.max(0, Math.round((target / indices.length) * 10) / 10)
    for (const i of indices) {
      meals[i].protein = per
    }
  } else {
    const factor = target / sum
    for (const i of indices) {
      const v = Number(meals[i].protein) || 0
      meals[i].protein = Math.max(0, Math.round(v * factor * 10) / 10)
    }
  }

  let newSum = 0
  for (const i of indices) {
    newSum += Number(meals[i].protein) || 0
  }
  const diff = Math.round((target - newSum) * 10) / 10
  if (diff === 0) return

  let idx = indices[0]
  let best = -1
  for (const i of indices) {
    const p = Number(meals[i].protein) || 0
    if (p > best) {
      best = p
      idx = i
    }
  }
  const cur = Number(meals[idx].protein) || 0
  meals[idx].protein = Math.max(0, Math.round((cur + diff) * 10) / 10)
}

/**
 * Build numeric targets for aligner from goal-engine JSON (goalSummary + nutrition).
 * @param {Record<string, unknown> | null | undefined} goalSummary
 * @param {Record<string, unknown> | null | undefined} nutritionBlock
 * @returns {{ calories: number, proteinG: number, carbsG: number, fatsG: number } | null}
 */
export function targetsFromGoalPlan(goalSummary, nutritionBlock) {
  const dc = Number(goalSummary?.dailyCalories)
  if (!Number.isFinite(dc) || dc <= 0) return null

  let p = parseMacroGrams(nutritionBlock?.protein)
  let carb = parseMacroGrams(nutritionBlock?.carbs)
  let f = parseMacroGrams(nutritionBlock?.fats)

  if (!Number.isFinite(p) || p <= 0) {
    p = Math.round((dc * 0.3) / 4)
  }
  if (!Number.isFinite(carb) || carb <= 0) {
    carb = Math.max(80, Math.round((dc * 0.4) / 4))
  }
  if (!Number.isFinite(f) || f <= 0) {
    f = Math.round((dc * 0.3) / 9)
  }

  return {
    calories: Math.round(dc),
    proteinG: Math.round(p),
    carbsG: Math.round(carb),
    fatsG: Math.round(f),
  }
}

function parseMacroGrams(val) {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val
  if (typeof val !== 'string') return NaN
  const m = val.replace(/,/g, '').match(/(\d+\.?\d*)/)
  if (!m) return NaN
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : NaN
}
