import { createSupabaseRouteClient } from '../../../lib/supabase-api-route'

/** Update the active workout plan JSON (e.g. user edits from Plans). */
export async function PATCH(request) {
  let supabase
  try {
    supabase = createSupabaseRouteClient(request)
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { profileId, content } = body

    if (!profileId) {
      return Response.json(
        { success: false, error: 'profileId required' },
        { status: 400 }
      )
    }
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return Response.json(
        { success: false, error: 'content must be a workout plan object' },
        { status: 400 }
      )
    }

    const daysOk = Array.isArray(content.days) && content.days.length > 0
    const todayOk = Array.isArray(content.todayExercises) && content.todayExercises.length > 0
    if (!daysOk && !todayOk) {
      return Response.json(
        { success: false, error: 'content must include days or todayExercises' },
        { status: 400 }
      )
    }

    const { data: row, error: findErr } = await supabase
      .from('plans')
      .select('id')
      .eq('profile_id', profileId)
      .eq('type', 'workout')
      .eq('active', true)
      .maybeSingle()

    if (findErr) {
      return Response.json({ success: false, error: findErr.message }, { status: 500 })
    }
    if (!row?.id) {
      return Response.json(
        { success: false, error: 'No active workout plan' },
        { status: 404 }
      )
    }

    const { error: upErr } = await supabase.from('plans').update({ content }).eq('id', row.id)
    if (upErr) {
      return Response.json({ success: false, error: upErr.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (e) {
    console.error('workout-plan PATCH:', e)
    return Response.json(
      { success: false, error: e.message || 'Failed to update plan' },
      { status: 500 }
    )
  }
}
