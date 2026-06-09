'use client'

import { motion } from 'framer-motion'

export default function TodaysMealsCard({
  todayMeals,
  onLogMeal,
  onScanMeal,
  onCreateMealPlan,
  hasMealPlan,
  cardDelay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardDelay / 1000 }}
      className="glass"
      style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(110,231,183,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#2D5B3F', letterSpacing: 0.6 }}>MEALS</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 4 }}>
            Today ({todayMeals.length} logged)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {onScanMeal ? (
            <button
              type="button"
              onClick={onScanMeal}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              📷 Scan
            </button>
          ) : null}
          <button
            type="button"
            onClick={onLogMeal}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid rgba(110,231,183,0.35)',
              background: 'rgba(16,185,129,0.2)',
              color: '#6EE7B7',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            + Log meal
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 16px 14px' }}>
        {todayMeals.length === 0 ? (
          <p style={{ fontSize: 12, color: '#5C7066', margin: 0, lineHeight: 1.45 }}>
            Log foods, describe a meal, or use a photo to estimate macros.
          </p>
        ) : (
          todayMeals.map((meal, i) => (
            <div
              key={meal.id || i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: i < todayMeals.length - 1 ? '1px solid rgba(110,231,183,0.06)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {meal.meal_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={meal.meal_photo_url}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : null}
                <span style={{ fontSize: 12, color: '#D1FAE5' }}>
                  {meal.meal_name} · {new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600, flexShrink: 0 }}>
                {Math.round(parseFloat(meal.total_calories) || 0)} cal · {parseFloat(meal.total_protein || 0).toFixed(1)}g P
              </span>
            </div>
          ))
        )}
        {!hasMealPlan && (
          <button
            type="button"
            onClick={onCreateMealPlan}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: '1px dashed rgba(249,115,22,0.35)',
              background: 'transparent',
              color: '#F97316',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Get a personalized meal plan (Program tab)
          </button>
        )}
      </div>
    </motion.div>
  )
}
