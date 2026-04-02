import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const FALLBACK_ANALYSIS = {
  bodyFatEstimate: 'Could not determine',
  buildType: 'Unknown',
  overallRating: '—',
  strengths: ['Upload a clearer photo for better analysis'],
  areasToImprove: ['Try again with better lighting and full-body visibility'],
  muscleAssessment: {
    shoulders: 'not visible',
    chest: 'not visible',
    arms: 'not visible',
    core: 'not visible',
    back: 'not visible',
    legs: 'not visible',
  },
  recommendedFocus:
    'We could not analyze the photo. Continue with your other answers — your trainer will still personalize your program.',
  estimatedTrainingAge: 'beginner',
  postureNotes: 'Not assessed',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { image, mediaType = 'image/jpeg', profile } = body

    if (!image || typeof image !== 'string') {
      return Response.json({ error: 'No image provided', analysis: FALLBACK_ANALYSIS }, { status: 200 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ analysis: FALLBACK_ANALYSIS, warning: 'Server misconfiguration' }, { status: 200 })
    }

    const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mt,
                data: image,
              },
            },
            {
              type: 'text',
              text: `You are an expert fitness coach and body composition analyst. Analyze this physique photo and provide a detailed but concise assessment. Be honest but constructive — never insulting or discouraging. Use approximate body fat RANGES (e.g. "18-22%"), never claim exact measurement. If a body part is not visible in the photo, use "not visible" in muscleAssessment rather than guessing.

USER CONTEXT:
- Age: ${profile?.age ?? 'Unknown'}
- Gender: ${profile?.gender ?? 'Unknown'}
- Weight: ${profile?.weight_kg != null ? `${profile.weight_kg}kg` : 'Unknown'}
- Height: ${profile?.height_cm != null ? `${profile.height_cm}cm` : 'Unknown'}
- Goal: ${profile?.goal ?? 'Not specified'}

Respond ONLY with valid JSON, no markdown, no code fences:
{
  "bodyFatEstimate": "X-Y%",
  "buildType": "one of: Ectomorph, Mesomorph, Endomorph, Ecto-Meso, Meso-Endo",
  "overallRating": "X/10",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasToImprove": ["area 1", "area 2", "area 3"],
  "muscleAssessment": {
    "shoulders": "underdeveloped / average / well-developed / not visible",
    "chest": "underdeveloped / average / well-developed / not visible",
    "arms": "underdeveloped / average / well-developed / not visible",
    "core": "underdeveloped / average / well-developed / not visible",
    "back": "underdeveloped / average / well-developed / not visible",
    "legs": "underdeveloped / average / well-developed / not visible"
  },
  "recommendedFocus": "2-3 sentences on training approach",
  "estimatedTrainingAge": "beginner / intermediate / advanced",
  "postureNotes": "visible postural issues or posture looks good / not visible"
}`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].text.trim()
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const analysis = JSON.parse(clean)
    return Response.json({ analysis })
  } catch (err) {
    console.error('Body analysis error:', err)
    return Response.json(
      {
        error: 'Analysis failed',
        analysis: FALLBACK_ANALYSIS,
      },
      { status: 200 }
    )
  }
}
