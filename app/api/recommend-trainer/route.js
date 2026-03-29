import Anthropic from '@anthropic-ai/sdk'
import { trainers } from '../../../lib/trainers'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const VALID_TRAINER_IDS = new Set(['scientist', 'sergeant', 'bro', 'holistic', 'athlete'])

const MAX_BASE64_CHARS = 6_000_000

function fallbackRecommendation(reason = 'default') {
  return {
    trainerId: 'bro',
    trainerName: 'The Gym Legends',
    trainerEmoji: '💪',
    reasoning:
      'Based on your goals, The Gym Legends combines classic muscle-building wisdom with modern training science — a great all-around match.',
    confidence: 'medium',
    alternativeId: 'scientist',
    alternativeReason: 'If you prefer a more analytical, data-driven approach.',
    _fallback: reason,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      profile,
      workoutPreferences = {},
      bodyGoalImage,
      bodyGoalImageMediaType = 'image/jpeg',
      bodyGoalDescription,
      mealOnlyContext,
    } = body

    if (!profile || typeof profile !== 'object') {
      return Response.json(fallbackRecommendation('missing_profile'))
    }

    if (bodyGoalImage && typeof bodyGoalImage === 'string') {
      if (bodyGoalImage.length > MAX_BASE64_CHARS) {
        return Response.json(fallbackRecommendation('image_too_large'))
      }
    }

    const wp = workoutPreferences || {}
    const focusStr = Array.isArray(wp.focus) ? wp.focus.join(', ') : wp.focus || ''
    const equipStr = Array.isArray(wp.equipment) ? wp.equipment.join(', ') : wp.equipment || ''

    const personaList = trainers
      .map(
        (t, i) =>
          `${i + 1}. "${t.id}" — ${t.name} (${t.emoji})\n   ${t.style}`
      )
      .join('\n\n')

    const userContent = []

    if (bodyGoalImage && bodyGoalImageMediaType) {
      const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(bodyGoalImageMediaType)
        ? bodyGoalImageMediaType
        : 'image/jpeg'
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mt,
          data: bodyGoalImage,
        },
      })
    }

    const textBlock = mealOnlyContext
      ? `This user is setting up NUTRITION only (no workout quiz answers yet). Use their profile and any physique goal context to recommend the best AI coach persona for ongoing coaching and meal-plan style.

USER PROFILE:
- Name: ${profile.name || 'User'}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weight_kg}kg, Height: ${profile.height_cm}cm
- Activity Level: ${profile.activity}
- Goal (in their words): ${profile.goal || 'Not specified'}

${bodyGoalDescription ? `PHYSIQUE GOAL DESCRIPTION: ${bodyGoalDescription}` : ''}
${bodyGoalImage ? 'A reference physique image has been provided above.' : 'No reference image provided.'}

THE 5 AVAILABLE TRAINER PERSONAS:

${personaList}

Respond ONLY with valid JSON, no markdown, no code fences:
{
  "trainerId": "one of: scientist, sergeant, bro, holistic, athlete",
  "trainerName": "The display name from the list",
  "trainerEmoji": "the emoji",
  "reasoning": "2-3 sentences explaining WHY this trainer is the best match.",
  "confidence": "high, medium, or low",
  "alternativeId": "second best option trainer id",
  "alternativeReason": "1 sentence on why the alternative could also work"
}`
      : `Based on this person's profile, workout preferences, and optional physique inspiration, recommend the BEST trainer persona.

USER PROFILE:
- Name: ${profile.name || 'User'}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weight_kg}kg, Height: ${profile.height_cm}cm
- Activity Level: ${profile.activity}
- Goal (in their words): ${profile.goal || 'Not specified'}

WORKOUT PREFERENCES:
- Current training / program: ${(typeof wp.currentTraining === 'string' && wp.currentTraining.trim()) ? wp.currentTraining.trim() : 'not specified'}
- Current physique (self-described): ${(typeof wp.currentPhysique === 'string' && wp.currentPhysique.trim()) ? wp.currentPhysique.trim() : 'not specified'}
- Experience: ${wp.experience || 'not specified'}
- Days per week: ${wp.daysPerWeek ?? 'not specified'}
- Focus areas: ${focusStr || 'not specified'}
- Equipment: ${equipStr || 'not specified'}
- Session duration: ${wp.sessionDuration || 'not specified'}
- Injuries: ${wp.injuries || 'None'}

${bodyGoalDescription ? `PHYSIQUE GOAL DESCRIPTION: ${bodyGoalDescription}` : ''}
${bodyGoalImage ? 'A reference physique image has been provided above.' : 'No reference image provided.'}

THE 5 AVAILABLE TRAINER PERSONAS:

${personaList}

Respond ONLY with valid JSON, no markdown, no code fences:
{
  "trainerId": "one of: scientist, sergeant, bro, holistic, athlete",
  "trainerName": "The display name from the list",
  "trainerEmoji": "the emoji",
  "reasoning": "2-3 sentences explaining WHY this trainer is the best match for this specific person, referencing goals, preferences, and physique inspiration if provided.",
  "confidence": "high, medium, or low",
  "alternativeId": "second best option trainer id",
  "alternativeReason": "1 sentence on why the alternative could also work"
}`

    userContent.push({ type: 'text', text: textBlock })

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(fallbackRecommendation('no_api_key'))
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = response.content[0].text.trim()
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      return Response.json(fallbackRecommendation('json_parse'))
    }

    if (!parsed || typeof parsed.trainerId !== 'string' || !VALID_TRAINER_IDS.has(parsed.trainerId)) {
      return Response.json(fallbackRecommendation('invalid_trainer_id'))
    }

    const t = trainers.find((x) => x.id === parsed.trainerId)
    const altId =
      parsed.alternativeId && VALID_TRAINER_IDS.has(parsed.alternativeId) ? parsed.alternativeId : 'scientist'

    return Response.json({
      trainerId: parsed.trainerId,
      trainerName: parsed.trainerName || t?.name || 'Coach',
      trainerEmoji: parsed.trainerEmoji || t?.emoji || '💪',
      reasoning: parsed.reasoning || fallbackRecommendation().reasoning,
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      alternativeId: altId,
      alternativeReason: parsed.alternativeReason || '',
    })
  } catch (error) {
    console.error('Trainer recommendation error:', error)
    return Response.json(fallbackRecommendation('exception'))
  }
}
