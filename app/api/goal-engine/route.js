import Anthropic from '@anthropic-ai/sdk'
import {
  getTrainer,
  buildSystemPrompt,
  buildOnboardingContextPrompt,
} from '../../../lib/trainers'
import { createSupabaseRouteClient } from '../../../lib/supabase-api-route'
import {
  alignMealPlanToTargets,
  targetsFromGoalPlan,
} from '../../../lib/align-meal-plan-to-targets'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const GOAL_TEXT_MAX = 2000

export async function POST(request) {
  let supabase
  try {
    supabase = createSupabaseRouteClient(request)
  } catch (e) {
    return Response.json(
      { error: 'Database auth failed', details: e.message },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const {
      goal: rawGoal,
      profileId,
      profile,
      trainerId,
      replaceConfirmed = false,
    } = body

    const goal =
      typeof rawGoal === 'string' ? rawGoal.trim().slice(0, GOAL_TEXT_MAX) : ''

    if (!profileId) {
      return Response.json(
        { error: 'Missing profileId', details: 'profileId is required' },
        { status: 400 }
      )
    }

    if (!goal) {
      return Response.json(
        { error: 'Missing goal', details: 'goal text is required' },
        { status: 400 }
      )
    }

    if (!profile || typeof profile !== 'object') {
      return Response.json(
        { error: 'Missing profile', details: 'profile object is required' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        {
          error: 'Server misconfiguration',
          details: 'ANTHROPIC_API_KEY is not set',
        },
        { status: 503 }
      )
    }

    const { data: activeGoals, error: activeErr } = await supabase
      .from('goals')
      .select('id')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .limit(1)

    if (activeErr) {
      console.error('Goal engine active goals check:', activeErr)
      return Response.json(
        {
          error: 'Could not verify active goals',
          details: activeErr.message,
        },
        { status: 500 }
      )
    }

    const existingActive = activeGoals?.[0]
    if (existingActive && !replaceConfirmed) {
      return Response.json(
        {
          error: 'ACTIVE_GOAL_EXISTS',
          existingGoalId: existingActive.id,
          details: 'User already has an active goal',
        },
        { status: 409 }
      )
    }

    const trainer = getTrainer(trainerId || profile?.trainer)
    const systemPrompt =
      `${buildSystemPrompt(trainer, profile)}${buildOnboardingContextPrompt(profile?.onboarding_context)}`

    const userPrompt = `Create a COMPLETE action plan for this goal.

USER PROFILE:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Current Weight: ${profile.weight_kg} kg
- Height: ${profile.height_cm} cm
- Activity Level: ${profile.activity}
- Current Goal Description: ${profile.goal || 'Not specified'}

SPECIFIC OBJECTIVE: "${goal}"

Respond ONLY with valid JSON. No markdown, no code fences. Use this exact structure:

{
  "goalSummary": {
    "objective": "restate the goal clearly",
    "estimatedTimeline": "X-Y weeks",
    "dailyCalories": 2100,
    "dailyDeficitOrSurplus": "-400 cal deficit",
    "weeklyTargetChange": "-0.4 to -0.5 kg",
    "difficulty": "Easy / Moderate / Hard / Very Hard",
    "explanation": "2-3 sentences explaining the math and science behind this plan, personalized to their stats"
  },
  "milestones": [
    {
      "phase": "Phase 1: Foundation",
      "weeks": "Week 1-2",
      "tasks": ["task 1", "task 2", "task 3"],
      "target": "description of target for this phase"
    },
    {
      "phase": "Phase 2: Acceleration",
      "weeks": "Week 3-4",
      "tasks": ["task 1", "task 2", "task 3"],
      "target": "target for this phase"
    }
  ],
  "nutrition": {
    "dailyCalories": "2,100 cal",
    "protein": "170g",
    "carbs": "200g",
    "fats": "58g",
    "meals": [
      {
        "name": "Breakfast",
        "emoji": "🍳",
        "description": "4 eggs scrambled + 2 toast + avocado",
        "calories": 520,
        "protein": 38
      }
    ],
    "keyRules": [
      "Hit 170g protein every day — non-negotiable",
      "Drink 3+ liters of water daily",
      "No liquid calories",
      "One flexible meal per week within daily calories"
    ]
  },
  "exercise": {
    "splitType": "4-day Upper/Lower",
    "days": [
      {
        "name": "Day 1 — Upper Push",
        "focus": "Chest, Shoulders, Triceps",
        "exercises": [
          { "name": "Incline DB Bench Press", "sets": "4x8-10", "intensity": "RIR 1-2", "rest": "90s" }
        ]
      }
    ],
    "cardio": [
      "2x/week: 25 min incline walk (Zone 2)",
      "1x/week: 15 min HIIT intervals",
      "Daily: 8,000-10,000 steps"
    ],
    "specialFocus": [
      { "name": "Hanging Leg Raises", "sets": "3x12-15", "frequency": "2-3x/week" }
    ]
  },
  "dailyChecklist": [
    "Hit 2,100 calories (±100)",
    "Eat 170g+ protein",
    "Drink 3L water",
    "Complete today's workout",
    "Walk 8,000+ steps",
    "Sleep 7+ hours",
    "Log weight (morning, before eating)"
  ],
  "trainerNote": "A motivational note from the trainer in their voice, 2-3 sentences, referencing the specific goal"
}

IMPORTANT:
- Calculate REAL numbers based on their weight, height, age, and activity level
- For fat loss: use their estimated TDEE minus an appropriate deficit (300-500 cal)
- For muscle gain: use their TDEE plus 200-300 cal surplus
- Protein should be 1.8-2.2g per kg of bodyweight
- Include exercises appropriate to their goal (more ab work for "get abs", more arm work for "bigger arms", etc.)
- The timeline must be REALISTIC — don't promise unsafe rates of change
- Include at least 3-4 workout days and 4-5 meals in the plan
- The daily checklist should be 5-8 actionable items
- dailyCalories inside goalSummary must be a number (integer)

Include at least 3-4 milestone objects when appropriate for the timeline.`

    const jsonInstruction = `

You are an expert fitness coach and nutritionist. Output ONLY the JSON object — no other text, no markdown.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${systemPrompt}${jsonInstruction}`,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const block = response.content?.[0]
    const text =
      block && block.type === 'text' ? block.text.trim() : ''

    if (!text) {
      return Response.json(
        { error: 'Empty model response', details: 'No text from assistant' },
        { status: 502 }
      )
    }

    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let plan
    try {
      plan = JSON.parse(clean)
    } catch (parseErr) {
      console.error('Goal engine JSON parse error:', parseErr, clean.slice(0, 500))
      return Response.json(
        {
          error: 'INVALID_PLAN_JSON',
          details: 'Could not parse action plan. Try again.',
        },
        { status: 422 }
      )
    }

    if (plan?.nutrition && typeof plan.nutrition === 'object' && plan?.goalSummary) {
      const gTargets = targetsFromGoalPlan(plan.goalSummary, plan.nutrition)
      if (gTargets) {
        plan.nutrition = alignMealPlanToTargets(plan.nutrition, gTargets).mealPlan
      }
    }

    if (replaceConfirmed && existingActive) {
      const { error: archErr } = await supabase
        .from('goals')
        .update({ status: 'archived' })
        .eq('profile_id', profileId)
        .eq('status', 'active')

      if (archErr) {
        console.error('Goal engine archive:', archErr)
        return Response.json(
          { error: 'Could not archive previous goal', details: archErr.message },
          { status: 500 }
        )
      }
    }

    const startedWeight =
      typeof profile.weight_kg === 'number' && !Number.isNaN(profile.weight_kg)
        ? profile.weight_kg
        : null

    const { data: inserted, error: insErr } = await supabase
      .from('goals')
      .insert({
        profile_id: profileId,
        goal_text: goal,
        plan,
        status: 'active',
        started_weight_kg: startedWeight,
      })
      .select('id')
      .single()

    if (insErr) {
      console.error('Goal engine insert:', insErr)
      return Response.json(
        { error: 'Failed to save goal', details: insErr.message },
        { status: 500 }
      )
    }

    return Response.json({
      plan,
      goalId: inserted?.id,
    })
  } catch (error) {
    console.error('Goal engine error:', error)
    return Response.json(
      { error: 'Failed to generate action plan', details: error.message },
      { status: 500 }
    )
  }
}
