import { describe, it, expect } from 'vitest'
import {
  alignMealPlanToTargets,
  targetsFromGoalPlan,
} from './align-meal-plan-to-targets.js'

describe('alignMealPlanToTargets', () => {
  const targets = {
    calories: 2100,
    proteinG: 170,
    carbsG: 200,
    fatsG: 60,
  }

  it('scales drifted meal calories to match target sum', () => {
    const mealPlan = {
      name: 'Test',
      dailyCalories: 'wrong',
      protein: 'wrong',
      meals: [
        { name: 'A', calories: 400, protein: 30 },
        { name: 'B', calories: 600, protein: 40 },
        { name: 'C', calories: 500, protein: 25 },
      ],
    }
    const { mealPlan: out, meta } = alignMealPlanToTargets(mealPlan, targets)
    expect(meta.beforeSum).toBe(1500)
    const sum = out.meals.reduce((s, m) => s + m.calories, 0)
    expect(sum).toBe(2100)
    const pSum = out.meals.reduce((s, m) => s + (Number(m.protein) || 0), 0)
    expect(Math.round(pSum * 10) / 10).toBe(170)
    expect(out.dailyCalories).toBe('2,100 cal')
    expect(out.protein).toBe('170g')
    expect(out.carbs).toBe('200g')
    expect(out.fats).toBe('60g')
  })

  it('handles single meal', () => {
    const { mealPlan: out } = alignMealPlanToTargets(
      {
        meals: [{ name: 'One', calories: 500, protein: 40 }],
      },
      targets
    )
    expect(out.meals[0].calories).toBe(2100)
    expect(out.meals[0].protein).toBe(170)
  })

  it('distributes when all meal calories are zero', () => {
    const { mealPlan: out, meta } = alignMealPlanToTargets(
      {
        meals: [
          { name: 'A', calories: 0, protein: 0 },
          { name: 'B', calories: 0, protein: 0 },
        ],
      },
      targets
    )
    expect(meta.scaled).toBe(true)
    const sum = out.meals.reduce((s, m) => s + m.calories, 0)
    expect(sum).toBe(2100)
  })

  it('leaves empty meals but sets headers', () => {
    const { mealPlan: out, meta } = alignMealPlanToTargets(
      { meals: [], dailyCalories: 'x' },
      targets
    )
    expect(out.meals).toEqual([])
    expect(meta.scaled).toBe(false)
    expect(out.dailyCalories).toBe('2,100 cal')
  })

  it('no-ops when targets invalid', () => {
    const plan = { meals: [{ calories: 100 }], dailyCalories: '100 cal' }
    const { mealPlan: out } = alignMealPlanToTargets(plan, null)
    expect(out.meals[0].calories).toBe(100)
  })
})

describe('targetsFromGoalPlan', () => {
  it('parses nutrition strings and uses goalSummary calories', () => {
    const t = targetsFromGoalPlan(
      { dailyCalories: 2200 },
      { protein: '165g', carbs: '190g', fats: '70g' }
    )
    expect(t).toEqual({
      calories: 2200,
      proteinG: 165,
      carbsG: 190,
      fatsG: 70,
    })
  })

  it('returns null without dailyCalories', () => {
    expect(targetsFromGoalPlan({}, {})).toBe(null)
  })
})
