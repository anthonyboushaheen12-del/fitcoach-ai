import Anthropic from '@anthropic-ai/sdk'
import { getTrainer, buildSystemPrompt, buildOnboardingContextPrompt } from '../../../lib/trainers'
import { createSupabaseUserJwtClient, getBearerToken } from '../../../lib/supabase-api-route'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

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
    const { profileId, question, history, workoutExcerpt, mealExcerpt } = body

    if (!profileId || typeof question !== 'string' || !question.trim()) {
      return Response.json({ error: 'profileId and question required' }, { status: 400 })
    }

    const { data: profile, error: pErr } = await userSb
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()

    if (pErr || !profile || profile.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'Server misconfiguration', reply: 'Coaching is temporarily unavailable.' },
        { status: 503 }
      )
    }

    const trainer = getTrainer(profile.trainer || 'bro')
    const systemPrompt =
      buildSystemPrompt(trainer, profile) +
      buildOnboardingContextPrompt(profile.onboarding_context) +
      `

You answer ONLY about the user's current workout and meal program excerpts below. Be concise (under 6 sentences unless they ask for detail). Practical training and nutrition advice; no medical diagnosis. If they want program changes saved, tell them to use the "Update program" box on the Plans page—you cannot persist changes.

WORKOUT PLAN (excerpt):
${typeof workoutExcerpt === 'string' ? workoutExcerpt : 'None active.'}

MEAL PLAN (excerpt):
${typeof mealExcerpt === 'string' ? mealExcerpt : 'None active.'}
`

    const messages = []
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h?.role === 'user' && typeof h.text === 'string' && h.text.trim()) {
          messages.push({ role: 'user', content: h.text.trim() })
        }
        if (h?.role === 'assistant' && typeof h.text === 'string' && h.text.trim()) {
          messages.push({ role: 'assistant', content: h.text.trim() })
        }
      }
    }
    messages.push({ role: 'user', content: question.trim() })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 768,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].text
    return Response.json({ reply })
  } catch (err) {
    console.error('plan-qa error:', err)
    return Response.json(
      { error: 'Failed to get response', details: err.message },
      { status: 500 }
    )
  }
}
