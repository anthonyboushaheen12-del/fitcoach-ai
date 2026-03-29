import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for Route Handlers.
 * - Prefer SUPABASE_SERVICE_ROLE_KEY (server only; bypasses RLS).
 * - Otherwise require Authorization: Bearer <user jwt> so RLS sees auth.uid().
 */
export function createSupabaseRouteClient(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const opts = {
    auth: { persistSession: false, autoRefreshToken: false },
  }

  if (serviceKey) {
    return createClient(url, serviceKey, opts)
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error(
      'Not authenticated for database access. Sign in again, or set SUPABASE_SERVICE_ROLE_KEY on the server.'
    )
  }

  return createClient(url, anonKey, {
    ...opts,
    global: { headers: { Authorization: authHeader } },
  })
}
