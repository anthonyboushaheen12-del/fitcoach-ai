'use client'

import { motion } from 'framer-motion'
import { getDailyMacroTargets } from '../../lib/daily-macro-targets'

export default function DailyMacrosCard({
  profile,
  mealContent,
  workoutContent,
  todayMeals,
  cardDelay = 0,
}) {
  const targets = getDailyMacroTargets(mealContent, profile, workoutContent)
  const actual = todayMeals.reduce(
    (a, m) => ({
      cal: a.cal + (parseFloat(m.total_calories) || 0),
      p: a.p + (parseFloat(m.total_protein) || 0),
      c: a.c + (parseFloat(m.total_carbs) || 0),
      f: a.f + (parseFloat(m.total_fats) || 0),
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  )

  const macros = [
    { label: 'Calories', actual: Math.round(actual.cal), target: targets.calories, color: '#6EE7B7' },
    { label: 'Protein', actual: actual.p.toFixed(1), target: targets.protein, color: '#FBBF24' },
    { label: 'Carbs', actual: actual.c.toFixed(1), target: targets.carbs, color: '#93C5FD' },
    { label: 'Fats', actual: actual.f.toFixed(1), target: targets.fats, color: '#FB7185' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardDelay / 1000 }}
      className="glass"
      style={{
        padding: 16,
        marginBottom: 14,
        border: '1px solid rgba(110,231,183,0.12)',
        background: 'rgba(14, 20, 14, 0.92)',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>TODAY · MACROS</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 6 }}>
        {targets.source === 'plan' ? 'Targets from your meal plan' : 'Estimated targets'}
      </div>
      {targets.note ? (
        <p style={{ fontSize: 11, color: '#5A7A68', marginTop: 6, lineHeight: 1.4, marginBottom: 0 }}>{targets.note}</p>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        {macros.map((m, i) => {
          const pct = Math.min(1, Number(m.actual) / Math.max(Number(m.target), 1))
          return (
            <div key={i} className="glass-sm" style={{ padding: 0, overflow: 'hidden', background: 'rgba(8,12,8,0.55)' }}>
              <div style={{ height: 2, background: m.color, opacity: 0.5 }} />
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width={32} height={32} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                  <circle cx={16} cy={16} r={12} fill="none" stroke="rgba(110,231,183,0.1)" strokeWidth={3} />
                  <circle
                    cx={16}
                    cy={16}
                    r={12}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={3}
                    strokeDasharray={`${pct * 75.4} 75.4`}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#2D5B3F', fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>
                    {m.actual}/{m.target}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
