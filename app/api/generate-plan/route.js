import Anthropic from '@anthropic-ai/sdk'
import { getTrainer, buildSystemPrompt, buildOnboardingContextPrompt } from '../../../lib/trainers'
import { createSupabaseRouteClient } from '../../../lib/supabase-api-route'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request) {
  let supabase
  try {
    supabase = createSupabaseRouteClient(request)
  } catch (e) {
    return Response.json(
      { success: false, error: 'Database auth failed', details: e.message },
      { status: 401 }
    )
  }

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

    if (!profileId) {
      return Response.json(
        { success: false, error: 'Missing profileId', details: 'profileId is required' },
        { status: 400 }
      )
    }

    if (!profile || typeof profile !== 'object') {
      return Response.json(
        { success: false, error: 'Missing profile', details: 'profile object is required' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { success: false, error: 'Server misconfiguration', details: 'ANTHROPIC_API_KEY is not set' },
        { status: 503 }
      )
    }

    const trainer = getTrainer(trainerId || profile?.trainer)
    const systemPrompt = buildSystemPrompt(trainer, profile) + buildOnboardingContextPrompt(onboardingContext || profile?.onboarding_context)

    const doWorkout = type === 'workout' || type === 'both'
    const doMeal = type === 'meal' || type === 'both'

    let workoutLogs = []
    let mealLogs = []
    try {
      const [workoutLogsRes, mealLogsRes] = await Promise.all([
        supabase.from('workout_logs').select('*').eq('profile_id', profileId).order('logged_at', { ascending: false }).limit(20),
        supabase.from('meal_logs').select('*').eq('profile_id', profileId).order('logged_at', { ascending: false }).limit(14),
      ])
      workoutLogs = workoutLogsRes.data || []
      mealLogs = mealLogsRes.data || []
    } catch (_) {
      // workout_logs table may not exist yet
    }
    const workoutActivityContext = workoutLogs.length > 0
      ? `\n\nUser's recent workouts (use to avoid redundancy or build on what they're doing):\n${workoutLogs.map((w) => {
          const exs = (w.exercises || []).map((e) => `${e.name} ${e.sets}x${e.reps}`).join(', ')
          return `${new Date(w.logged_at).toLocaleDateString()}: ${exs}`
        }).join('\n')}`
      : ''

    const mealActivityContext = mealLogs.length > 0
      ? `\n\nUser's recent meals (understand their eating patterns):\n${mealLogs.map((m) => `${m.meal_name}: ${m.total_calories} cal, ${m.total_protein}g P`).join('\n')}`
      : ''

    let workoutPlan = null
    let mealPlan = null

    if (doWorkout) {
      const { error: offWErr } = await supabase
        .from('plans')
        .update({ active: false })
        .eq('profile_id', profileId)
        .eq('type', 'workout')
      if (offWErr) {
        return Response.json(
          { success: false, error: 'Could not update workout plans', details: offWErr.message },
          { status: 500 }
        )
      }

      const wp = workoutPreferences
      const bodyGoalLine = wp.bodyGoalDescription
        ? `\n- Physique / aesthetic goal (from user): ${wp.bodyGoalDescription}`
        : ''
      const currentTrain =
        typeof wp.currentTraining === 'string' && wp.currentTraining.trim()
          ? wp.currentTraining.trim()
          : 'Not specified — assume they may be new or changing programs.'
      const currentPhys =
        typeof wp.currentPhysique === 'string' && wp.currentPhysique.trim()
          ? wp.currentPhysique.trim()
          : 'Not specified.'
      const prefText = `
Generate a complete workout plan for me based on my profile AND these specific preferences:${workoutActivityContext}

- How they currently train / their program: ${currentTrain}
- Their current physique (in their words): ${currentPhys}
- Experience Level: ${wp.experience || 'intermediate'}
- Available Days: ${wp.daysPerWeek || 4} days per week
- Training Focus: ${Array.isArray(wp.focus) ? wp.focus.join(', ') : (wp.focus || 'overall muscle building')}
- Equipment Available: ${Array.isArray(wp.equipment) ? wp.equipment.join(', ') : (wp.equipment || 'full gym')}
- Session Duration: ${wp.sessionDuration || '45-60 minutes'}
- Injuries/Limitations: ${wp.injuries || 'None'}${bodyGoalLine}

Use their CURRENT training and physique to avoid redundant work, respect what already works, and progress sensibly from where they are now.
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

      const { error: insWErr } = await supabase.from('plans').insert({
        profile_id: profileId,
        type: 'workout',
        content: workoutPlan,
        trainer: trainerId || profile?.trainer,
        active: true,
      })
      if (insWErr) {
        return Response.json(
          { success: false, error: 'Could not save workout plan', details: insWErr.message },
          { status: 500 }
        )
      }

      const { error: prefWErr } = await supabase.from('profiles').update({
        preferences: {
          ...(profile?.preferences || {}),
          workout: workoutPreferences,
        },
      }).eq('id', profileId)
      if (prefWErr) {
        return Response.json(
          { success: false, error: 'Could not save workout preferences', details: prefWErr.message },
          { status: 500 }
        )
      }
    }

    if (doMeal) {
      const { error: offMErr } = await supabase
        .from('plans')
        .update({ active: false })
        .eq('profile_id', profileId)
        .eq('type', 'meal')
      if (offMErr) {
        return Response.json(
          { success: false, error: 'Could not update meal plans', details: offMErr.message },
          { status: 500 }
        )
      }

      const mp = mealPreferences
      const mealBodyGoal = mp.bodyGoalDescription
        ? `\n- User physique / aesthetic goal context: ${mp.bodyGoalDescription}`
        : ''
      const prefText = `
Generate a daily meal plan for me based on my profile AND these specific preferences:${mealActivityContext}

- Dietary Preference: ${mp.diet || 'no restrictions'}
- Meals Per Day: ${mp.mealsPerDay || 4}
- Cooking Ability: ${mp.cookingAbility || 'moderate'}
- Allergies/Dislikes: ${mp.allergies || 'None'}
- Budget: ${mp.budget || 'moderate'}${mealBodyGoal}
`

      const mealResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
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

      const { error: insMErr } = await supabase.from('plans').insert({
        profile_id: profileId,
        type: 'meal',
        content: mealPlan,
        trainer: trainerId || profile?.trainer,
        active: true,
      })
      if (insMErr) {
        return Response.json(
          { success: false, error: 'Could not save meal plan', details: insMErr.message },
          { status: 500 }
        )
      }

      const { error: prefMErr } = await supabase.from('profiles').update({
        preferences: {
          ...(profile?.preferences || {}),
          meal: mealPreferences,
        },
      }).eq('id', profileId)
      if (prefMErr) {
        return Response.json(
          { success: false, error: 'Could not save meal preferences', details: prefMErr.message },
          { status: 500 }
        )
      }
    }

    return Response.json({
      success: true,
      workout: workoutPlan,
      meal: mealPlan,
    })
  } catch (error) {
    console.error('Generate plan error:', error)
    return Response.json(
      { success: false, error: 'Failed to generate plans', details: error.message },
      { status: 500 }
    )
  }
}
