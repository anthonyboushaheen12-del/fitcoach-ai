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
    const {
      profileId,
      mealName,
      foodItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      mealType,
    } = body

    if (!profileId || !mealName) {
      return Response.json({ error: 'profileId and mealName required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('meal_logs')
      .insert({
        profile_id: profileId,
        meal_name: mealName,
        food_items: foodItems || [],
        total_calories: totalCalories ?? 0,
        total_protein: totalProtein ?? 0,
        total_carbs: totalCarbs ?? 0,
        total_fats: totalFats ?? 0,
        meal_type: mealType,
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

    if (!profileId) {
      return Response.json({ error: 'profileId required' }, { status: 400 })
    }

    let query = supabase
      .from('meal_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('logged_at', { ascending: false })

    if (date) {
      query = query
        .gte('logged_at', `${date}T00:00:00`)
        .lt('logged_at', `${date}T23:59:59.999`)
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ meals: data || [] })
  } catch (err) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
