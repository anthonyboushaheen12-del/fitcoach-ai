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
  // #region agent log
  const _dbg = (loc, msg, data, hypothesisId) =>
    fetch('http://127.0.0.1:7838/ingest/7cadc763-027f-402a-b4fb-5d3dcb45df0f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ca100b' },
      body: JSON.stringify({
        sessionId: 'ca100b',
        runId: 'pre-fix',
        hypothesisId,
        location: loc,
        message: msg,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  // #endregion
  try {
    const body = await request.json()
    const { image, mediaType = 'image/jpeg', profile } = body

    // #region agent log
    await _dbg(
      'analyze-body/route.js:parsed',
      'request parsed',
      {
        hasImage: !!image && typeof image === 'string',
        imageLen: typeof image === 'string' ? image.length : 0,
        hasProfile: !!profile,
      },
      'H4'
    )
    // #endregion

    if (!image || typeof image !== 'string') {
      // #region agent log
      await _dbg('analyze-body/route.js:no-image', 'branch no image', {}, 'H4')
      // #endregion
      return Response.json({ error: 'No image provided', analysis: FALLBACK_ANALYSIS }, { status: 200 })
    }

    const hasKey = !!process.env.ANTHROPIC_API_KEY
    // #region agent log
    await _dbg('analyze-body/route.js:key', 'anthropic key present', { hasKey }, 'H1')
    // #endregion

    if (!hasKey) {
      // #region agent log
      await _dbg('analyze-body/route.js:no-key', 'branch missing ANTHROPIC_API_KEY', {}, 'H1')
      // #endregion
      return Response.json({ analysis: FALLBACK_ANALYSIS, warning: 'Server misconfiguration' }, { status: 200 })
    }

    const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg'

    // #region agent log
    await _dbg('analyze-body/route.js:pre-anthropic', 'calling anthropic.messages.create', { mediaType: mt }, 'H2')
    // #endregion

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

    // #region agent log
    const _b0 = response?.content?.[0]
    await _dbg(
      'analyze-body/route.js:anthropic-response',
      'anthropic returned',
      {
        blockType: _b0?.type,
        textLen: _b0?.type === 'text' ? String(_b0.text || '').length : 0,
      },
      'H2-H5'
    )
    // #endregion

    const text = response.content[0].text.trim()
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let analysis
    try {
      analysis = JSON.parse(clean)
    } catch (parseErr) {
      // #region agent log
      await _dbg(
        'analyze-body/route.js:json-parse',
        'JSON.parse failed',
        {
          cleanPreview: clean.slice(0, 120),
          parseMsg: parseErr?.message?.slice?.(0, 160),
        },
        'H3-H5'
      )
      // #endregion
      throw parseErr
    }
    // #region agent log
    await _dbg('analyze-body/route.js:success', 'parsed analysis OK', { keys: analysis ? Object.keys(analysis) : [] }, 'H3')
    // #endregion
    return Response.json({ analysis })
  } catch (err) {
    // #region agent log
    await _dbg(
      'analyze-body/route.js:catch',
      'exception',
      {
        name: err?.name,
        msg: err?.message?.slice?.(0, 220),
        status: err?.status,
      },
      'H2-H3-H5'
    )
    // #endregion
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
