import Anthropic from '@anthropic-ai/sdk'
import { getClaudeModel } from '../../../lib/anthropic-config'
import { createSupabaseUserJwtClient, getBearerToken } from '../../../lib/supabase-api-route'
import {
  extractJsonObject,
  normalizeMealAnalysis,
  FALLBACK_MEAL_PHOTO_ANALYSIS,
} from '../../../lib/meal-analysis'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MEAL_JSON_SYSTEM = `You are a nutrition assistant. Respond ONLY with valid JSON — no markdown, no code fences, no text before or after.

Schema:
{
  "mealLabel": "short label e.g. Chicken rice bowl",
  "items": [
    {
      "name": "food name",
      "grams": 180,
      "calories": 320,
      "protein": 28,
      "carbs": 35,
      "fats": 9
    }
  ],
  "totalCalories": 650,
  "totalProteinG": 45,
  "totalCarbsG": 60,
  "totalFatsG": 18,
  "confidence": "high" | "medium" | "low",
  "notes": "one short sentence on uncertainty or tips"
}

Use integers for grams and round macros sensibly. If the image is not food, return items: [] and confidence: "low".`

export async function POST(request) {
  try {
    const token = getBearerToken(request)
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSb = createSupabaseUserJwtClient(token)
    const {
      data: { user },
      error: userErr,
    } = await userSb.auth.getUser()
    if (userErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profileId, image, mediaType = 'image/jpeg' } = body

    if (!profileId || !image || typeof image !== 'string') {
      return Response.json({ error: 'profileId and image required' }, { status: 400 })
    }

    const { data: profile, error: pErr } = await userSb
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .maybeSingle()

    if (pErr || !profile || profile.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        {
          analysis: FALLBACK_MEAL_PHOTO_ANALYSIS,
          warning: 'Server misconfiguration',
          error: 'ANTHROPIC_API_KEY is not set',
        },
        { status: 503 }
      )
    }

    const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg'

    const response = await anthropic.messages.create({
      model: getClaudeModel(),
      max_tokens: 1200,
      system: MEAL_JSON_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mt, data: image },
            },
            {
              type: 'text',
              text: `Estimate what foods are on the plate and approximate macros for the visible portion (one serving / one plate as shown).

Rules:
- If unsure, lower confidence and give ranges in notes.
- Never claim clinical diagnosis.`,
            },
          ],
        },
      ],
    })

    const block = response.content?.[0]
    const text = block && block.type === 'text' ? block.text.trim() : ''

    if (!text) {
      return Response.json(
        {
          error: 'Empty model response',
          details: 'No text from assistant',
          analysis: FALLBACK_MEAL_PHOTO_ANALYSIS,
        },
        { status: 502 }
      )
    }

    const parsed = extractJsonObject(text)
    if (!parsed) {
      console.error('Meal photo JSON parse error:', text.slice(0, 500))
      return Response.json(
        {
          error: 'INVALID_MEAL_JSON',
          details: 'Could not parse meal analysis from photo.',
          analysis: FALLBACK_MEAL_PHOTO_ANALYSIS,
        },
        { status: 422 }
      )
    }

    const analysis = normalizeMealAnalysis(parsed)
    return Response.json({ analysis })
  } catch (err) {
    console.error('Meal analysis error:', err)
    return Response.json(
      {
        error: 'Analysis failed',
        details: err?.message || 'Unknown error',
        analysis: FALLBACK_MEAL_PHOTO_ANALYSIS,
      },
      { status: 500 }
    )
  }
}
