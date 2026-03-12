'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadExercises, searchExercises } from '../../lib/exercises'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export default function LogWorkoutModal({ open, onClose, profileId, onLog }) {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebounce(search, 200)

  useEffect(() => {
    if (!open) return
    loadExercises().then(setExercises)
  }, [open])

  useEffect(() => {
    if (!exercises.length) {
      setResults([])
      return
    }
    const filtered = searchExercises(exercises, debouncedSearch, 15)
    setResults(filtered)
  }, [exercises, debouncedSearch])

  function addExercise(ex) {
    setSelected((prev) => [...prev, { name: ex.name, sets: 3, reps: 10, weight_kg: null }])
    setSearch('')
    setResults([])
  }

  function addCustom(name) {
    if (!name?.trim()) return
    setSelected((prev) => [...prev, { name: name.trim(), sets: 3, reps: 10, weight_kg: null }])
    setSearch('')
  }

  function removeExercise(index) {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }

  function updateExercise(index, field, value) {
    setSelected((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value === '' ? null : value } : s))
    )
  }

  async function handleLog() {
    if (!profileId || selected.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/workout-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          exercises: selected.map((e) => ({
            name: e.name,
            sets: parseInt(e.sets, 10) || 3,
            reps: parseInt(e.reps, 10) || 10,
            weight_kg: e.weight_kg ? parseFloat(e.weight_kg) : null,
          })),
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onLog?.()
      onClose()
      setSelected([])
      setNotes('')
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to log workout')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(14,20,14,0.55)',
    border: '1px solid rgba(110,231,183,0.1)',
    borderRadius: 10,
    color: '#E2FBE8',
    fontSize: 14,
  }

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
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Log Workout</h2>
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Search exercises</label>
            <input
              type="text"
              placeholder="e.g. Bench Press, Squat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
            {search.trim() && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                {results.length === 0 ? (
                  <button
                    onClick={() => addCustom(search)}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: 'rgba(110,231,183,0.08)',
                      border: '1px dashed rgba(110,231,183,0.3)',
                      borderRadius: 10,
                      color: '#6EE7B7',
                      fontSize: 13,
                      textAlign: 'left',
                    }}
                  >
                    + Add &quot;{search}&quot; as custom exercise
                  </button>
                ) : (
                  results.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(14,20,14,0.55)',
                        border: '1px solid rgba(110,231,183,0.07)',
                        borderRadius: 8,
                        color: '#D1FAE5',
                        fontSize: 13,
                        textAlign: 'left',
                        marginBottom: 4,
                      }}
                    >
                      {ex.name}{ex.equipment ? ` · ${ex.equipment}` : ''}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 8 }}>Exercises</div>
              {selected.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: 'rgba(14,20,14,0.55)',
                    borderRadius: 12,
                    marginBottom: 8,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{s.name}</div>
                  <button
                    onClick={() => removeExercise(i)}
                    style={{ color: '#FB7185', fontSize: 14, background: 'none', border: 'none', padding: 4 }}
                  >
                    Remove
                  </button>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 70 }}>
                      <label style={{ fontSize: 10, color: '#2D5B3F' }}>Sets</label>
                      <input
                        type="number"
                        min={1}
                        value={s.sets ?? ''}
                        onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                        style={{ ...inputStyle, padding: '6px 10px' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 70 }}>
                      <label style={{ fontSize: 10, color: '#2D5B3F' }}>Reps</label>
                      <input
                        type="number"
                        min={1}
                        value={s.reps ?? ''}
                        onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                        style={{ ...inputStyle, padding: '6px 10px' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <label style={{ fontSize: 10, color: '#2D5B3F' }}>Weight (kg)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Optional"
                        value={s.weight_kg ?? ''}
                        onChange={(e) => updateExercise(i, 'weight_kg', e.target.value)}
                        style={{ ...inputStyle, padding: '6px 10px' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#2D5B3F', fontWeight: 600, marginBottom: 6, display: 'block' }}>Notes (optional)</label>
            <textarea
              placeholder="How did it feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <button
            onClick={handleLog}
            disabled={selected.length === 0 || saving}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              background: selected.length > 0 ? 'linear-gradient(135deg, #10B981, #6EE7B7)' : 'rgba(110,231,183,0.2)',
              color: selected.length > 0 ? '#070B07' : '#1A3326',
              fontSize: 15,
              fontWeight: 700,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Log Workout'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
