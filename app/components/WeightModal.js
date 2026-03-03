'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function WeightModal({ visible, onClose, onSave }) {
  const [value, setValue] = useState('')

  const handleSave = () => {
    if (!value) return
    onSave('✓ Weight logged')
    setValue('')
    onClose()
  }

  const handleClose = () => {
    setValue('')
    onClose()
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 100,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 480,
              zIndex: 101,
              background: 'rgba(10,16,10,0.97)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              border: '1px solid rgba(110,231,183,0.1)',
              borderBottom: 'none',
              padding: '28px 28px 44px',
            }}
          >
            {/* Handle */}
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 100,
              background: 'rgba(110,231,183,0.15)',
              margin: '0 auto 28px',
            }} />

            <h2 style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#E2FBE8',
              marginBottom: 6,
              letterSpacing: -0.5,
            }}>
              Log Weight
            </h2>
            <p style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 32 }}>
              Enter your current weight to track progress
            </p>

            {/* Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 36,
            }}>
              <input
                type="number"
                step="0.1"
                placeholder="85.0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: '#E2FBE8',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: 160,
                  textAlign: 'center',
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: -2,
                }}
              />
              <span style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#2D5B3F',
                paddingBottom: 4,
              }}>kg</span>
            </div>

            {/* Buttons */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 16,
                border: 'none',
                background: value
                  ? 'linear-gradient(135deg, #10B981, #6EE7B7)'
                  : 'rgba(110,231,183,0.08)',
                color: value ? '#070B07' : '#1A3326',
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                boxShadow: value ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Save Weight
            </motion.button>

            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 16,
                border: 'none',
                background: 'transparent',
                color: '#2D5B3F',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
