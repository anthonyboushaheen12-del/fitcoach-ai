'use client'

import { motion } from 'framer-motion'

const SUGGESTIONS = [
  '📷 Analyze my body from a photo',
  'What should I focus on today?',
  "How's my progress?",
  'Change my plan',
  'Explain my macros',
]

export default function QuickReplies({ suggestions = SUGGESTIONS, onSelect }) {
  const display = suggestions.slice(0, 3)

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      padding: '0 0 8px',
      justifyContent: 'center',
    }}>
      {display.map((text, i) => (
        <motion.button
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(text)}
          style={{
            padding: '8px 14px',
            borderRadius: 20,
            border: '1px solid rgba(110,231,183,0.15)',
            background: 'rgba(14,20,14,0.55)',
            backdropFilter: 'blur(24px)',
            color: '#6EE7B7',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {text}
        </motion.button>
      ))}
    </div>
  )
}
