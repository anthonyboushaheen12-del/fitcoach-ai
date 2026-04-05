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
  muscleNotes: {
    shoulders: '',
    chest: '',
    arms: '',
    core: '',
    back: '',
    legs: '',
  },
  recommendedFocus:
    'We could not analyze the photo. Continue with your other answers — your trainer will still personalize your program.',
  estimatedTrainingAge: 'beginner',
  postureNotes: 'Not assessed',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { image, mediaType = 'image/jpeg', profile, photoType = 'front' } = body
    const angle =
      photoType === 'back'
        ? 'BACK view (posterior): prioritize lats, upper/mid/low back, rear delts, glutes/hamstrings if visible. Mark chest as not visible if only the back is shown.'
        : photoType === 'side'
          ? 'SIDE / three-quarter view: note proportions depth-wise; assess shoulders, chest thickness, posture, glutes if visible.'
          : 'FRONT view: prioritize chest, front delts, arms, abs/core, quads if visible. Mark back as not visible if the back is not shown.'

    if (!image || typeof image !== 'string') {
      return Response.json({ error: 'No image provided', analysis: FALLBACK_ANALYSIS }, { status: 200 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ analysis: FALLBACK_ANALYSIS, warning: 'Server misconfiguration' }, { status: 200 })
    }

    const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1536,
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
              text: `You are an expert fitness coach and body composition analyst. Analyze this physique photo and provide a detailed but constructive assessment. Be honest — never insulting. Use approximate body fat RANGES (e.g. "18-22%"), never claim exact measurement. If a body part is truly not in frame, use "not visible" in muscleAssessment rather than guessing.

PHOTO ANGLE (follow strictly):
${angle}

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
  "strengths": ["4-5 specific, observable positives from THIS photo"],
  "areasToImprove": ["3-5 specific areas with brief why (e.g. chest thickness, lat width)"],
  "muscleAssessment": {
    "shoulders": "one of: underdeveloped, average, well-developed, not visible — use ONLY these tokens",
    "chest": "same",
    "arms": "same",
    "core": "same",
    "back": "same",
    "legs": "same"
  },
  "muscleNotes": {
    "shoulders": "One sentence: e.g. capped delts vs needs rear emphasis — empty string if not visible",
    "chest": "one sentence or empty string",
    "arms": "one sentence or empty string",
    "core": "one sentence or empty string",
    "back": "one sentence on lats/traps/lower back if visible, else empty string",
    "legs": "one sentence on quads/hams/glutes if visible, else empty string"
  },
  "recommendedFocus": "3-4 sentences: priorities, exercise styles, frequency hints",
  "estimatedTrainingAge": "beginner / intermediate / advanced",
  "postureNotes": "2-3 sentences on posture, shoulder alignment, pelvic tilt if visible, else not visible"
}`,
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
    } catch (parseErr) {
      throw parseErr
    }

    const partKeys = ['shoulders', 'chest', 'arms', 'core', 'back', 'legs']
    if (!analysis.muscleNotes || typeof analysis.muscleNotes !== 'object') {
      analysis.muscleNotes = {}
    }
    for (const k of partKeys) {
      const v = analysis.muscleNotes[k]
      if (typeof v !== 'string' || !v.trim()) analysis.muscleNotes[k] = ''
      else analysis.muscleNotes[k] = v.trim()
    }

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
