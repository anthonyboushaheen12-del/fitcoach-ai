import { describe, it, expect } from 'vitest'
import { mealPlanAuthoritativeSummary } from './meal-plan-summary.js'
import { syncGoalPlanCopyToNutritionTargets } from './goal-plan-copy-sync.js'

describe('mealPlanAuthoritativeSummary', () => {
  it('formats string dailyCalories and macros', () => {
    const s = mealPlanAuthoritativeSummary({
      dailyCalories: '2,400 cal',
      protein: '180g',
      carbs: '220g',
      fats: '65g',
    })
    expect(s).toContain('2,400 cal')
    expect(s).toContain('180g')
    expect(s).toContain('Authoritative daily targets')
  })

  it('returns empty for null', () => {
    expect(mealPlanAuthoritativeSummary(null)).toBe('')
  })
})

describe('syncGoalPlanCopyToNutritionTargets', () => {
  it('rewrites checklist calorie tokens', () => {
    const plan = {
      dailyChecklist: ['Hit 2,100 calories (±100)', 'Eat 2100 kcal daily', 'Protein 170g'],
    }
    syncGoalPlanCopyToNutritionTargets(plan, { calories: 2400 })
    expect(plan.dailyChecklist[0]).toContain('2,400')
    expect(plan.dailyChecklist[1]).toContain('2,400')
    expect(plan.dailyChecklist[2]).toBe('Protein 170g')
  })
})
