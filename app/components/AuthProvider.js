'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const AuthContext = createContext(null)

function readCachedProfileForUser(userId) {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem('profile')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user_id === userId && parsed?.id) return parsed
  } catch {}
  return null
}

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
    )
    try {
      const { data } = await Promise.race([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        timeout,
      ])
      return data ?? null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) { setLoading(false); setProfileLoading(false) }
    }, 3500)
    const fallbackTimeout = setTimeout(() => {
      if (!cancelled) setShowFallback(true)
    }, 2500)

    const initAuth = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (cancelled) return
        setUser(u || null)
        if (u) {
          setProfileLoading(true)
          try {
            const p = await fetchProfile(u.id)
            if (cancelled) return
            const merged = p ?? readCachedProfileForUser(u.id)
            setProfile(merged || null)
            if (merged) {
              localStorage.setItem('profileId', merged.id)
              localStorage.setItem('profile', JSON.stringify(merged))
            } else {
              localStorage.removeItem('profileId')
              localStorage.removeItem('profile')
            }
          } finally {
            if (!cancelled) setProfileLoading(false)
          }
        } else {
          setProfile(null)
          localStorage.removeItem('profileId')
          localStorage.removeItem('profile')
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (!cancelled) {
          clearTimeout(timeout)
          clearTimeout(fallbackTimeout)
          setLoading(false)
          setShowFallback(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) {
        setProfileLoading(true)
        try {
          const p = await fetchProfile(u.id)
          const merged = p ?? readCachedProfileForUser(u.id)
          setProfile((prev) => {
            if (merged != null) return merged
            if (prev?.user_id === u.id) return prev
            return null
          })
          if (merged) {
            localStorage.setItem('profileId', merged.id)
            localStorage.setItem('profile', JSON.stringify(merged))
          }
        } finally {
          setProfileLoading(false)
        }
      } else {
        setProfile(null)
        setProfileLoading(false)
        localStorage.removeItem('profileId')
        localStorage.removeItem('profile')
        localStorage.removeItem('onboardingContext')
        localStorage.removeItem('aspirationGoal')
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      clearTimeout(fallbackTimeout)
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

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
    localStorage.clear()
    router.push('/')
  }

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id)
      // Never wipe profile on timeout/network failure — keeps dashboard from sending users to onboarding
      if (p) {
        setProfile(p)
        localStorage.setItem('profileId', p.id)
        localStorage.setItem('profile', JSON.stringify(p))
        return p
      }
      const cached = readCachedProfileForUser(user.id)
      if (cached) {
        setProfile(cached)
        return cached
      }
      return null
    }
    return null
  }, [user, fetchProfile])

  if (loading) {
    return (
      <AuthContext.Provider value={{ user, profile, loading, profileLoading, signIn, signUp, signOut, refreshProfile, fetchProfile }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070B07',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#6EE7B7' }}>
              Fit<span style={{ color: '#fff' }}>Coach</span>
              <span style={{
                fontSize: 14,
                marginLeft: 6,
                background: 'linear-gradient(135deg, #F97316, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>AI</span>
            </div>
            <div style={{ color: '#2D5B3F', fontSize: 13, marginTop: 8 }}>Loading...</div>
            {showFallback && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ color: '#6B7280', fontSize: 13 }}>Taking longer than expected?</div>
                <button
                  onClick={() => { setLoading(false); setProfileLoading(false); setShowFallback(false) }}
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
        </div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
