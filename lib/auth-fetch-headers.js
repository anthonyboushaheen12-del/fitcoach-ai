import { supabase } from './supabase'

/** JSON fetch headers with Bearer token; refreshes session if missing. */
export async function authJsonHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (!supabase) return headers

  let {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    session = refreshed?.session ?? null
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  return headers
}
