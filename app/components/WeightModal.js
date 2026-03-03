'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function WeightModal({ open, onClose, profile, onSave }) {
  const [value, setValue] = useState(profile?.weight_kg?.toString() || '')
  const [saving, setSaving] = useState(false)
  const units = profile?.units === 'imperial' ? 'imperial' : 'metric'
  const label = units === 'imperial' ? 'lbs' : 'kg'

  async function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return
    setSaving(true)
    try {
      await onSave(num)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
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
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 16,
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
            <button
              onClick={handleSave}
              disabled={saving || !value}
              style={{
                flex: 2,
                padding: 16,
                border: 'none',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
                color: '#070B07',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
                opacity: saving || !value ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
