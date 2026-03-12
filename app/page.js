'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from './components/AuthProvider'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, profileLoading, signIn, signUp } = useAuth()
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)

  // Wait for auth and profile to resolve before redirecting
  if (authLoading || profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070B07' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#6EE7B7' }}>FitCoach<span style={{ color: '#fff' }}>AI</span></div>
          <div style={{ color: '#2D5B3F', fontSize: 13, marginTop: 8 }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Only redirect once profile has been resolved (not loading)
  if (user && profile) {
    router.replace('/dashboard')
    return null
  }
  if (user && !profile) {
    router.replace('/onboarding')
    return null
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(14,20,14,0.55)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(110,231,183,0.07)',
    borderRadius: 14,
    color: '#E2FBE8',
    fontSize: 15,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 500,
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setPendingConfirmation(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('confirm')) {
        setPendingConfirmation(email)
        setError('')
      } else {
        setError(msg || 'Sign in failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setPendingConfirmation(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: err } = await signUp(email, password)
      if (err) throw err
      if (data?.user && !data?.session) {
        setPendingConfirmation(email)
      } else if (data?.user) {
        router.replace('/onboarding')
      }
    } catch (err) {
      setError(err?.message || 'Account creation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!supabase || !pendingConfirmation) return
    setResending(true)
    setError('')
    setResendSent(false)
    try {
      const { error: err } = await supabase.auth.resend({ type: 'signup', email: pendingConfirmation })
      if (err) throw err
      setResendSent(true)
    } catch (err) {
      setError(err?.message || 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #F97316, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginLeft: 6,
          }}>AI</span>
        </h1>
        <p style={{ color: '#2D5B3F', fontSize: 14, marginTop: 8 }}>
          Your AI-powered personal trainer
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: 8, marginBottom: 24, width: '100%', maxWidth: 320 }}
      >
        <button
          onClick={() => { setTab('signin'); setError('') }}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            background: tab === 'signin' ? 'linear-gradient(135deg, rgba(110,231,183,0.2), rgba(16,185,129,0.1))' : 'rgba(14,20,14,0.55)',
            color: tab === 'signin' ? '#6EE7B7' : '#2D5B3F',
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: 'blur(24px)',
            border: tab === 'signin' ? '2px solid rgba(110,231,183,0.3)' : '1px solid rgba(110,231,183,0.07)',
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => { setTab('signup'); setError('') }}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            background: tab === 'signup' ? 'linear-gradient(135deg, rgba(110,231,183,0.2), rgba(16,185,129,0.1))' : 'rgba(14,20,14,0.55)',
            color: tab === 'signup' ? '#6EE7B7' : '#2D5B3F',
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: 'blur(24px)',
            border: tab === 'signup' ? '2px solid rgba(110,231,183,0.3)' : '1px solid rgba(110,231,183,0.07)',
          }}
        >
          Create Account
        </button>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass"
        style={{ width: '100%', maxWidth: 320, padding: 24 }}
      >
        {pendingConfirmation ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 15, color: '#D1FAE5', textAlign: 'center', lineHeight: 1.6 }}>
              {tab === 'signin' ? 'Your email has not been confirmed yet.' : 'Account created.'} Check your email (and spam folder) for the confirmation link.
              <br />
              <span style={{ fontSize: 13, color: '#2D5B3F' }}>{pendingConfirmation}</span>
            </div>
            <div style={{ fontSize: 11, color: '#1F4030', textAlign: 'center', lineHeight: 1.5 }}>
              Not receiving emails? Confirm email is now disabled in Supabase — try signing up again with a new email.
            </div>
            {resendSent && <div style={{ color: '#6EE7B7', fontSize: 13, textAlign: 'center' }}>Verification email sent. Check your inbox.</div>}
            {error && <div style={{ color: '#FB7185', fontSize: 13 }}>{error}</div>}
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: '1px solid rgba(110,231,183,0.3)',
                background: 'rgba(16,185,129,0.15)',
                color: '#6EE7B7',
                fontSize: 14,
                fontWeight: 600,
                opacity: resending ? 0.7 : 1,
              }}
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
            <button
              type="button"
              onClick={() => { setPendingConfirmation(null); setResendSent(false); setError('') }}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(110,231,183,0.15)',
                background: 'transparent',
                color: '#2D5B3F',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Back
            </button>
          </div>
        ) : tab === 'signin' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>
            {error && <div style={{ color: '#FB7185', fontSize: 13 }}>{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Password (min 6 characters)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>
            {error && <div style={{ color: '#FB7185', fontSize: 13 }}>{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EC4899)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(249,115,22,0.25)',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
