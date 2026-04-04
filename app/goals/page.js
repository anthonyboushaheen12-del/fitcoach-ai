'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getTrainer } from '../../lib/trainers'
import { applyGoalToPlans } from '../../lib/apply-goal-to-plans'
import { useAuth, readCachedProfileForUser } from '../components/AuthProvider'
import BrandedAuthLoading from '../components/BrandedAuthLoading'
import { useProfileResolutionTimeout } from '../hooks/useProfileResolutionTimeout'
import GoalResults from '../components/GoalResults'
import GoalHistory from '../components/GoalHistory'

async function jsonHeadersWithAuth() {
  const headers = { 'Content-Type': 'application/json' }
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

const QUICK_GOALS = [
  'Lose 5kg of fat while keeping muscle',
  'Build muscle and get stronger over the next 3 months',
  'Get visible abs in 12 weeks',
  'Run a 5K in under 25 minutes',
  'Improve posture and reduce back pain',
  'Gain 3kg of lean muscle',
  'Get stronger on squat, bench, and deadlift',
]

const LOADING_FACTS = [
  '1kg of fat ≈ 7,700 kcal of cumulative deficit — patience wins.',
  'Losing about 0.5–1% of body weight per week is a sustainable pace for most people.',
  'Protein around 1.8–2.2 g/kg helps preserve muscle in a deficit.',
  'Progressive overload drives muscle growth more than any supplement.',
  'Sleep 7–9 hours — recovery is when adaptations consolidate.',
  'A ~500 kcal/day deficit often lines up with roughly 0.5 kg/week fat loss — individual variation applies.',
]

function GoalsContent() {
  const router = useRouter()
  const { user, profile, profileLoading, loading: authLoading, refreshProfile } = useAuth()
  const profileResolutionTimedOut = useProfileResolutionTimeout(user, profile, 3000)

  const [goalInput, setGoalInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [factIndex, setFactIndex] = useState(0)
  const [plan, setPlan] = useState(null)
  const [goalId, setGoalId] = useState(null)
  const [error, setError] = useState(null)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [regenerateLoading, setRegenerateLoading] = useState(false)
  const [historyTick, setHistoryTick] = useState(0)

  const trainer = profile ? getTrainer(profile.trainer) : getTrainer('bro')

  useEffect(() => {
    if (!user) router.push('/')
    else if (user && !profile && !profileLoading && !authLoading && profileResolutionTimedOut) {
      if (readCachedProfileForUser(user.id)?.id) {
        refreshProfile()
        return
      }
      router.push('/onboarding')
    }
  }, [user, profile, profileLoading, authLoading, profileResolutionTimedOut, router, refreshProfile])

  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => {
      setFactIndex((i) => (i + 1) % LOADING_FACTS.length)
    }, 3000)
    return () => clearInterval(t)
  }, [loading])

  async function submitGoal(replaceConfirmed = false) {
    if (!profile?.id || !goalInput.trim()) return
    setError(null)
    setLoading(true)
    setPlan(null)
    setGoalId(null)

    try {
      const headers = await jsonHeadersWithAuth()
      const res = await fetch('/api/goal-engine', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: goalInput.trim(),
          profileId: profile.id,
          profile,
          trainerId: profile.trainer,
          replaceConfirmed,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409 && data.error === 'ACTIVE_GOAL_EXISTS') {
        setLoading(false)
        setReplaceOpen(true)
        return
      }

      if (!res.ok) {
        setLoading(false)
        setError(data.details || data.error || `Request failed (${res.status})`)
        return
      }

      setPlan(data.plan)
      setGoalId(data.goalId || null)
      setHistoryTick((t) => t + 1)
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function confirmReplace() {
    setReplaceOpen(false)
    submitGoal(true)
  }

  async function handleApply() {
    if (!supabase || !profile?.id || !plan) return
    setApplyLoading(true)
    setError(null)
    try {
      const result = await applyGoalToPlans(
        supabase,
        profile.id,
        plan,
        profile.trainer || 'bro'
      )
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
      }
    } catch (e) {
      setError(e.message || 'Apply failed')
    } finally {
      setApplyLoading(false)
    }
  }

  function handleDiscuss() {
    const g = goalInput.trim() || plan?.goalSummary?.objective || 'reach my goal'
    const msg = `I just set a goal to ${g}. Can you help me understand the plan and stay accountable?`
    router.push(`/chat?prefill=${encodeURIComponent(msg)}`)
  }

  async function handleShare() {
    const g = goalInput.trim() || plan?.goalSummary?.objective || 'My FitCoach goal'
    const summary = plan?.goalSummary
    const line = summary
      ? `${g}\nTimeline: ${summary.estimatedTimeline || '—'}\nCalories: ${summary.dailyCalories ?? '—'}`
      : g
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/goals` : ''
    const text = `${line}\n\n${url}`
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied summary to clipboard.')
    } catch {
      alert('Could not copy — select and copy manually.')
    }
  }

  async function handleRegenerate() {
    const text = goalInput.trim() || plan?.goalSummary?.objective || ''
    if (!text || !profile?.id) return

    setRegenerateLoading(true)
    setError(null)
    try {
      const headers = await jsonHeadersWithAuth()
      const res = await fetch('/api/goal-engine', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: text,
          profileId: profile.id,
          profile,
          trainerId: profile.trainer,
          replaceConfirmed: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.details || data.error || `Request failed (${res.status})`)
        return
      }
      setPlan(data.plan)
      setGoalId(data.goalId || null)
      setHistoryTick((t) => t + 1)
    } catch (e) {
      setError(e.message || 'Regenerate failed')
    } finally {
      setRegenerateLoading(false)
    }
  }

  if (!user || (user && !profile && (profileLoading || authLoading))) {
    return <BrandedAuthLoading />
  }

  if (user && !profile && !profileLoading && !authLoading && !profileResolutionTimedOut) {
    return <BrandedAuthLoading />
  }

  if (!profile) return null

  return (
    <div className="dashboard-app-container" style={{ paddingTop: 18, paddingBottom: 32 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            🎯 Goals
          </h1>
          <p style={{ fontSize: 13, color: '#8BAFA0', marginTop: 6, lineHeight: 1.45 }}>
            One clear objective → full roadmap, nutrition, training, and daily checks.
          </p>
        </div>

        <div className="glass" style={{ padding: 18, marginBottom: 20, background: 'rgba(14,20,14,0.92)' }}>
          <label
            htmlFor="goal-input"
            style={{ fontSize: 15, fontWeight: 800, color: '#fff', display: 'block', marginBottom: 10 }}
          >
            What do you want to achieve?
          </label>
          <textarea
            id="goal-input"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value.slice(0, 2000))}
            placeholder="e.g. Lose 3kg of fat in 2 months while keeping muscle"
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(110,231,183,0.15)',
              background: 'rgba(8,12,8,0.55)',
              color: '#E2FBE8',
              resize: 'vertical',
              minHeight: 88,
            }}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 8 }}>Quick goals</div>
            <div
              className="goal-pills-scroll"
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 6,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {QUICK_GOALS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setGoalInput(q)}
                  className="glass-sm goal-quick-pill"
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px',
                    borderRadius: 100,
                    border: '1px solid rgba(110,231,183,0.18)',
                    background: 'rgba(14,20,14,0.65)',
                    color: '#6EE7B7',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {q.length > 32 ? `${q.slice(0, 30)}…` : q}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={loading || !goalInput.trim()}
            onClick={() => submitGoal(false)}
            style={{
              width: '100%',
              marginTop: 16,
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background:
                loading || !goalInput.trim()
                  ? 'rgba(74,107,88,0.4)'
                  : 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: loading || !goalInput.trim() ? '#6B8F7A' : '#070B07',
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {loading ? '…' : '🚀 Build My Action Plan'}
          </button>
          <p style={{ fontSize: 11, color: '#4A6B58', marginTop: 10, textAlign: 'center' }}>
            Powered by your AI trainer {trainer.emoji}
          </p>
        </div>

        {loading ? (
          <div
            className="glass"
            style={{
              padding: 32,
              textAlign: 'center',
              marginBottom: 20,
              background: 'rgba(14,20,14,0.92)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Building your action plan…</div>
            <div
              style={{
                marginTop: 20,
                height: 6,
                borderRadius: 100,
                background: 'rgba(110,231,183,0.12)',
                overflow: 'hidden',
              }}
            >
              <div className="auth-loading-bar-inner" style={{ width: '45%' }} />
            </div>
            <p
              key={factIndex}
              style={{
                fontSize: 13,
                color: '#A7C4B8',
                marginTop: 20,
                lineHeight: 1.5,
                fontStyle: 'italic',
                minHeight: 60,
              }}
            >
              {LOADING_FACTS[factIndex]}
            </p>
          </div>
        ) : null}

        {error ? (
          <div
            className="glass"
            style={{
              padding: 18,
              marginBottom: 16,
              border: '1px solid rgba(251,113,133,0.35)',
              background: 'rgba(20,12,14,0.9)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FB7185' }}>Couldn&apos;t build plan</div>
            <p style={{ fontSize: 13, color: '#FECACA', marginTop: 8 }}>{error}</p>
            <button
              type="button"
              onClick={() => submitGoal(false)}
              className="glass-sm"
              style={{
                marginTop: 12,
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid rgba(110,231,183,0.2)',
                background: 'rgba(14,20,14,0.8)',
                color: '#6EE7B7',
                fontWeight: 700,
              }}
            >
              Try Again
            </button>
          </div>
        ) : null}

        {plan ? (
          <GoalResults
            key={goalId || 'draft'}
            plan={plan}
            goalText={goalInput.trim()}
            onDiscuss={handleDiscuss}
            onApply={handleApply}
            onRegenerate={handleRegenerate}
            onShare={handleShare}
            applyLoading={applyLoading}
            regenerateLoading={regenerateLoading}
            trainerEmoji={trainer.emoji}
          />
        ) : null}

        <GoalHistory
          profileId={profile.id}
          currentWeightKg={profile.weight_kg}
          refreshKey={historyTick}
        />
      </motion.div>

      {replaceOpen ? (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setReplaceOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 400,
              width: '100%',
              padding: 22,
              background: 'rgba(14,20,14,0.98)',
              border: '1px solid rgba(110,231,183,0.2)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Replace your current goal?</div>
            <p style={{ fontSize: 14, color: '#A7C4B8', marginTop: 12, lineHeight: 1.5 }}>
              You already have an active goal. Generating a new plan will archive it and start fresh.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setReplaceOpen(false)}
                className="glass-sm"
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(110,231,183,0.15)',
                  background: 'transparent',
                  color: '#A7C4B8',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReplace}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                  color: '#070B07',
                  fontWeight: 800,
                }}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<BrandedAuthLoading />}>
      <GoalsContent />
    </Suspense>
  )
}
