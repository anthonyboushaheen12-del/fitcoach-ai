import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key)
}

export async function GET(request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'Profile ID required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function PUT(request) {
  const supabase = getSupabase()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return Response.json({ error: 'Profile ID required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data[0])
}
