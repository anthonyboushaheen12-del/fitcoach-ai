import Anthropic from '@anthropic-ai/sdk'
import { getClaudeModel } from '../../../lib/anthropic-config'
import {
  extractJsonObject,
  normalizeMealAnalysis,
  FALLBACK_MEAL_ANALYSIS,
} from '../../../lib/meal-analysis'
import { createSupabaseUserJwtClient, getBearerToken } from '../../../lib/supabase-api-route'

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

Use integers for grams and round macros sensibly. If the text is not about food or is unusable, return items: [] and confidence: "low".`

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
    const { profileId, description } = body
    const desc = typeof description === 'string' ? description.trim() : ''

    if (!profileId || !desc) {
      return Response.json({ error: 'profileId and description required' }, { status: 400 })
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
        { analysis: FALLBACK_MEAL_ANALYSIS, warning: 'Server misconfiguration', error: 'ANTHROPIC_API_KEY is not set' },
        { status: 503 }
      )
    }

    const response = await anthropic.messages.create({
      model: getClaudeModel(),
      max_tokens: 1200,
      system: MEAL_JSON_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `The user described what they ate in natural language. Infer foods, reasonable portion sizes (grams), and approximate macros per item for the full meal they described.

Rules:
- Interpret casual quantities ("big bowl", "small coffee", "a couple slices") as best-effort grams.
- If vague, use typical single servings and lower confidence; explain briefly in notes.
- Never claim clinical diagnosis.

User description:
"""
${desc.slice(0, 4000)}
"""`,
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
          analysis: FALLBACK_MEAL_ANALYSIS,
        },
        { status: 502 }
      )
    }

    const parsed = extractJsonObject(text)
    if (!parsed) {
      console.error('Meal text JSON parse error:', text.slice(0, 500))
      return Response.json(
        {
          error: 'INVALID_MEAL_JSON',
          details: 'Could not parse meal analysis. Try listing foods and rough amounts.',
          analysis: FALLBACK_MEAL_ANALYSIS,
        },
        { status: 422 }
      )
    }

    const analysis = normalizeMealAnalysis(parsed)
    return Response.json({ analysis })
  } catch (err) {
    console.error('Meal text analysis error:', err)
    return Response.json(
      {
        error: 'Analysis failed',
        details: err?.message || 'Unknown error',
        analysis: FALLBACK_MEAL_ANALYSIS,
      },
      { status: 500 }
    )
  }
}
