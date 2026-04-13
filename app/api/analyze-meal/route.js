import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseUserJwtClient, getBearerToken } from '../../../lib/supabase-api-route'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const FALLBACK = {
  mealLabel: 'Meal',
  items: [],
  totalCalories: null,
  totalProteinG: null,
  totalCarbsG: null,
  totalFatsG: null,
  confidence: 'low',
  notes: 'Could not analyze this photo. Try a clearer shot with the full plate visible.',
}

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
      return Response.json({ analysis: FALLBACK, warning: 'Server misconfiguration' }, { status: 200 })
    }

    const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
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
              text: `You are a nutrition assistant. Estimate what foods are on the plate and approximate macros for the visible portion (one serving / one plate as shown).

Rules:
- If unsure, lower confidence and give ranges in notes.
- Never claim clinical diagnosis.
- Respond ONLY with valid JSON, no markdown or code fences:
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
Use integers for grams and round macros sensibly. If the image is not food, return items: [] and confidence: "low".`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].text.trim()
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let analysis
    try {
      analysis = JSON.parse(clean)
    } catch {
      return Response.json({ analysis: FALLBACK }, { status: 200 })
    }

    if (!Array.isArray(analysis.items)) analysis.items = []

    return Response.json({ analysis })
  } catch (err) {
    console.error('Meal analysis error:', err)
    return Response.json({ analysis: FALLBACK, error: 'Analysis failed' }, { status: 200 })
  }
}
