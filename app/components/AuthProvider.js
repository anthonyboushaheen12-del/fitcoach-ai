'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return data
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const initAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u || null)
      if (u) {
        const p = await fetchProfile(u.id)
        setProfile(p || null)
        if (p) {
          localStorage.setItem('profileId', p.id)
          localStorage.setItem('profile', JSON.stringify(p))
        } else {
          localStorage.removeItem('profileId')
          localStorage.removeItem('profile')
        }
      } else {
        setProfile(null)
        localStorage.removeItem('profileId')
        localStorage.removeItem('profile')
      }
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) {
        const p = await fetchProfile(u.id)
        setProfile(p || null)
        if (p) {
          localStorage.setItem('profileId', p.id)
          localStorage.setItem('profile', JSON.stringify(p))
        } else {
          localStorage.removeItem('profileId')
          localStorage.removeItem('profile')
        }
      } else {
        setProfile(null)
        localStorage.removeItem('profileId')
        localStorage.removeItem('profile')
        localStorage.removeItem('onboardingContext')
        localStorage.removeItem('aspirationGoal')
      }
    })

    return () => subscription?.unsubscribe()
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
      setProfile(p || null)
      if (p) {
        localStorage.setItem('profileId', p.id)
        localStorage.setItem('profile', JSON.stringify(p))
      }
      return p
    }
    return null
  }, [user, fetchProfile])

  if (loading) {
    return (
      <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile, fetchProfile }}>
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
