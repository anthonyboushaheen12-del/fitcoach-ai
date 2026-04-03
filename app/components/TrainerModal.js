'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { trainers } from '../../lib/trainers'

export default function TrainerModal({ open, onClose, profile, currentTrainer, onSelect }) {
  if (!open) return null

  const handleSelect = async (trainer) => {
    await onSelect(trainer)
    onClose()
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
            padding: 24,
            maxHeight: '80vh',
            overflowY: 'auto',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Switch Trainer</div>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: '1px solid rgba(110,231,183,0.15)',
                background: 'transparent',
                color: '#2D5B3F',
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>
          <div
            className="trainer-modal-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 10,
            }}
          >
            {trainers.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                style={{
                  padding: '18px 16px',
                  background: currentTrainer?.id === t.id
                    ? `linear-gradient(135deg, ${t.color}15, ${t.color}08)`
                    : 'rgba(14,20,14,0.55)',
                  border: currentTrainer?.id === t.id
                    ? `2px solid ${t.color}50`
                    : '1px solid rgba(110,231,183,0.07)',
                  borderRadius: 16,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  backdropFilter: 'blur(24px)',
                  boxShadow: currentTrainer?.id === t.id ? `0 0 20px ${t.color}25` : 'none',
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: `${t.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  flexShrink: 0,
                }}>{t.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: currentTrainer?.id === t.id ? t.color : '#D1FAE5',
                  }}>{t.name}</div>
                  <div style={{
                    fontSize: 12,
                    color: currentTrainer?.id === t.id ? '#6EE7B7' : '#2D5B3F',
                    marginTop: 2,
                  }}>{t.style}</div>
                </div>
                {currentTrainer?.id === t.id && (
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: t.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: '#070B07',
                  }}>✓</div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
