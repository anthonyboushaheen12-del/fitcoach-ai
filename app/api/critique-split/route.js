import Anthropic from '@anthropic-ai/sdk'
import { getClaudeModel } from '../../../lib/anthropic-config'
import { getTrainer, buildSystemPrompt, buildOnboardingContextPrompt } from '../../../lib/trainers'
import { createSupabaseRouteClient } from '../../../lib/supabase-api-route'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MAX_SPLIT_CHARS = 5000

function cleanJsonText(text) {
  return String(text || '')
    .trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

function fallbackResponse(daysPerWeek = 4) {
  const d = Number.isFinite(Number(daysPerWeek)) ? Number(daysPerWeek) : 4
  return {
    summary:
      'I could not fully parse your split, but I can still help. Paste your weekly schedule (days + main lifts) and we’ll tighten the structure, balance volume, and reduce overlap.',
    issues: [
      {
        title: 'Not enough structure to evaluate',
        whyItMatters:
          'Without clear days, muscle groups, and weekly frequency, it’s hard to verify balance, recovery, and progressive overload.',
        fix: 'Paste your routine in the format: Day → exercises → sets/reps (or at least day themes like Push/Pull/Legs).',
      },
    ],
    questions: [
      'How many days per week do you realistically train (and which days)?',
      'What equipment do you have (full gym / dumbbells / bodyweight)?',
    ],
    correctedWorkoutPlan: {
      name: 'Rebuilt Workout Plan',
      daysPerWeek: d,
      split: ['Mon: Full Body', 'Wed: Full Body', 'Fri: Full Body', 'Sat: Optional'],
      todayName: 'Full Body',
      todayExercises: [
        { name: 'Squat or Leg Press', sets: '3-4x6-10', rest: '120s' },
        { name: 'Bench Press or DB Press', sets: '3-4x6-10', rest: '90s' },
        { name: 'Row (machine or cable)', sets: '3-4x8-12', rest: '90s' },
        { name: 'RDL or Leg Curl', sets: '2-3x8-12', rest: '90s' },
+        { name: 'Lateral Raises', sets: '2-3x12-20', rest: '60s' },
      ],
      days: [
        {
          name: 'Day 1 - Full Body',
          exercises: [
            { name: 'Squat or Leg Press', sets: '3-4x6-10', rest: '120s' },
            { name: 'Bench Press or DB Press', sets: '3-4x6-10', rest: '90s' },
            { name: 'Row (machine or cable)', sets: '3-4x8-12', rest: '90s' },
            { name: 'RDL or Leg Curl', sets: '2-3x8-12', rest: '90s' },
            { name: 'Lateral Raises', sets: '2-3x12-20', rest: '60s' },
          ],
        },
      ],
    },
    _fallback: true,
  }
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
      currentSplitText,
      workoutPreferences = {},
    } = body || {}

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

    const splitText = typeof currentSplitText === 'string' ? currentSplitText.trim() : ''
    if (!splitText) {
      return Response.json(
        { success: false, error: 'Missing split', details: 'currentSplitText is required' },
        { status: 400 }
      )
    }

    const clippedSplit = splitText.slice(0, MAX_SPLIT_CHARS)
    const daysPerWeekGuess =
      workoutPreferences?.daysPerWeek ??
      profile?.preferences?.workout?.daysPerWeek ??
      4

    // Persist raw split text for reuse.
    try {
      const prevPrefs = (profile?.preferences && typeof profile.preferences === 'object')
        ? profile.preferences
        : {}
      const prevWorkout = (prevPrefs?.workout && typeof prevPrefs.workout === 'object')
        ? prevPrefs.workout
        : {}
      const nextPrefs = {
        ...prevPrefs,
        workout: {
          ...prevWorkout,
          ...(workoutPreferences && typeof workoutPreferences === 'object' ? workoutPreferences : {}),
          currentSplitText: clippedSplit,
        },
      }
      await supabase.from('profiles').update({ preferences: nextPrefs }).eq('id', profileId)
    } catch (_) {
      // Preference persistence is best-effort; critique can still proceed.
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        {
          success: true,
          warning: 'ANTHROPIC_API_KEY is not set',
          ...fallbackResponse(daysPerWeekGuess),
        },
        { status: 200 }
      )
    }

    const trainer = getTrainer(trainerId || profile?.trainer)
    const systemPrompt =
      buildSystemPrompt(trainer, profile) +
      buildOnboardingContextPrompt(onboardingContext || profile?.onboarding_context) +
      '\n\nIMPORTANT: You must respond ONLY with valid JSON. No text before or after. No markdown code fences.'

    const wp = workoutPreferences && typeof workoutPreferences === 'object' ? workoutPreferences : {}
    const focusStr = Array.isArray(wp.focus) ? wp.focus.join(', ') : (wp.focus || '')
    const equipStr = Array.isArray(wp.equipment) ? wp.equipment.join(', ') : (wp.equipment || '')

    const userPrompt = `The user pasted their CURRENT workout split/routine. Your job:\n1) Critique it: identify recovery/overlap issues, missing muscles/movement patterns, progression problems, and mismatch to their goal.\n2) Fix it if needed: produce a corrected weekly split and a complete workout-plan JSON in the same format used by this app.\n\nUSER SPLIT (verbatim):\n\"\"\"\n${clippedSplit}\n\"\"\"\n\nCONTEXT (from their setup if available):\n- Days per week target: ${wp.daysPerWeek ?? profile?.preferences?.workout?.daysPerWeek ?? 'unknown'}\n- Experience: ${wp.experience ?? profile?.preferences?.workout?.experience ?? 'unknown'}\n- Focus areas: ${focusStr || 'unknown'}\n- Equipment: ${equipStr || 'unknown'}\n- Session duration: ${wp.sessionDuration ?? profile?.preferences?.workout?.sessionDuration ?? 'unknown'}\n- Injuries/limitations: ${wp.injuries ?? profile?.preferences?.workout?.injuries ?? 'None'}\n\nRules:\n- Be conservative and safe.\n- If the split is already solid, say so, and make only small improvements.\n- Always output a complete correctedWorkoutPlan with: name, daysPerWeek, split[], todayName, todayExercises[], days[].\n- Make todayExercises match the FIRST day in correctedWorkoutPlan.days.\n- Keep exercise list practical (8-12 exercises per day max).\n\nRespond ONLY with valid JSON, no markdown, no code fences:\n{\n  \"summary\": \"1 short paragraph\",\n  \"issues\": [\n    {\"title\": \"...\", \"whyItMatters\": \"...\", \"fix\": \"...\"}\n  ],\n  \"questions\": [\"...\"],\n  \"correctedWorkoutPlan\": {\n    \"name\": \"...\",\n    \"daysPerWeek\": 4,\n    \"split\": [\"Mon: ...\"],\n    \"todayName\": \"...\",\n    \"todayExercises\": [{\"name\": \"...\", \"sets\": \"...\", \"rest\": \"...\"}],\n    \"days\": [{\"name\": \"Day 1 - ...\", \"exercises\": [{\"name\": \"...\", \"sets\": \"...\", \"rest\": \"...\"}]}]\n  }\n}`

    const response = await anthropic.messages.create({
      model: getClaudeModel(),
      max_tokens: 2200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = response.content?.[0]?.text || ''
    const clean = cleanJsonText(raw)

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch (e) {
      return Response.json(
        { success: true, warning: 'json_parse_failed', ...fallbackResponse(daysPerWeekGuess) },
        { status: 200 }
      )
    }

    const out = {
      summary: typeof parsed?.summary === 'string' ? parsed.summary : fallbackResponse(daysPerWeekGuess).summary,
      issues: Array.isArray(parsed?.issues) ? parsed.issues : fallbackResponse(daysPerWeekGuess).issues,
      questions: Array.isArray(parsed?.questions) ? parsed.questions : [],
      correctedWorkoutPlan:
        parsed?.correctedWorkoutPlan && typeof parsed.correctedWorkoutPlan === 'object'
          ? parsed.correctedWorkoutPlan
          : fallbackResponse(daysPerWeekGuess).correctedWorkoutPlan,
    }

    return Response.json({ success: true, ...out })
  } catch (e) {
    console.error('critique-split POST:', e)
    return Response.json(
      { success: false, error: 'Failed to critique split', details: e.message },
      { status: 500 }
    )
  }
}

