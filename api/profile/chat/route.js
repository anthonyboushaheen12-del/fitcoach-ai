import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getTrainer, buildSystemPrompt } from '../../../lib/trainers'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { profileId, profile, trainerId } = await request.json()

    const trainer = getTrainer(trainerId)
    const systemPrompt = buildSystemPrompt(trainer, profile)

    // Deactivate existing plans
    await supabase
      .from('plans')
      .update({ active: false })
      .eq('profile_id', profileId)

    // Generate Workout Plan
    const workoutResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt + `\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.`,
      messages: [{
        role: 'user',
        content: `Generate a complete workout plan for me based on my profile. 

Return ONLY a JSON object in this exact format:
{
  "name": "Plan name (e.g. Upper/Lower Split)",
  "daysPerWeek": 4,
  "split": ["Mon: Upper Push", "Tue: Lower", "Thu: Upper Pull", "Fri: Lower"],
  "todayName": "Upper Push",
  "todayExercises": [
    {"name": "Barbell Bench Press", "sets": "4x8-10", "rest": "90s"},
    {"name": "Incline Dumbbell Press", "sets": "3x10-12", "rest": "75s"}
  ],
  "days": [
    {
      "name": "Day 1 - Upper Push",
      "exercises": [
        {"name": "Barbell Bench Press", "sets": "4x8-10", "rest": "90s"},
        {"name": "Incline Dumbbell Press", "sets": "3x10-12", "rest": "75s"}
      ]
    }
  ]
}

Include all days with all exercises. Make todayExercises the first day's workout.`
      }],
    })

    let workoutPlan
    try {
      const workoutText = workoutResponse.content[0].text.trim()
      // Remove markdown code fences if present
      const cleanWorkout = workoutText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      workoutPlan = JSON.parse(cleanWorkout)
    } catch (parseErr) {
      console.error('Failed to parse workout plan:', parseErr)
      console.error('Raw response:', workoutResponse.content[0].text)
      // Fallback plan
      workoutPlan = {
        name: "Workout Plan",
        daysPerWeek: 4,
        split: ["Mon: Day 1", "Tue: Day 2", "Thu: Day 3", "Fri: Day 4"],
        todayName: "Full Body",
        todayExercises: [
          { name: "Barbell Squat", sets: "4x8", rest: "120s" },
          { name: "Bench Press", sets: "4x8", rest: "90s" },
          { name: "Barbell Row", sets: "4x8", rest: "90s" },
        ],
        days: [],
      }
    }

    // Save workout plan
    await supabase.from('plans').insert({
      profile_id: profileId,
      type: 'workout',
      content: workoutPlan,
      trainer: trainerId,
      active: true,
    })

    // Generate Meal Plan
    const mealResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt + `\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.`,
      messages: [{
        role: 'user',
        content: `Generate a daily meal plan for me based on my profile and goals.

Return ONLY a JSON object in this exact format:
{
  "name": "Cut Meal Plan",
  "dailyCalories": "2,000 cal",
  "protein": "135g",
  "carbs": "220g",
  "fats": "67g",
  "meals": [
    {"name": "Breakfast", "description": "4 eggs + 2 toast + avocado", "calories": 520, "protein": 32},
    {"name": "Lunch", "description": "Chicken breast + rice + veggies", "calories": 650, "protein": 45},
    {"name": "Snack", "description": "Greek yogurt + banana + honey", "calories": 280, "protein": 20},
    {"name": "Dinner", "description": "Salmon + sweet potato + salad", "calories": 580, "protein": 38}
  ]
}

Calculate appropriate calories and macros based on my stats and goal. Keep meals simple and practical.`
      }],
    })

    let mealPlan
    try {
      const mealText = mealResponse.content[0].text.trim()
      const cleanMeal = mealText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      mealPlan = JSON.parse(cleanMeal)
    } catch (parseErr) {
      console.error('Failed to parse meal plan:', parseErr)
      mealPlan = {
        name: "Meal Plan",
        dailyCalories: "2,000 cal",
        protein: "135g",
        carbs: "220g",
        fats: "67g",
        meals: [
          { name: "Breakfast", description: "Eggs + toast", calories: 500, protein: 30 },
          { name: "Lunch", description: "Chicken + rice", calories: 600, protein: 40 },
          { name: "Snack", description: "Yogurt + fruit", calories: 300, protein: 20 },
          { name: "Dinner", description: "Fish + vegetables", calories: 600, protein: 35 },
        ],
      }
    }

    // Save meal plan
    await supabase.from('plans').insert({
      profile_id: profileId,
      type: 'meal',
      content: mealPlan,
      trainer: trainerId,
      active: true,
    })

    return Response.json({ success: true, workout: workoutPlan, meal: mealPlan })
  } catch (error) {
    console.error('Generate plan error:', error)
    return Response.json(
      { error: 'Failed to generate plans', details: error.message },
      { status: 500 }
    )
  }
}
