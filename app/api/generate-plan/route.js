import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getTrainer, buildSystemPrompt, buildOnboardingContextPrompt } from '../../../lib/trainers'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      profileId,
      profile,
      trainerId,
      onboardingContext,
      type = 'both',
      workoutPreferences = {},
      mealPreferences = {},
    } = body

    const trainer = getTrainer(trainerId || profile?.trainer)
    const systemPrompt = buildSystemPrompt(trainer, profile) + buildOnboardingContextPrompt(onboardingContext || profile?.onboarding_context)
    const supabase = getSupabase()

    const doWorkout = type === 'workout' || type === 'both'
    const doMeal = type === 'meal' || type === 'both'

    let workoutPlan = null
    let mealPlan = null

    if (doWorkout) {
      await supabase
        .from('plans')
        .update({ active: false })
        .eq('profile_id', profileId)
        .eq('type', 'workout')

      const wp = workoutPreferences
      const prefText = `
Generate a complete workout plan for me based on my profile AND these specific preferences:
- Experience Level: ${wp.experience || 'intermediate'}
- Available Days: ${wp.daysPerWeek || 4} days per week
- Training Focus: ${Array.isArray(wp.focus) ? wp.focus.join(', ') : (wp.focus || 'overall muscle building')}
- Equipment Available: ${Array.isArray(wp.equipment) ? wp.equipment.join(', ') : (wp.equipment || 'full gym')}
- Session Duration: ${wp.sessionDuration || '45-60 minutes'}
- Injuries/Limitations: ${wp.injuries || 'None'}
`

      const workoutResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt + '\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.',
        messages: [{
          role: 'user',
          content: prefText + `
Return ONLY a JSON object in this exact format:
{
  "name": "Plan name (e.g. Upper/Lower Split)",
  "daysPerWeek": 4,
  "split": ["Mon: Upper Push", "Tue: Lower", "Thu: Upper Pull", "Fri: Lower"],
  "todayName": "Upper Push",
  "todayExercises": [{"name": "Barbell Bench Press", "sets": "4x8-10", "rest": "90s"}],
  "days": [{"name": "Day 1 - Upper Push", "exercises": [{"name": "Barbell Bench Press", "sets": "4x8-10", "rest": "90s"}]}]
}
Include all days with all exercises. Make todayExercises match the first day.`,
        }],
      })

      try {
        const workoutText = workoutResponse.content[0].text.trim()
        const clean = workoutText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        workoutPlan = JSON.parse(clean)
      } catch (e) {
        workoutPlan = {
          name: 'Workout Plan',
          daysPerWeek: wp.daysPerWeek || 4,
          split: ['Mon: Day 1', 'Tue: Day 2', 'Thu: Day 3', 'Fri: Day 4'],
          todayName: 'Full Body',
          todayExercises: [
            { name: 'Barbell Squat', sets: '4x8', rest: '120s' },
            { name: 'Bench Press', sets: '4x8', rest: '90s' },
            { name: 'Barbell Row', sets: '4x8', rest: '90s' },
          ],
          days: [],
        }
      }

      await supabase.from('plans').insert({
        profile_id: profileId,
        type: 'workout',
        content: workoutPlan,
        trainer: trainerId || profile?.trainer,
        active: true,
      })

      await supabase.from('profiles').update({
        preferences: {
          ...(profile?.preferences || {}),
          workout: workoutPreferences,
        },
      }).eq('id', profileId)
    }

    if (doMeal) {
      await supabase
        .from('plans')
        .update({ active: false })
        .eq('profile_id', profileId)
        .eq('type', 'meal')

      const mp = mealPreferences
      const prefText = `
Generate a daily meal plan for me based on my profile AND these specific preferences:
- Dietary Preference: ${mp.diet || 'no restrictions'}
- Meals Per Day: ${mp.mealsPerDay || 4}
- Cooking Ability: ${mp.cookingAbility || 'moderate'}
- Allergies/Dislikes: ${mp.allergies || 'None'}
- Budget: ${mp.budget || 'moderate'}
`

      const mealResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt + '\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.',
        messages: [{
          role: 'user',
          content: prefText + `
Return ONLY a JSON object in this exact format:
{
  "name": "Cut Meal Plan",
  "dailyCalories": "2,000 cal",
  "protein": "135g",
  "carbs": "220g",
  "fats": "67g",
  "meals": [
    {"name": "Breakfast", "description": "4 eggs + 2 toast + avocado", "calories": 520, "protein": 32},
    {"name": "Lunch", "description": "Chicken breast + rice", "calories": 650, "protein": 45},
    {"name": "Snack", "description": "Greek yogurt + banana", "calories": 280, "protein": 20},
    {"name": "Dinner", "description": "Salmon + sweet potato", "calories": 580, "protein": 38}
  ]
}
Calculate appropriate calories and macros. Keep meals simple and practical.`,
        }],
      })

      try {
        const mealText = mealResponse.content[0].text.trim()
        const clean = mealText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        mealPlan = JSON.parse(clean)
      } catch (e) {
        mealPlan = {
          name: 'Meal Plan',
          dailyCalories: '2,000 cal',
          protein: '135g',
          carbs: '220g',
          fats: '67g',
          meals: [
            { name: 'Breakfast', description: 'Eggs + toast', calories: 500, protein: 30 },
            { name: 'Lunch', description: 'Chicken + rice', calories: 600, protein: 40 },
            { name: 'Snack', description: 'Yogurt + fruit', calories: 300, protein: 20 },
            { name: 'Dinner', description: 'Fish + vegetables', calories: 600, protein: 35 },
          ],
        }
      }

      await supabase.from('plans').insert({
        profile_id: profileId,
        type: 'meal',
        content: mealPlan,
        trainer: trainerId || profile?.trainer,
        active: true,
      })

      await supabase.from('profiles').update({
        preferences: {
          ...(profile?.preferences || {}),
          meal: mealPreferences,
        },
      }).eq('id', profileId)
    }

    return Response.json({
      success: true,
      workout: workoutPlan,
      meal: mealPlan,
    })
  } catch (error) {
    console.error('Generate plan error:', error)
    return Response.json(
      { error: 'Failed to generate plans', details: error.message },
      { status: 500 }
    )
  }
}
