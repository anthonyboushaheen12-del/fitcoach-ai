'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BrandedAuthLoading from './BrandedAuthLoading'

const AuthContext = createContext(null)

export function readCachedProfileForUser(userId) {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem('profile')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user_id === userId && parsed?.id) return parsed
  } catch {}
  return null
}

/** @typedef {{ status: 'ok', profile: object } | { status: 'empty' } | { status: 'error', reason: string }} ProfileFetchResult */

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  /** True only after server confirmed no profile row for this user (not timeout/network). */
  const [profileMissingConfirmed, setProfileMissingConfirmed] = useState(false)
  /** Last profile fetch failed (timeout/network/Supabase error); user may still have cached profile. */
  const [profileFetchError, setProfileFetchError] = useState(null)

  const fetchProfileWithMeta = useCallback(async (userId) => {
    if (!supabase || !userId) return { status: 'error', reason: 'no_client' }
    const timeoutMs = 10000
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs)
    )
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        timeout,
      ])
      if (error) {
        console.warn('Profile fetch:', error.message)
        return { status: 'error', reason: error.message || 'query_error' }
      }
      if (data) return { status: 'ok', profile: data }
      return { status: 'empty' }
    } catch (e) {
      const msg = e?.message || 'unknown'
      return { status: 'error', reason: msg }
    }
  }, [])

  /** @deprecated Prefer fetchProfileWithMeta; returns profile or null (lossy). */
  const fetchProfile = useCallback(
    async (userId) => {
      const r = await fetchProfileWithMeta(userId)
      return r.status === 'ok' ? r.profile : null
    },
    [fetchProfileWithMeta]
  )

  const applyProfileFetchResult = useCallback((userId, result) => {
    if (result.status === 'ok') {
      setProfile(result.profile)
      localStorage.setItem('profileId', result.profile.id)
      localStorage.setItem('profile', JSON.stringify(result.profile))
      setProfileMissingConfirmed(false)
      setProfileFetchError(null)
      return
    }
    if (result.status === 'empty') {
      setProfile(null)
      localStorage.removeItem('profileId')
      localStorage.removeItem('profile')
      setProfileMissingConfirmed(true)
      setProfileFetchError(null)
      return
    }
    setProfile((prev) => {
      const cached = readCachedProfileForUser(userId)
      const merged = cached ?? (prev?.user_id === userId ? prev : null)
      if (merged) {
        localStorage.setItem('profileId', merged.id)
        localStorage.setItem('profile', JSON.stringify(merged))
      }
      return merged ?? null
    })
    setProfileMissingConfirmed(false)
    setProfileFetchError(result.reason || 'Could not load profile')
  }, [])

  const forceReleaseLoading = useCallback(() => {
    setLoading(false)
    setProfileLoading(false)
    setShowFallback(false)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const AUTH_INIT_MS = 10000
    const race = (p, ms, label) =>
      Promise.race([
        p,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout`)), ms)
        ),
      ])

    let cancelled = false
    const fallbackTimeout = setTimeout(() => {
      if (!cancelled) setShowFallback(true)
    }, AUTH_INIT_MS)

    /** Last resort if initAuth never finishes (should not happen with raced getSession). */
    const stuckWatchdog = setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
        setProfileLoading(false)
      }
    }, 25000)

    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          if (params.get('signout') === '1') {
            await supabase.auth.signOut()
            if (cancelled) return
            setUser(null)
            setProfile(null)
            localStorage.removeItem('profileId')
            localStorage.removeItem('profile')
            localStorage.removeItem('onboardingContext')
            localStorage.removeItem('aspirationGoal')
            setProfileMissingConfirmed(false)
            setProfileFetchError(null)
            const url = new URL(window.location.href)
            url.searchParams.delete('signout')
            const next = `${url.pathname}${url.search}${url.hash}`
            window.history.replaceState({}, '', next || url.pathname)
          }
        }

        let u = null
        try {
          const { data: sessFast } = await race(
            supabase.auth.getSession(),
            5000,
            'getSession'
          )
          u = sessFast?.session?.user ?? null
        } catch {
          u = null
        }
        if (!u) {
          try {
            const { data } = await race(supabase.auth.getUser(), AUTH_INIT_MS, 'getUser')
            u = data?.user ?? null
          } catch (e) {
            console.warn('Auth getUser slow or failed, retrying getSession:', e?.message)
            try {
              const { data: sess } = await race(
                supabase.auth.getSession(),
                5000,
                'getSession'
              )
              u = sess?.session?.user ?? null
            } catch {
              u = null
            }
          }
        }
        if (cancelled) return
        setUser(u || null)
        if (u) {
          const cached = readCachedProfileForUser(u.id)
          if (cached) setProfile(cached)
          setProfileLoading(true)
          setLoading(false)
          try {
            const result = await fetchProfileWithMeta(u.id)
            if (cancelled) return
            applyProfileFetchResult(u.id, result)
          } finally {
            if (!cancelled) setProfileLoading(false)
          }
        } else {
          setProfile(null)
          localStorage.removeItem('profileId')
          localStorage.removeItem('profile')
          setProfileMissingConfirmed(false)
          setProfileFetchError(null)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (!cancelled) {
          clearTimeout(fallbackTimeout)
          clearTimeout(stuckWatchdog)
          setLoading(false)
          setShowFallback(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return

      const u = session?.user || null
      setUser(u)
      if (u) {
        const isTokenRefresh = event === 'TOKEN_REFRESHED'
        if (!isTokenRefresh) {
          const cached = readCachedProfileForUser(u.id)
          if (cached) setProfile(cached)
          setProfileLoading(true)
        }
        try {
          const result = await fetchProfileWithMeta(u.id)
          applyProfileFetchResult(u.id, result)
        } finally {
          if (!isTokenRefresh) setProfileLoading(false)
        }
      } else {
        setProfile(null)
        setProfileLoading(false)
        localStorage.removeItem('profileId')
        localStorage.removeItem('profile')
        localStorage.removeItem('onboardingContext')
        localStorage.removeItem('aspirationGoal')
        setProfileMissingConfirmed(false)
        setProfileFetchError(null)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      clearTimeout(fallbackTimeout)
      clearTimeout(stuckWatchdog)
      subscription?.unsubscribe()
    }
  }, [fetchProfileWithMeta, applyProfileFetchResult])

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setProfileMissingConfirmed(false)
    setProfileFetchError(null)
    localStorage.clear()
    router.push('/')
  }

  const refreshProfile = useCallback(async () => {
    if (!user) return null
    const result = await fetchProfileWithMeta(user.id)
    if (result.status === 'ok') {
      setProfile(result.profile)
      localStorage.setItem('profileId', result.profile.id)
      localStorage.setItem('profile', JSON.stringify(result.profile))
      setProfileMissingConfirmed(false)
      setProfileFetchError(null)
      return result.profile
    }
    if (result.status === 'empty') {
      setProfile(null)
      localStorage.removeItem('profileId')
      localStorage.removeItem('profile')
      setProfileMissingConfirmed(true)
      setProfileFetchError(null)
      return null
    }
    const cached = readCachedProfileForUser(user.id)
    if (cached) {
      setProfile(cached)
      setProfileMissingConfirmed(false)
      setProfileFetchError(result.reason || 'Could not load profile')
      return cached
    }
    setProfileFetchError(result.reason || 'Could not load profile')
    setProfileMissingConfirmed(false)
    return null
  }, [user, fetchProfileWithMeta])

  const ctxValue = {
    user,
    profile,
    loading,
    profileLoading,
    profileMissingConfirmed,
    profileFetchError,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    fetchProfile,
    fetchProfileWithMeta,
    forceReleaseLoading,
  }

  if (loading) {
    return (
      <AuthContext.Provider value={ctxValue}>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <BrandedAuthLoading />
          {showFallback && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '18%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ color: '#6B7280', fontSize: 13 }}>Taking longer than expected?</div>
              <button
                type="button"
                onClick={forceReleaseLoading}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  border: '2px solid rgba(110,231,183,0.5)',
                  background: 'rgba(16,185,129,0.25)',
                  color: '#6EE7B7',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Continue anyway
              </button>
            </div>
          )}
        </div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
