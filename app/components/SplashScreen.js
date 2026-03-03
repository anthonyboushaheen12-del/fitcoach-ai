'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(false) // Start false, set true after mount check
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('splashShown')) {
      onComplete?.()
      return
    }
    setVisible(true)

    const duration = 2500
    const interval = 20
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += interval
      setProgress(Math.min((elapsed / 2000) * 100, 100))
      if (elapsed >= duration) {
        clearInterval(timer)
        sessionStorage.setItem('splashShown', 'true')
        setVisible(false)
        onComplete?.()
      }
    }, interval)
    return () => clearInterval(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#070B07',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ambient glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ color: '#6EE7B7', fontSize: 48, fontWeight: 800, letterSpacing: -2 }}
          >
            Fit
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ color: '#fff', fontSize: 48, fontWeight: 800, letterSpacing: -2 }}
          >
            Coach
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginLeft: 8,
              background: 'linear-gradient(135deg, #F97316, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI
          </motion.span>
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
          style={{
            marginTop: 32,
            width: 200,
            height: 4,
            borderRadius: 100,
            background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
            overflow: 'hidden',
            boxShadow: '0 0 12px rgba(110,231,183,0.4)',
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
