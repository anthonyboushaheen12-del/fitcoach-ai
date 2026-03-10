'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'snack', label: 'Snack', emoji: '🍌' },
  { id: 'dinner', label: 'Dinner', emoji: '🥩' },
  { id: 'other', label: 'Other', emoji: '🥛' },
]

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export default function FoodLogModal({ open, onClose, profileId, onLog }) {
  const [mealType, setMealType] = useState('breakfast')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (!debouncedSearch?.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    fetch(`/api/food-search?q=${encodeURIComponent(debouncedSearch)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || [])
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [debouncedSearch])

  function addFood(item, grams = 100) {
    setSelected((prev) => [...prev, { ...item, grams }])
    setSearch('')
    setResults([])
  }

  function removeFood(index) {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }

  function updateQuantity(index, grams) {
    const g = parseFloat(grams) || 0
    if (g <= 0) return
    setSelected((prev) => prev.map((s, i) => (i === index ? { ...s, grams: g } : s)))
  }

  function addQuick(manual) {
    const item = {
      name: manual.name || 'Custom',
      brand: '',
      image: null,
      servingSize: `${manual.grams || 100}g`,
      per100g: {
        calories: (manual.calories || 0) / ((manual.grams || 100) / 100),
        protein: (manual.protein || 0) / ((manual.grams || 100) / 100),
        carbs: (manual.carbs || 0) / ((manual.grams || 100) / 100),
        fats: (manual.fats || 0) / ((manual.grams || 100) / 100),
      },
    }
    addFood(item, manual.grams || 100)
    setQuickAddOpen(false)
  }

  const totals = selected.reduce(
    (acc, s) => {
      const ratio = s.grams / 100
      acc.calories += (s.per100g?.calories || 0) * ratio
      acc.protein += (s.per100g?.protein || 0) * ratio
      acc.carbs += (s.per100g?.carbs || 0) * ratio
      acc.fats += (s.per100g?.fats || 0) * ratio
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  )

  async function handleLog() {
    if (!profileId) return
    setSaving(true)
    try {
      const mealLabel = MEAL_TYPES.find((m) => m.id === mealType)?.label || mealType
      await fetch('/api/meal-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          mealName: mealLabel,
          foodItems: selected.map((s) => ({
            name: s.name,
            grams: s.grams,
            per100g: s.per100g,
            calories: Math.round((s.per100g?.calories || 0) * (s.grams / 100)),
            protein: Math.round((s.per100g?.protein || 0) * (s.grams / 100) * 10) / 10,
            carbs: Math.round((s.per100g?.carbs || 0) * (s.grams / 100) * 10) / 10,
            fats: Math.round((s.per100g?.fats || 0) * (s.grams / 100) * 10) / 10,
          })),
          totalCalories: Math.round(totals.calories),
          totalProtein: Math.round(totals.protein * 10) / 10,
          totalCarbs: Math.round(totals.carbs * 10) / 10,
          totalFats: Math.round(totals.fats * 10) / 10,
          mealType,
        }),
      })
      onLog?.()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="glass"
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 20,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Log Meal</h2>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'rgba(110,231,183,0.1)',
                border: '1px solid rgba(110,231,183,0.2)',
                color: '#6EE7B7',
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {MEAL_TYPES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMealType(m.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: mealType === m.id ? 'none' : '1px solid rgba(110,231,183,0.2)',
                  background: mealType === m.id ? 'rgba(16,185,129,0.4)' : 'rgba(110,231,183,0.06)',
                  color: mealType === m.id ? '#6EE7B7' : '#2D5B3F',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              background: 'rgba(14,20,14,0.6)',
              borderRadius: 14,
              border: '1px solid rgba(110,231,183,0.15)',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 16 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 14,
              }}
            />
          </div>

          {searching && (
            <div style={{ padding: 12, color: '#2D5B3F', fontSize: 13 }}>Searching...</div>
          )}
          {results.length > 0 && (
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 12 }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => addFood(r)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'rgba(110,231,183,0.05)',
                    border: '1px solid rgba(110,231,183,0.1)',
                    borderRadius: 12,
                    marginBottom: 8,
                    textAlign: 'left',
                  }}
                >
                  {r.image && (
                    <img src={r.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#2D5B3F' }}>
                      {r.per100g?.calories || 0} cal / 100g · {r.per100g?.protein || 0}g P
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!quickAddOpen ? (
            <button
              onClick={() => setQuickAddOpen(true)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 12,
                border: '1px dashed rgba(110,231,183,0.3)',
                background: 'transparent',
                color: '#6EE7B7',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Can&apos;t find it? Quick add
            </button>
          ) : (
            <QuickAddForm onSubmit={addQuick} onCancel={() => setQuickAddOpen(false)} />
          )}

          {selected.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Selected Foods</div>
              {selected.map((s, i) => {
                const ratio = s.grams / 100
                const cal = Math.round((s.per100g?.calories || 0) * ratio)
                const prot = ((s.per100g?.protein || 0) * ratio).toFixed(1)
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      background: 'rgba(110,231,183,0.06)',
                      borderRadius: 12,
                      marginBottom: 8,
                      border: '1px solid rgba(110,231,183,0.1)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>{s.name}</div>
                      <input
                        type="number"
                        value={s.grams}
                        onChange={(e) => updateQuantity(i, e.target.value)}
                        style={{
                          width: 70,
                          marginTop: 4,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid rgba(110,231,183,0.2)',
                          background: 'rgba(14,20,14,0.6)',
                          color: '#6EE7B7',
                          fontSize: 12,
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#2D5B3F', marginLeft: 4 }}>g</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>{cal} cal · {prot}g P</div>
                    <button
                      onClick={() => removeFood(i)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'rgba(251,113,133,0.2)',
                        border: 'none',
                        color: '#FB7185',
                        fontSize: 16,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderTop: '1px solid rgba(110,231,183,0.15)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#6EE7B7',
                }}
              >
                <span>Total</span>
                <span>
                  {Math.round(totals.calories)} cal · {totals.protein.toFixed(1)}g P · {totals.carbs.toFixed(1)}g C · {totals.fats.toFixed(1)}g F
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLog}
            disabled={saving || selected.length === 0}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 15,
              fontWeight: 700,
              opacity: saving || selected.length === 0 ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Log Meal ✓'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function QuickAddForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [grams, setGrams] = useState(100)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')

  return (
    <div
      style={{
        padding: 16,
        background: 'rgba(110,231,183,0.06)',
        borderRadius: 14,
        border: '1px solid rgba(110,231,183,0.15)',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Quick Add</div>
      <input
        placeholder="Food name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: '100%',
          padding: 10,
          borderRadius: 10,
          border: '1px solid rgba(110,231,183,0.2)',
          background: 'rgba(14,20,14,0.6)',
          color: '#fff',
          fontSize: 13,
          marginBottom: 8,
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <input
          placeholder="g"
          type="number"
          value={grams}
          onChange={(e) => setGrams(parseFloat(e.target.value) || 100)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(14,20,14,0.6)',
            color: '#6EE7B7',
            fontSize: 12,
          }}
        />
        <input
          placeholder="cal"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(14,20,14,0.6)',
            color: '#6EE7B7',
            fontSize: 12,
          }}
        />
        <input
          placeholder="P"
          type="number"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(14,20,14,0.6)',
            color: '#6EE7B7',
            fontSize: 12,
          }}
        />
        <input
          placeholder="C"
          type="number"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(14,20,14,0.6)',
            color: '#6EE7B7',
            fontSize: 12,
          }}
        />
        <input
          placeholder="F"
          type="number"
          value={fats}
          onChange={(e) => setFats(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'rgba(14,20,14,0.6)',
            color: '#6EE7B7',
            fontSize: 12,
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.2)',
            background: 'transparent',
            color: '#2D5B3F',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSubmit({
              name: name || 'Custom',
              grams,
              calories: parseFloat(calories) || 0,
              protein: parseFloat(protein) || 0,
              carbs: parseFloat(carbs) || 0,
              fats: parseFloat(fats) || 0,
            })
          }
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: 'none',
            background: 'rgba(16,185,129,0.3)',
            color: '#6EE7B7',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
