'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SplashScreen({ visible, onDone }) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDone, 2500)
    return () => clearTimeout(timer)
  }, [visible, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#070B07',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          {/* Ambient glow pulse behind logo */}
          <motion.div
            animate={{
              opacity: [0.35, 0.75, 0.35],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(110,231,183,0.08) 50%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, position: 'relative', zIndex: 1 }}>
            <motion.span
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: '#6EE7B7',
                letterSpacing: -1.5,
                fontFamily: "'Outfit', sans-serif",
                textShadow: '0 0 30px rgba(110,231,183,0.4)',
              }}
            >
              Fit
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: '#E2FBE8',
                letterSpacing: -1.5,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Coach
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
              style={{
                fontSize: 22,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #F97316, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginLeft: 6,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              AI
            </motion.span>
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            style={{
              width: 160,
              height: 2,
              borderRadius: 100,
              background: 'rgba(110,231,183,0.1)',
              marginTop: 36,
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, delay: 0.4, ease: 'easeInOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
                borderRadius: 100,
                boxShadow: '0 0 8px rgba(110,231,183,0.5)',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
