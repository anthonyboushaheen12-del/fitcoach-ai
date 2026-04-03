'use client'

import { useState } from 'react'

function CardShell({ borderGradient, children, className = '' }) {
  return (
    <div
      className={`glass goal-result-card ${className}`}
      style={{
        padding: 0,
        marginBottom: 16,
        overflow: 'hidden',
        border: '1px solid rgba(110,231,183,0.08)',
        background: 'rgba(14, 20, 14, 0.92)',
      }}
    >
      <div style={{ height: 4, background: borderGradient }} />
      <div style={{ padding: '18px 18px 20px' }}>{children}</div>
    </div>
  )
}

export default function GoalResults({
  plan,
  goalText,
  onDiscuss,
  onApply,
  onRegenerate,
  onShare,
  applyLoading,
  regenerateLoading,
  trainerEmoji = '💪',
}) {
  const [checklist, setChecklist] = useState(() => {
    const items = Array.isArray(plan?.dailyChecklist) ? plan.dailyChecklist : []
    return items.map(() => false)
  })

  if (!plan) return null

  const gs = plan.goalSummary || {}
  const milestones = Array.isArray(plan.milestones) ? plan.milestones : []
  const nutrition = plan.nutrition || {}
  const exercise = plan.exercise || {}
  const meals = Array.isArray(nutrition.meals) ? nutrition.meals : []
  const days = Array.isArray(exercise.days) ? exercise.days : []
  const cardio = Array.isArray(exercise.cardio) ? exercise.cardio : []
  const special = Array.isArray(exercise.specialFocus) ? exercise.specialFocus : []
  const rules = Array.isArray(nutrition.keyRules) ? nutrition.keyRules : []
  const checklistItems = Array.isArray(plan.dailyChecklist)
    ? plan.dailyChecklist
    : []

  const calDisplay =
    gs.dailyCalories != null && gs.dailyCalories !== ''
      ? `${gs.dailyCalories} cal`
      : nutrition.dailyCalories || '—'

  return (
    <div className="goal-results-root" style={{ paddingBottom: 24 }}>
      <CardShell borderGradient="linear-gradient(90deg, #F97316, #EC4899, #6EE7B7, #93C5FD)">
        <div style={{ fontSize: 11, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>
          YOUR OBJECTIVE
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 10, lineHeight: 1.35 }}>
          &ldquo;{goalText || gs.objective || 'Your goal'}&rdquo;
        </p>
        {gs.objective && goalText !== gs.objective ? (
          <p style={{ fontSize: 13, color: '#A7C4B8', marginTop: 8 }}>{gs.objective}</p>
        ) : null}
        <ul style={{ listStyle: 'none', marginTop: 14, padding: 0, fontSize: 13, color: '#D1FAE5', lineHeight: 1.8 }}>
          {gs.estimatedTimeline ? (
            <li>⏱️ Estimated Timeline: <strong>{gs.estimatedTimeline}</strong></li>
          ) : null}
          <li>🔥 Daily Calorie Target: <strong>{calDisplay}</strong>{gs.dailyDeficitOrSurplus ? ` (${gs.dailyDeficitOrSurplus})` : ''}</li>
          {gs.weeklyTargetChange ? (
            <li>📊 Weekly change: <strong>{gs.weeklyTargetChange}</strong></li>
          ) : null}
          {gs.difficulty ? (
            <li>⚡ Difficulty: <strong>{gs.difficulty}</strong></li>
          ) : null}
        </ul>
        {gs.explanation ? (
          <p style={{ fontSize: 13, color: '#8BAFA0', marginTop: 12, lineHeight: 1.55 }}>
            {gs.explanation}
          </p>
        ) : null}
      </CardShell>

      {milestones.length > 0 ? (
        <CardShell borderGradient="linear-gradient(90deg, #10B981, #6EE7B7)">
          <div style={{ fontSize: 11, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>
            📅 YOUR ROADMAP
          </div>
          <div className="goal-milestone-list" style={{ marginTop: 16 }}>
            {milestones.map((m, i) => (
              <div key={i} className="goal-milestone-item">
                <div className="goal-milestone-dot-wrap">
                  <span className="goal-milestone-dot" />
                  {i < milestones.length - 1 ? <span className="goal-milestone-line" /> : null}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: i < milestones.length - 1 ? 18 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {m.weeks ? `${m.weeks}: ` : ''}{m.phase || `Phase ${i + 1}`}
                  </div>
                  {Array.isArray(m.tasks)
                    ? m.tasks.map((t, j) => (
                        <div key={j} style={{ fontSize: 13, color: '#A7C4B8', marginTop: 6, paddingLeft: 2 }}>
                          ● {t}
                        </div>
                      ))
                    : null}
                  {m.target ? (
                    <div style={{ fontSize: 12, color: '#6EE7B7', marginTop: 8, fontWeight: 600 }}>
                      Target: {m.target}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      ) : null}

      <CardShell borderGradient="linear-gradient(90deg, #F97316, #FBBF24)">
        <div style={{ fontSize: 11, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>
          🥗 NUTRITION PLAN
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 12 }}>Daily Targets</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginTop: 10,
          }}
        >
          {[
            { label: 'cal', value: nutrition.dailyCalories || String(gs.dailyCalories ?? '—') },
            { label: 'prot', value: nutrition.protein || '—' },
            { label: 'carbs', value: nutrition.carbs || '—' },
            { label: 'fats', value: nutrition.fats || '—' },
          ].map((cell) => (
            <div
              key={cell.label}
              className="glass-sm"
              style={{
                padding: '10px 6px',
                textAlign: 'center',
                background: 'rgba(8,12,8,0.55)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: '#6EE7B7' }}>{cell.value}</div>
              <div style={{ fontSize: 9, color: '#2D5B3F', fontWeight: 700, marginTop: 4 }}>{cell.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 18 }}>Sample Day</div>
        <div style={{ marginTop: 10 }}>
          {meals.map((meal, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 0',
                borderBottom: idx < meals.length - 1 ? '1px solid rgba(110,231,183,0.06)' : 'none',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D1FAE5' }}>
                {(meal.emoji ? `${meal.emoji} ` : '🍽️ ')}{meal.name || 'Meal'}{' '}
                <span style={{ fontWeight: 500, color: '#4A6B58' }}>
                  — {meal.calories != null ? `${meal.calories} cal` : ''}{meal.protein != null ? ` | ${meal.protein}g P` : ''}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8BAFA0', marginTop: 4, lineHeight: 1.45 }}>
                {meal.description}
              </div>
            </div>
          ))}
        </div>
        {rules.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 16 }}>Key Rules</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#A7C4B8', fontSize: 13, lineHeight: 1.6 }}>
              {rules.map((r, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{r}</li>
              ))}
            </ul>
          </>
        ) : null}
      </CardShell>

      <CardShell borderGradient="linear-gradient(90deg, #10B981, #34D399)">
        <div style={{ fontSize: 11, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>
          🏋️ EXERCISE PLAN
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 12 }}>
          Split: {exercise.splitType || '—'}
        </div>
        {days.map((day, di) => (
          <div key={di} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6EE7B7' }}>{day.name || `Day ${di + 1}`}</div>
            {day.focus ? (
              <div style={{ fontSize: 12, color: '#4A6B58', marginTop: 2 }}>{day.focus}</div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              {Array.isArray(day.exercises)
                ? day.exercises.map((ex, ei) => (
                    <div
                      key={ei}
                      style={{
                        fontSize: 12,
                        color: '#D1FAE5',
                        padding: '6px 0',
                        borderBottom:
                          ei < day.exercises.length - 1 ? '1px solid rgba(110,231,183,0.05)' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        {ei + 1}. {ex.name}
                      </span>
                      <span style={{ color: '#2D5B3F', fontWeight: 600 }}>
                        {ex.sets}
                        {ex.intensity ? ` · ${ex.intensity}` : ''}
                        {ex.rest ? ` · ${ex.rest}` : ''}
                      </span>
                    </div>
                  ))
                : null}
            </div>
          </div>
        ))}
        {cardio.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Cardio Protocol</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#A7C4B8', fontSize: 13, lineHeight: 1.55 }}>
              {cardio.map((c, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {special.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Special focus</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#A7C4B8', fontSize: 13, lineHeight: 1.55 }}>
              {special.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {s.name}
                  {s.sets ? ` — ${s.sets}` : ''}
                  {s.frequency ? ` (${s.frequency})` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardShell>

      <CardShell borderGradient="linear-gradient(90deg, #60A5FA, #93C5FD)">
        <div style={{ fontSize: 11, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>
          ✅ DAILY CHECKLIST
        </div>
        <div style={{ marginTop: 12 }}>
          {checklistItems.map((line, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 10,
                cursor: 'pointer',
                fontSize: 13,
                color: '#D1FAE5',
              }}
            >
              <input
                type="checkbox"
                checked={!!checklist[i]}
                onChange={(e) => {
                  const next = [...checklist]
                  next[i] = e.target.checked
                  setChecklist(next)
                }}
                style={{ marginTop: 3, width: 18, height: 18, accentColor: '#10B981' }}
              />
              <span style={{ opacity: checklist[i] ? 0.65 : 1, textDecoration: checklist[i] ? 'line-through' : 'none' }}>
                {line}
              </span>
            </label>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#4A6B58', marginTop: 8, lineHeight: 1.45, fontStyle: 'italic' }}>
          Consistency beats perfection. Hit most of these daily and you WILL make progress.
        </p>
      </CardShell>

      {plan.trainerNote ? (
        <div
          className="glass-sm"
          style={{
            padding: 16,
            marginBottom: 16,
            border: '1px solid rgba(110,231,183,0.12)',
            background: 'rgba(14, 20, 14, 0.75)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#2D5B3F' }}>
            {trainerEmoji} From your trainer
          </div>
          <p style={{ fontSize: 14, color: '#E2FBE8', marginTop: 8, lineHeight: 1.5 }}>{plan.trainerNote}</p>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={onDiscuss}
          className="glass-sm"
          style={{
            width: '100%',
            padding: 14,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(14,20,14,0.65)',
            color: '#6EE7B7',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 14,
          }}
        >
          💬 Discuss with Trainer
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applyLoading}
          style={{
            width: '100%',
            padding: 14,
            border: 'none',
            borderRadius: 14,
            background: applyLoading ? 'rgba(74,107,88,0.5)' : 'linear-gradient(135deg, #10B981, #6EE7B7)',
            color: applyLoading ? '#6B8F7A' : '#070B07',
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {applyLoading ? 'Applying…' : '📋 Apply to My Plans'}
        </button>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onShare}
            className="glass-sm"
            style={{
              flex: '1 1 140px',
              padding: 12,
              border: '1px solid rgba(110,231,183,0.15)',
              background: 'rgba(14,20,14,0.55)',
              color: '#D1FAE5',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 12,
            }}
          >
            📤 Share / Copy
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerateLoading}
            className="glass-sm"
            style={{
              flex: '1 1 140px',
              padding: 12,
              border: '1px solid rgba(110,231,183,0.15)',
              background: 'rgba(14,20,14,0.55)',
              color: regenerateLoading ? '#4A6B58' : '#6EE7B7',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 12,
            }}
          >
            {regenerateLoading ? '…' : '🔄 Regenerate'}
          </button>
        </div>
      </div>
    </div>
  )
}
