'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { compressImageForUpload } from '../../lib/image-compress'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'snack', label: 'Snack', emoji: '🍌' },
  { id: 'dinner', label: 'Dinner', emoji: '🥩' },
  { id: 'other', label: 'Other', emoji: '🥛' },
]

async function authJsonHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

function foodItemFromMealAnalysis(it, portionLabel = 'photo est.') {
  const g = Math.max(1, Math.round(Number(it.grams) || 100))
  const cal = Number(it.calories) || 0
  const p = Number(it.protein) || 0
  const cb = Number(it.carbs) || 0
  const f = Number(it.fats) || 0
  const scale = 100 / g
  return {
    name: String(it.name || 'Food').slice(0, 120),
    brand: '',
    image: null,
    servingSize: `${g}g (${portionLabel})`,
    per100g: {
      calories: cal * scale,
      protein: p * scale,
      carbs: cb * scale,
      fats: f * scale,
    },
  }
}

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
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoHint, setPhotoHint] = useState(null)
  const [describeText, setDescribeText] = useState('')
  const [describeBusy, setDescribeBusy] = useState(false)
  const [describeHint, setDescribeHint] = useState(null)
  /** Last AI aggregate from photo or text analysis (for comparison with line-item totals). */
  const [analysisTotals, setAnalysisTotals] = useState(null)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (!open) {
      setPhotoBusy(false)
      setPhotoHint(null)
      setDescribeBusy(false)
      setDescribeHint(null)
      setDescribeText('')
      setAnalysisTotals(null)
    }
  }, [open])

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

  async function handleMealPhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !profileId || !file.type.startsWith('image/')) return
    setPhotoBusy(true)
    setPhotoHint(null)
    try {
      const { base64, mediaType } = await compressImageForUpload(file)
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: await authJsonHeaders(),
        body: JSON.stringify({ profileId, image: base64, mediaType }),
      })
      const data = await res.json().catch(() => ({}))
      const a = data.analysis || data
      const items = Array.isArray(a?.items) ? a.items : []
      for (const it of items) {
        const g = Math.max(1, Math.round(Number(it.grams) || 100))
        addFood(foodItemFromMealAnalysis(it, 'photo est.'), g)
      }
      if (items.length === 0) {
        setPhotoHint(typeof a?.notes === 'string' ? a.notes : 'No foods detected — try a clearer photo.')
        setAnalysisTotals(null)
      } else {
        setPhotoHint(
          a?.mealLabel
            ? `${a.mealLabel} · estimates only`
            : 'Added from photo (estimates — adjust grams if needed).'
        )
        setAnalysisTotals({
          source: 'photo',
          calories: Number(a?.totalCalories),
          protein: Number(a?.totalProteinG),
          carbs: Number(a?.totalCarbsG),
          fats: Number(a?.totalFatsG),
        })
      }
    } catch {
      setPhotoHint('Could not analyze photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleDescribeMeal() {
    const text = describeText?.trim()
    if (!text || !profileId) return
    setDescribeBusy(true)
    setDescribeHint(null)
    try {
      const res = await fetch('/api/analyze-meal-text', {
        method: 'POST',
        headers: await authJsonHeaders(),
        body: JSON.stringify({ profileId, description: text }),
      })
      const data = await res.json().catch(() => ({}))
      const a = data.analysis || data
      const items = Array.isArray(a?.items) ? a.items : []
      for (const it of items) {
        const g = Math.max(1, Math.round(Number(it.grams) || 100))
        addFood(foodItemFromMealAnalysis(it, 'described'), g)
      }
      if (items.length === 0) {
        setDescribeHint(typeof a?.notes === 'string' ? a.notes : 'No foods parsed — try listing items more clearly.')
        setAnalysisTotals(null)
      } else {
        setDescribeHint(
          a?.mealLabel
            ? `${a.mealLabel} · estimates only`
            : 'Added from description (estimates — adjust grams if needed).'
        )
        setAnalysisTotals({
          source: 'text',
          calories: Number(a?.totalCalories),
          protein: Number(a?.totalProteinG),
          carbs: Number(a?.totalCarbsG),
          fats: Number(a?.totalFatsG),
        })
        setDescribeText('')
      }
    } catch {
      setDescribeHint('Could not parse description.')
    } finally {
      setDescribeBusy(false)
    }
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

          <label
            style={{
              display: 'block',
              marginBottom: 12,
              padding: '12px 16px',
              borderRadius: 14,
              border: '1px dashed rgba(110,231,183,0.35)',
              background: 'rgba(110,231,183,0.06)',
              cursor: photoBusy ? 'wait' : 'pointer',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: photoBusy ? '#2D5B3F' : '#6EE7B7',
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              disabled={photoBusy}
              onChange={handleMealPhotoChange}
            />
            {photoBusy ? 'Analyzing photo...' : 'Scan or upload meal photo'}
          </label>
          {photoHint && (
            <div style={{ fontSize: 12, color: '#A7C4B8', marginBottom: 12, lineHeight: 1.45 }}>{photoHint}</div>
          )}
          {analysisTotals &&
            [analysisTotals.calories, analysisTotals.protein, analysisTotals.carbs, analysisTotals.fats].some((n) =>
              Number.isFinite(n)
            ) && (
              <div
                style={{
                  fontSize: 12,
                  color: '#6EE7B7',
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(110,231,183,0.25)',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: '#D1FAE5' }}>AI estimate</strong>
                {analysisTotals.source === 'photo' ? ' (photo)' : ' (description)'}:{' '}
                {[
                  Number.isFinite(analysisTotals.calories) ? `${Math.round(analysisTotals.calories)} cal` : null,
                  Number.isFinite(analysisTotals.protein) ? `${analysisTotals.protein}g P` : null,
                  Number.isFinite(analysisTotals.carbs) ? `${analysisTotals.carbs}g C` : null,
                  Number.isFinite(analysisTotals.fats) ? `${analysisTotals.fats}g F` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                <span style={{ color: '#A7C4B8', display: 'block', marginTop: 4, fontSize: 11 }}>
                  Line items below may differ slightly after rounding; adjust grams as needed.
                </span>
              </div>
            )}

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: '#2D5B3F',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Describe your meal
            </label>
            <textarea
              value={describeText}
              onChange={(e) => setDescribeText(e.target.value)}
              placeholder="e.g. 2 scrambled eggs, 2 slices whole wheat toast with butter, black coffee"
              rows={3}
              disabled={describeBusy}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid rgba(110,231,183,0.2)',
                background: 'rgba(14,20,14,0.6)',
                color: '#fff',
                fontSize: 13,
                lineHeight: 1.45,
                resize: 'vertical',
                minHeight: 72,
                fontFamily: 'inherit',
                marginBottom: 10,
              }}
            />
            <button
              type="button"
              onClick={handleDescribeMeal}
              disabled={describeBusy || !describeText.trim()}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 14,
                border: 'none',
                background:
                  describeBusy || !describeText.trim()
                    ? 'rgba(16,185,129,0.15)'
                    : 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: describeBusy || !describeText.trim() ? '#2D5B3F' : '#070B07',
                fontSize: 14,
                fontWeight: 700,
                cursor: describeBusy || !describeText.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {describeBusy ? 'Parsing…' : 'Add from description'}
            </button>
            {describeHint && (
              <div style={{ fontSize: 12, color: '#A7C4B8', marginTop: 10, lineHeight: 1.45 }}>
                {describeHint}
              </div>
            )}
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
                const carb = ((s.per100g?.carbs || 0) * ratio).toFixed(1)
                const fat = ((s.per100g?.fats || 0) * ratio).toFixed(1)
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
                    <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>
                      {cal} cal · {prot}g P · {carb}g C · {fat}g F
                    </div>
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
