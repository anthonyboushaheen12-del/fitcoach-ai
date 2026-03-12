import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function POST(request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { profileId, exercises, notes } = body

    if (!profileId || !Array.isArray(exercises)) {
      return Response.json({ error: 'profileId and exercises (array) required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        profile_id: profileId,
        exercises: exercises.map((e) => ({
          name: e.name || 'Unknown',
          sets: e.sets ?? 3,
          reps: e.reps ?? 10,
          weight_kg: e.weight_kg ?? null,
        })),
        notes: notes || null,
      })
      .select()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true, data: data[0] })
  } catch (err) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '30', 10)

    if (!profileId) {
      return Response.json({ error: 'profileId required' }, { status: 400 })
    }

    let query = supabase
      .from('workout_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('logged_at', { ascending: false })
      .limit(limit)

    if (date) {
      query = query
        .gte('logged_at', `${date}T00:00:00`)
        .lt('logged_at', `${date}T23:59:59.999`)
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ workouts: data || [] })
  } catch (err) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
