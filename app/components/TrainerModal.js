'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockTrainers } from '../../lib/mock-data'

export default function TrainerModal({ visible, activeTrainerId, onClose, onSwitch }) {
  const [selected, setSelected] = useState(activeTrainerId || 'bro')

  const handleSelect = (trainer) => {
    setSelected(trainer.id)
    setTimeout(() => {
      onSwitch(`Switched to ${trainer.name}`, trainer.id)
      onClose()
    }, 300)
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
            onClick={onClose}
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
              padding: '28px 24px 44px',
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
              marginBottom: 4,
              letterSpacing: -0.5,
            }}>
              Choose Your Trainer
            </h2>
            <p style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 24 }}>
              Each crew has a different coaching philosophy
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mockTrainers.map((trainer, i) => (
                <motion.button
                  key={trainer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => handleSelect(trainer)}
                  style={{
                    padding: '16px',
                    background: selected === trainer.id
                      ? `linear-gradient(135deg, ${trainer.color}18, ${trainer.color}08)`
                      : 'rgba(14,20,14,0.6)',
                    border: selected === trainer.id
                      ? `2px solid ${trainer.color}55`
                      : '1px solid rgba(110,231,183,0.07)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: selected === trainer.id
                      ? `0 0 16px ${trainer.color}20`
                      : 'none',
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `${trainer.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                  }}>
                    {trainer.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: selected === trainer.id ? trainer.color : '#D1FAE5',
                    }}>
                      {trainer.name}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#2D5B3F',
                      marginTop: 2,
                    }}>
                      {trainer.style}
                    </div>
                  </div>
                  {selected === trainer.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${trainer.color}, ${trainer.color}cc)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: '#070B07',
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: `0 0 10px ${trainer.color}50`,
                      }}
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
