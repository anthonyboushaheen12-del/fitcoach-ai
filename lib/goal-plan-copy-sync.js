/**
 * Rewrite dailyChecklist strings so calorie mentions match aligned nutrition targets.
 * @param {Record<string, unknown>} plan — full goal-engine plan object (mutated in place)
 * @param {{ calories: number }} targets */
export function syncGoalPlanCopyToNutritionTargets(plan, targets) {
  if (!plan || typeof plan !== 'object' || !targets) return
  const kcal = Math.round(Number(targets.calories))
  if (!Number.isFinite(kcal) || kcal <= 0) return

  const list = plan.dailyChecklist
  if (!Array.isArray(list)) return

  const formatted = kcal.toLocaleString('en-US')
  /** e.g. 2,100 cal | 2100 calories | 2100 kcal */
  const replaceCalTokens = (s) =>
    s
      .replace(/\b\d{1,2},\d{3}\s*(?:kcal|cal(?:ories)?)\b/gi, `${formatted} calories`)
      .replace(/\b\d{3,4}\s*(?:kcal|cal(?:ories)?)\b/gi, `${formatted} calories`)

  plan.dailyChecklist = list.map((item) => {
    if (typeof item !== 'string') return item
    return replaceCalTokens(item)
  })
}
