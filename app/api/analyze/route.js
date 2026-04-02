import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { profileId } = body

    if (!profileId) {
      return Response.json({ error: 'profileId required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const [profileRes, mealsRes, workoutsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).single(),
      supabase
        .from('meal_logs')
        .select('*')
        .eq('profile_id', profileId)
        .order('logged_at', { ascending: false })
        .limit(14),
      supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', profileId)
        .order('logged_at', { ascending: false })
        .limit(14),
    ])

    const profile = profileRes.data
    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 })
    }

    const meals = mealsRes.data || []
    const workouts = workoutsRes.data || []
    const bodyImageUrl = profile.body_image_url
    const goalBodyImageUrl = profile.goal_body_image_url

    const mealsSummary =
      meals.length === 0
        ? 'No meals logged.'
        : `Last ${meals.length} meals: ${meals.map((m) => `${m.meal_name} (${m.total_calories} cal, ${m.total_protein}g P)`).join('; ')}`

    const workoutsSummary =
      workouts.length === 0
        ? 'No workouts logged.'
        : workouts
            .map((w) => {
              const exs = (w.exercises || [])
                .slice(0, 3)
                .map((e) => `${e.name} ${e.sets || 3}x${e.reps || 10}`)
                .join(', ')
              return `${new Date(w.logged_at).toLocaleDateString()}: ${exs}`
            })
            .join('\n')

    const bodyImagesNote = [
      bodyImageUrl ? 'User has uploaded a current physique photo.' : 'No current physique photo.',
      goalBodyImageUrl
        ? 'User has uploaded a goal/reference body photo (may be of someone else they want to resemble).'
        : 'No goal body reference.',
    ].join(' ')

    const userContext = `
Profile: ${profile.name}, ${profile.age}y, ${profile.gender}, ${profile.weight_kg}kg, ${profile.height_cm}cm
Goal: ${profile.goal || 'General fitness'}
Activity: ${profile.activity || 'Not specified'}

Meals: ${mealsSummary}

Workouts: ${workoutsSummary}

Body images: ${bodyImagesNote}
`.trim()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are an analysis assistant for a fitness app. Review the user's meals, workouts, and body photos (current and goal reference - the goal may be an image of someone else whose body they want to achieve). Summarize their habits, compare current vs target if applicable, identify gaps, and recommend whether they would benefit from a structured workout and/or meal plan. Be concise, constructive, and encouraging.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this user's fitness data and provide a summary plus recommendation:\n\n${userContext}`,
        },
      ],
    })

    const text = response.content[0]?.text?.trim() || 'Unable to generate analysis.'

    return Response.json({ summary: text, recommendation: text })
  } catch (err) {
    console.error('Analyze API error:', err)
    return Response.json({ error: err?.message || 'Analysis failed' }, { status: 500 })
  }
}
