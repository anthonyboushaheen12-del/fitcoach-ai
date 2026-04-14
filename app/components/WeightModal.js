'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LB_PER_KG = 2.2046226218

function displayWeightFromKg(kg, imperial) {
  if (kg == null || Number.isNaN(Number(kg))) return ''
  if (imperial) {
    const lbs = Number(kg) * LB_PER_KG
    const rounded = Math.round(lbs * 10) / 10
    return String(rounded)
  }
  return String(kg)
}

function kgFromInput(num, imperial) {
  if (imperial) return num / LB_PER_KG
  return num
}

export default function WeightModal({ open, onClose, profile, onSave }) {
  const [value, setValue] = useState('')
  const units = profile?.units === 'imperial' ? 'imperial' : 'metric'
  const label = units === 'imperial' ? 'lbs' : 'kg'

  useEffect(() => {
    if (!open || !profile) return
    setValue(displayWeightFromKg(profile.weight_kg, units === 'imperial'))
  }, [open, profile?.id, profile?.weight_kg, profile?.units, units])

  function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return
    const kg = kgFromInput(num, units === 'imperial')
    onClose()
    void (async () => {
      try {
        await onSave(kg)
      } catch (err) {
        console.error(err)
      }
    })()
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
          transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="glass"
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: 24,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
            Log Weight
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <input
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              style={{
                flex: 1,
                padding: '20px 20px',
                fontSize: 36,
                fontWeight: 800,
                textAlign: 'center',
                background: 'rgba(14,20,14,0.6)',
                border: '2px solid rgba(110,231,183,0.15)',
                borderRadius: 16,
                color: '#6EE7B7',
                fontFamily: 'Outfit, sans-serif',
              }}
            />
            <span style={{ fontSize: 20, fontWeight: 600, color: '#2D5B3F' }}>{label}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!value}
            style={{
              width: '100%',
              padding: 16,
              border: 'none',
              borderRadius: 14,
              marginBottom: 12,
              background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
              color: '#070B07',
              fontSize: 16,
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
              opacity: !value ? 0.6 : 1,
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: 14,
              background: 'transparent',
              border: '1px solid rgba(110,231,183,0.15)',
              borderRadius: 14,
              color: '#2D5B3F',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
