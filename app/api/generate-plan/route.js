import Anthropic from '@anthropic-ai/sdk'
import { getTrainer, buildSystemPrompt, buildOnboardingContextPrompt } from '../../../lib/trainers'
import { createSupabaseRouteClient } from '../../../lib/supabase-api-route'
import { computeNutritionTargets } from '../../../lib/nutrition-targets'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const PROGRAM_ADJUSTMENTS_MAX = 2000

/** Re-activate plan rows after a failed insert (user was not stranded with all rows inactive). */
async function reactivatePlanIds(supabase, ids) {
  if (!ids?.length) return
  await supabase.from('plans').update({ active: true }).in('id', ids)
}

/** Free-form user instructions to change the program; empty if absent or invalid. */
function normalizeProgramAdjustments(raw) {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, PROGRAM_ADJUSTMENTS_MAX)
}

function normalizeClientNutritionTargets(raw) {
  if (!raw || typeof raw !== 'object') return null
  const c = Number(raw.calories)
  const p = Number(raw.proteinG ?? raw.protein)
  const carb = Number(raw.carbsG ?? raw.carbs)
  const f = Number(raw.fatsG ?? raw.fats)
  if (![c, p, carb, f].every((n) => Number.isFinite(n) && n > 0)) return null
  return {
    calories: Math.round(c),
    proteinG: Math.round(p),
    carbsG: Math.round(carb),
    fatsG: Math.round(f),
    note: typeof raw.note === 'string' ? raw.note : null,
  }
}

function formatNutritionBlock(targets) {
  if (!targets) return ''
  const note = targets.note ? `\n- Note: ${targets.note}` : ''
  return `
NUTRITION TARGETS (align daily totals closely to these — adjust meal sizes and food choices):
- Calories: ~${targets.calories} kcal/day
- Protein: ~${targets.proteinG} g/day
- Carbs: ~${targets.carbsG} g/day
- Fats: ~${targets.fatsG} g/day${note}
`
}

function summarizeWorkoutForMeals(content) {
  if (!content || typeof content !== 'object') return ''
  const name = typeof content.name === 'string' ? content.name : 'Workout program'
  const d = content.daysPerWeek
  const days = Number.isFinite(Number(d)) ? `${d} days/week` : 'training plan'
  const split = Array.isArray(content.split) ? content.split.slice(0, 4).join('; ') : ''
  return `- Program: ${name} (${days})${split ? `\n- Split: ${split}` : ''}`
}

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
      bodyAnalysis = null,
      programAdjustments = null,
      nutritionTargets: clientNutritionTargets = null,
      pantryDescription = '',
      eatingToday = '',
      workoutContentContext = null,
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

    const adjustmentsText = normalizeProgramAdjustments(
      programAdjustments != null ? String(programAdjustments) : ''
    )
    const adjustmentBlock = adjustmentsText
      ? `

USER-REQUESTED PROGRAM CHANGES (honor these closely while staying consistent with their profile, goals, and safety; do not add extreme cuts, banned substances, or unsafe advice):
${adjustmentsText}
`
      : ''

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
      const { data: prevWorkoutRows } = await supabase
        .from('plans')
        .select('id')
        .eq('profile_id', profileId)
        .eq('type', 'workout')
        .eq('active', true)
      const prevWorkoutPlanIds = (prevWorkoutRows || []).map((r) => r.id)

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
      const equipArr = Array.isArray(wp.equipment) ? wp.equipment : []
      const bodyweightMode =
        equipArr.includes('bodyweight') ||
        equipArr.includes('home_gym') ||
        equipArr.includes('rings')
      const skillGoalsArr = Array.isArray(wp.bodyweightSkillGoals) ? wp.bodyweightSkillGoals : []
      const skillGoalsLine =
        skillGoalsArr.length > 0
          ? `\n- Bodyweight / calisthenics skill targets (from quiz): ${skillGoalsArr.join(', ')}`
          : ''
      const bodyweightRules = bodyweightMode
        ? `

CRITICAL — BODYWEIGHT / CALISTHENICS / RINGS MODE:
- Program skill-appropriate progressions only. Respect the hierarchy (foundations before levers/planche/muscle-up). Never assign advanced skills (e.g. full planche, full front lever) to beginners or low experience levels.
- Tendons and connective tissue adapt slower than muscle — do not rush stages; spell out progression timelines (e.g. tuck hold before straddle).
- Core / "inner unit" work: cap dedicated ab compression and heavy skill-core work at 3-4 sessions per week maximum, not daily.
- If rings are in their equipment, include ring progressions where appropriate (support holds, dips, rows, push-ups, levers as level allows) and leverage instability thoughtfully.
- If they only have bodyweight / minimal equipment, do NOT default to dumbbell- or machine-heavy programs; prioritize bodyweight, bar work, and environment-friendly options.${skillGoalsLine}`
        : `${skillGoalsLine}`

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
${bodyweightRules}
`
      let bodyAnalysisBlock = ''
      if (bodyAnalysis && typeof bodyAnalysis === 'object') {
        const ba = bodyAnalysis
        const strengths = Array.isArray(ba.strengths) ? ba.strengths.join('; ') : ''
        const areas = Array.isArray(ba.areasToImprove) ? ba.areasToImprove.join('; ') : ''
        const muscle =
          ba.muscleAssessment && typeof ba.muscleAssessment === 'object'
            ? JSON.stringify(ba.muscleAssessment)
            : ''
        bodyAnalysisBlock = `

BODY ANALYSIS FROM PROGRESS PHOTO:
- Estimated Body Fat (approximate range): ${ba.bodyFatEstimate || 'not specified'}
- Build Type: ${ba.buildType || 'not specified'}
- Overall: ${ba.overallRating || '—'}
- Strengths: ${strengths || '—'}
- Areas to Improve: ${areas || '—'}
- Muscle Assessment (visible areas): ${muscle || '—'}
- Recommended Focus (from vision): ${ba.recommendedFocus || '—'}
- Estimated Training Age (visual): ${ba.estimatedTrainingAge || '—'}
- Posture Notes: ${ba.postureNotes || '—'}

Use this analysis to prioritize exercises for weaker or lagging areas. If a muscle group is "underdeveloped", add volume or priority for that region. If chest is underdeveloped, prioritize chest-focused movements. If posture issues are noted, include appropriate corrective or prehab work. Do not contradict safe training; when the photo did not show a body part, rely on the user's quiz answers.
`
      }

      const workoutPromptFull = prefText + bodyAnalysisBlock + adjustmentBlock

      let workoutRowInserted = false
      try {
        const workoutResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt + '\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.',
          messages: [{
            role: 'user',
            content: workoutPromptFull + `
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
          await reactivatePlanIds(supabase, prevWorkoutPlanIds)
          return Response.json(
            { success: false, error: 'Could not save workout plan', details: insWErr.message },
            { status: 500 }
          )
        }
        workoutRowInserted = true

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
      } catch (workoutErr) {
        if (!workoutRowInserted) await reactivatePlanIds(supabase, prevWorkoutPlanIds)
        throw workoutErr
      }
    }

    if (doMeal) {
      let workoutCtx = null
      if (doWorkout && workoutPlan) {
        workoutCtx = workoutPlan
      } else if (workoutContentContext && typeof workoutContentContext === 'object') {
        workoutCtx = workoutContentContext
      } else {
        const { data: wActive, error: wActiveErr } = await supabase
          .from('plans')
          .select('content')
          .eq('profile_id', profileId)
          .eq('type', 'workout')
          .eq('active', true)
          .limit(1)
        if (wActiveErr || !wActive?.[0]?.content) {
          return Response.json(
            {
              success: false,
              error: 'Workout plan required',
              details:
                'Create an active workout plan before generating meals, or generate workout and meals in one request.',
            },
            { status: 400 }
          )
        }
        workoutCtx = wActive[0].content
      }

      const targets =
        normalizeClientNutritionTargets(clientNutritionTargets) ||
        computeNutritionTargets(profile, workoutCtx)

      const nutritionBlock = formatNutritionBlock(targets)
      const workoutAlign = summarizeWorkoutForMeals(workoutCtx)
      const pantrySlice =
        typeof pantryDescription === 'string' ? pantryDescription.trim().slice(0, 2000) : ''
      const eatingSlice = typeof eatingToday === 'string' ? eatingToday.trim().slice(0, 1500) : ''
      const pantryText = pantrySlice
        ? `\n\nPANTRY / WHAT I HAVE ON HAND (prefer these ingredients when practical):\n${pantrySlice}`
        : ''
      const eatingText = eatingSlice
        ? `\n\nWHAT I AM EATING TODAY (context only — still build a full day plan unless they ask otherwise):\n${eatingSlice}`
        : ''

      const { data: prevMealRows } = await supabase
        .from('plans')
        .select('id')
        .eq('profile_id', profileId)
        .eq('type', 'meal')
        .eq('active', true)
      const prevMealPlanIds = (prevMealRows || []).map((r) => r.id)

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
      const trainingAlignText = workoutAlign
        ? `\n\nTRAINING CONTEXT (fuel to match this workload):\n${workoutAlign}`
        : ''
      const prefText = `
Generate a daily meal plan for me based on my profile AND these specific preferences:${mealActivityContext}
${nutritionBlock}${trainingAlignText}${pantryText}${eatingText}

- Dietary Preference: ${mp.diet || 'no restrictions'}
- Meals Per Day: ${mp.mealsPerDay || 4}
- Cooking Ability: ${mp.cookingAbility || 'moderate'}
- Allergies/Dislikes: ${mp.allergies || 'None'}
- Budget: ${mp.budget || 'moderate'}${mealBodyGoal}
`

      let mealRowInserted = false
      try {
        const mealResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt + '\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.',
          messages: [{
            role: 'user',
            content: prefText + adjustmentBlock + `
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
          await reactivatePlanIds(supabase, prevMealPlanIds)
          return Response.json(
            { success: false, error: 'Could not save meal plan', details: insMErr.message },
            { status: 500 }
          )
        }
        mealRowInserted = true

        const mealPrefsPersist = {
          ...mealPreferences,
          ...(pantrySlice ? { pantryDescription: pantrySlice } : {}),
          ...(eatingSlice ? { eatingToday: eatingSlice } : {}),
          lastNutritionTargets: targets,
        }
        const { error: prefMErr } = await supabase.from('profiles').update({
          preferences: {
            ...(profile?.preferences || {}),
            meal: mealPrefsPersist,
          },
        }).eq('id', profileId)
        if (prefMErr) {
          return Response.json(
            { success: false, error: 'Could not save meal preferences', details: prefMErr.message },
            { status: 500 }
          )
        }
      } catch (mealErr) {
        if (!mealRowInserted) await reactivatePlanIds(supabase, prevMealPlanIds)
        throw mealErr
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
