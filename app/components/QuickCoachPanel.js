'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { mealPlanAuthoritativeSummary } from '../../lib/meal-plan-summary'

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

const SUGGESTED = [
  'What should I eat before training?',
  'My knee feels off — what should I avoid today?',
  'How do I hit protein if I skip meat?',
]

/** Compact Q&A for Home; full coach stays on Program tab. */
export default function QuickCoachPanel({ profile, activeWorkoutContent, activeMealContent, cardDelay = 0 }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState(null)

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
          mealTargetsSummary: mealPlanAuthoritativeSummary(activeMealContent),
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

  const onPickSuggested = (text) => {
    setInput(text)
    setAskError(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardDelay / 1000 }}
      className="glass"
      style={{
        padding: 14,
        marginBottom: 14,
        border: '1px solid rgba(110,231,183,0.12)',
        background: 'rgba(14, 20, 14, 0.92)',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>QUICK QUESTIONS</div>
      <p style={{ fontSize: 12, color: '#6B8F7A', marginTop: 6, lineHeight: 1.45, marginBottom: 10 }}>
        Ask your coach about today&apos;s training or food. For longer chats, open the Program tab.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSuggested(s)}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(110,231,183,0.2)',
              background: 'rgba(16,185,129,0.08)',
              color: '#8BC9A8',
              fontSize: 11,
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div
        style={{
          maxHeight: 120,
          overflowY: 'auto',
          marginBottom: 10,
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        {messages.length === 0 ? (
          <span style={{ color: '#3D5248' }}>Replies appear here.</span>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                color: m.role === 'user' ? '#D1FAE5' : '#A7C4B8',
                whiteSpace: 'pre-wrap',
              }}
            >
              <strong style={{ color: '#6EE7B7' }}>{m.role === 'user' ? 'You' : 'Coach'}:</strong> {m.text}
            </div>
          ))
        )}
      </div>
      {askError ? <p style={{ color: '#FB7185', fontSize: 12, margin: '0 0 8px' }}>{askError}</p> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 500))}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendQuestion())}
          placeholder="Ask anything…"
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.15)',
            background: 'rgba(8,12,8,0.65)',
            color: '#E2FBE8',
            fontSize: 13,
          }}
        />
        <button
          type="button"
          disabled={asking || !input.trim()}
          onClick={() => sendQuestion()}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: asking || !input.trim() ? 'rgba(74,107,88,0.4)' : 'linear-gradient(135deg, #10B981, #6EE7B7)',
            color: asking || !input.trim() ? '#6B8F7A' : '#070B07',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {asking ? '…' : 'Ask'}
        </button>
      </div>
    </motion.div>
  )
}
