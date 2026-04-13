'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'

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

function excerptPlan(obj, max = 3800) {
  if (!obj) return ''
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj)
    return s.length > max ? `${s.slice(0, max)}\n… (truncated)` : s
  } catch {
    return ''
  }
}

export default function PlanCoachPanel({
  profile,
  activeWorkoutContent,
  activeMealContent,
  workoutPrefs,
  mealPrefs,
  bodyGoalDescription,
  bodyAnalysis,
  defaultOpen,
  seedMessage,
  onRefreshPlans,
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const seedAppliedRef = useRef(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState(null)

  const [adjustText, setAdjustText] = useState('')
  const [adjustScope, setAdjustScope] = useState('workout')
  const [adjustBusy, setAdjustBusy] = useState(false)
  const [adjustError, setAdjustError] = useState(null)
  const [adjustOk, setAdjustOk] = useState(null)

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  useEffect(() => {
    if (!seedMessage || typeof seedMessage !== 'string' || !seedMessage.trim() || seedAppliedRef.current) return
    seedAppliedRef.current = true
    setInput(seedMessage.trim())
    setOpen(true)
  }, [seedMessage])

  const sendQuestion = useCallback(async () => {
    const q = input.trim()
    if (!q || !profile?.id) return
    setAskError(null)
    setAsking(true)
    const history = messages.map((m) => ({ role: m.role, text: m.text }))
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    try {
      const res = await fetch('/api/plan-qa', {
        method: 'POST',
        headers: await jsonHeadersWithAuth(),
        body: JSON.stringify({
          profileId: profile.id,
          question: q,
          history,
          workoutExcerpt: excerptPlan(activeWorkoutContent),
          mealExcerpt: excerptPlan(activeMealContent),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.details || `Request failed (${res.status})`)
      }
      const reply = data.reply || 'No response.'
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (e) {
      setAskError(e?.message || 'Something went wrong')
      setMessages((prev) => prev.slice(0, -1))
      setInput(q)
    } finally {
      setAsking(false)
    }
  }, [input, profile?.id, messages, activeWorkoutContent, activeMealContent])

  async function submitAdjust() {
    const text = adjustText.trim()
    if (!text || !profile?.id) return
    setAdjustBusy(true)
    setAdjustError(null)
    setAdjustOk(null)
    try {
      const tid = profile.trainer || 'bro'
      const workoutPreferences = {
        ...(workoutPrefs || {}),
        bodyGoalDescription: bodyGoalDescription?.trim() || undefined,
      }
      const mealPreferences = {
        ...(mealPrefs || {}),
        bodyGoalDescription: bodyGoalDescription?.trim() || undefined,
      }
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: await jsonHeadersWithAuth(),
        body: JSON.stringify({
          profileId: profile.id,
          profile: { ...profile, trainer: tid },
          trainerId: tid,
          onboardingContext: profile?.onboarding_context,
          type: adjustScope,
          workoutPreferences,
          mealPreferences,
          bodyAnalysis: bodyAnalysis || null,
          programAdjustments: text,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || 'Could not update your program')
      }
      await onRefreshPlans?.()
      setAdjustText('')
      setAdjustOk('Program updated.')
      setTimeout(() => setAdjustOk(null), 3000)
    } catch (e) {
      setAdjustError(e?.message || 'Update failed')
    } finally {
      setAdjustBusy(false)
    }
  }

  return (
    <div className="glass" style={{ marginBottom: 20, border: '1px solid rgba(110,231,183,0.12)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          border: 'none',
          background: open ? 'rgba(16,185,129,0.08)' : 'transparent',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          color: '#6EE7B7',
          fontSize: 14,
          fontWeight: 700,
          textAlign: 'left',
        }}
      >
        <span>Plan coach — ask questions or tweak your program</span>
        <span style={{ color: '#2D5B3F' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(110,231,183,0.06)' }}>
          <p style={{ fontSize: 12, color: '#4A6B58', lineHeight: 1.45, margin: '12px 0' }}>
            Ask about today&apos;s exercises, swaps, or nutrition. To save changes to your generated plan, describe what you want below and run update (no need to redo the full quiz).
          </p>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 6 }}>UPDATE PROGRAM</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'workout', label: 'Workout' },
              { id: 'meal', label: 'Meals' },
              { id: 'both', label: 'Both' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAdjustScope(o.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: adjustScope === o.id ? '2px solid rgba(110,231,183,0.4)' : '1px solid rgba(110,231,183,0.15)',
                  background: adjustScope === o.id ? 'rgba(110,231,183,0.12)' : 'transparent',
                  color: adjustScope === o.id ? '#6EE7B7' : '#2D5B3F',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={adjustText}
            onChange={(e) => setAdjustText(e.target.value)}
            placeholder="One question or instruction, e.g. “Swap barbell bench for dumbbells — bad shoulder” or “More protein at lunch”"
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(110,231,183,0.12)',
              background: 'rgba(14,20,14,0.55)',
              color: '#E2FBE8',
              fontSize: 14,
              marginBottom: 8,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: '#4A6B58' }}>{adjustText.length}/2000</span>
            <button
              type="button"
              onClick={submitAdjust}
              disabled={adjustBusy || !adjustText.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                border: 'none',
                background:
                  adjustBusy || !adjustText.trim()
                    ? 'rgba(110,231,183,0.15)'
                    : 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: adjustBusy || !adjustText.trim() ? '#6B8F7A' : '#070B07',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {adjustBusy ? 'Updating…' : 'Apply to plan'}
            </button>
          </div>
          {adjustError && <div style={{ color: '#FB7185', fontSize: 12, marginBottom: 8 }}>{adjustError}</div>}
          {adjustOk && <div style={{ color: '#6EE7B7', fontSize: 12, marginBottom: 8 }}>{adjustOk}</div>}

          <div style={{ height: 1, background: 'rgba(110,231,183,0.08)', margin: '14px 0' }} />

          <div style={{ fontSize: 11, fontWeight: 700, color: '#2D5B3F', marginBottom: 8 }}>ASK A QUESTION</div>
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              marginBottom: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div style={{ fontSize: 12, color: '#4A6B58' }}>e.g. “What should I do if my knee hurts on lunges?”</div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: m.role === 'user' ? 'rgba(16,185,129,0.18)' : 'rgba(14,20,14,0.65)',
                  border: '1px solid rgba(110,231,183,0.1)',
                  fontSize: 13,
                  color: m.role === 'user' ? '#D1FAE5' : '#A7C4B8',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            ))}
          </div>
          {askError && <div style={{ color: '#FB7185', fontSize: 12, marginBottom: 8 }}>{askError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendQuestion())}
              placeholder="Ask about your plan…"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(110,231,183,0.12)',
                background: 'rgba(14,20,14,0.55)',
                color: '#E2FBE8',
                fontSize: 14,
              }}
            />
            <button
              type="button"
              onClick={sendQuestion}
              disabled={asking || !input.trim()}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                background: asking || !input.trim() ? 'rgba(110,231,183,0.15)' : 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: asking || !input.trim() ? '#6B8F7A' : '#070B07',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {asking ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
