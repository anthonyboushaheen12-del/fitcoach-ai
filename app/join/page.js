'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '../components/AuthProvider'
import BrandedAuthLoading from '../components/BrandedAuthLoading'

/**
 * Public entry for sharing: does not auto-redirect to the dashboard.
 * Guests always see sign-in / sign-up paths; signed-in users see an optional strip to continue.
 */
export default function JoinPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, profileLoading, signOut } = useAuth()

  if (authLoading || profileLoading) {
    return <BrandedAuthLoading />
  }

  if (user && !profile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass"
          style={{ width: '100%', maxWidth: 400, padding: 28, textAlign: 'center' }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>Finish your setup</h1>
          <p style={{ fontSize: 14, color: '#8BAFA0', lineHeight: 1.5, marginBottom: 20 }}>
            You’re signed in as <span style={{ color: '#6EE7B7' }}>{user.email}</span>. Continue onboarding to use FitCoach AI.
          </p>
          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            Continue setup
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(110,231,183,0.2)',
              background: 'transparent',
              color: '#A7C4B8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </motion.div>
      </div>
    )
  }

  const signedIn = Boolean(user && profile)

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 28, maxWidth: 420 }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 10 }}>
          <span style={{ color: '#6EE7B7' }}>Fit</span>
          <span style={{ color: '#fff' }}>Coach</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #F97316, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginLeft: 6,
            }}
          >
            AI
          </span>
        </h1>
        <p style={{ color: '#A7C4B8', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          Your AI-powered training coach. Create an account or sign in—each person uses their own login on their own device.
        </p>
      </motion.div>

      {signedIn && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass"
          style={{
            width: '100%',
            maxWidth: 400,
            padding: 16,
            marginBottom: 20,
            borderRadius: 14,
            border: '1px solid rgba(110,231,183,0.2)',
          }}
        >
          <div style={{ fontSize: 13, color: '#8BAFA0', marginBottom: 12 }}>
            You’re already signed in as <span style={{ color: '#6EE7B7' }}>{user.email}</span>.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Go to dashboard
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(110,231,183,0.2)',
                background: 'transparent',
                color: '#A7C4B8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign out and use a different account
            </button>
          </div>
        </motion.div>
      )}

      {!signedIn && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass"
          style={{ width: '100%', maxWidth: 400, padding: 24 }}
        >
          <div style={{ fontSize: 13, color: '#2D5B3F', fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            New here or returning?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link
              href="/?tab=signin"
              style={{
                display: 'block',
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
            <Link
              href="/?tab=signup"
              style={{
                display: 'block',
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: '2px solid rgba(110,231,183,0.35)',
                background: 'rgba(16,185,129,0.08)',
                color: '#6EE7B7',
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Create account
            </Link>
          </div>
          <p style={{ fontSize: 11, color: '#1F4030', textAlign: 'center', marginTop: 18, lineHeight: 1.45, marginBottom: 0 }}>
            Need a clean browser state? Open the home page with <strong style={{ color: '#5BA37A' }}>?signout=1</strong> to sign out first.
          </p>
        </motion.div>
      )}
    </div>
  )
}
