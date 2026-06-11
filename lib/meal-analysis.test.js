import { describe, it, expect } from 'vitest'
import {
  extractJsonObject,
  normalizeMealItem,
  normalizeMealAnalysis,
  foodItemFromMealAnalysis,
} from './meal-analysis'

describe('extractJsonObject', () => {
  it('parses plain JSON', () => {
    const obj = extractJsonObject('{"items":[]}')
    expect(obj).toEqual({ items: [] })
  })

  it('strips markdown fences', () => {
    const obj = extractJsonObject('```json\n{"mealLabel":"Lunch"}\n```')
    expect(obj?.mealLabel).toBe('Lunch')
  })

  it('extracts JSON from leading prose', () => {
    const obj = extractJsonObject('Here is the analysis:\n{"items":[{"name":"Egg"}]}')
    expect(Array.isArray(obj?.items)).toBe(true)
    expect(obj.items[0].name).toBe('Egg')
  })

  it('returns null for invalid input', () => {
    expect(extractJsonObject('')).toBeNull()
    expect(extractJsonObject('not json')).toBeNull()
  })
})

describe('normalizeMealItem', () => {
  it('maps standard fields', () => {
    const item = normalizeMealItem({
      name: 'Chicken breast',
      grams: 150,
      calories: 248,
      protein: 46,
      carbs: 0,
      fats: 5,
    })
    expect(item?.name).toBe('Chicken breast')
    expect(item?.grams).toBe(150)
    expect(item?.protein).toBe(46)
  })

  it('maps alias field names', () => {
    const item = normalizeMealItem({
      name: 'Rice',
      weight_g: 200,
      calories: 260,
      proteinG: 5,
      carbs_g: 56,
      fat: 1,
    })
    expect(item?.grams).toBe(200)
    expect(item?.protein).toBe(5)
    expect(item?.carbs).toBe(56)
    expect(item?.fats).toBe(1)
  })

  it('reads nested macros object', () => {
    const item = normalizeMealItem({
      name: 'Salad',
      grams: 100,
      macros: { calories: 80, protein_g: 4, carbs: 10, fatsG: 2 },
    })
    expect(item?.calories).toBe(80)
    expect(item?.protein).toBe(4)
  })
})

describe('normalizeMealAnalysis', () => {
  it('normalizes totals with snake_case aliases', () => {
    const a = normalizeMealAnalysis({
      meal_label: 'Breakfast',
      items: [{ name: 'Eggs', grams: 100, calories: 140, protein: 12, carbs: 1, fats: 10 }],
      total_calories: 140,
      total_protein_g: 12,
      confidence: 'high',
      notes: 'Looks good',
    })
    expect(a.mealLabel).toBe('Breakfast')
    expect(a.items).toHaveLength(1)
    expect(a.totalCalories).toBe(140)
    expect(a.totalProteinG).toBe(12)
  })

  it('sums totals from items when missing', () => {
    const a = normalizeMealAnalysis({
      items: [
        { name: 'A', grams: 100, calories: 100, protein: 10, carbs: 5, fats: 2 },
        { name: 'B', grams: 100, calories: 200, protein: 20, carbs: 10, fats: 4 },
      ],
    })
    expect(a.totalCalories).toBe(300)
    expect(a.totalProteinG).toBe(30)
  })

  it('returns empty items for invalid input', () => {
    const a = normalizeMealAnalysis(null)
    expect(a.items).toEqual([])
  })
})

describe('foodItemFromMealAnalysis', () => {
  it('computes per100g from portion macros', () => {
    const row = normalizeMealItem({
      name: 'Toast',
      grams: 50,
      calories: 80,
      protein: 3,
      carbs: 14,
      fats: 1,
    })
    const food = foodItemFromMealAnalysis(row, 'described')
    expect(food.per100g.calories).toBe(160)
    expect(food.per100g.protein).toBe(6)
    expect(food.servingSize).toContain('50g')
  })
})
