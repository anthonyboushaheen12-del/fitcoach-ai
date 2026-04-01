import { createClient } from '@supabase/supabase-js'

/** Bearer token from request, or null if missing. */
export function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

/**
 * User-scoped Supabase client (anon key + JWT). Use for auth.getUser and RPC
 * that rely on auth.uid(), or storage when the bucket policy expects authenticated.
 */
export function createSupabaseUserJwtClient(jwt) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!jwt?.trim()) {
    throw new Error('Missing access token')
  }
  const authHeader = jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  })
}

/** Service-role client when SUPABASE_SERVICE_ROLE_KEY is set; otherwise null. */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Supabase client for Route Handlers.
 * - Prefer SUPABASE_SERVICE_ROLE_KEY (server only; bypasses RLS).
 * - Otherwise require Authorization: Bearer <user jwt> so RLS sees auth.uid().
 */
export function createSupabaseRouteClient(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

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
