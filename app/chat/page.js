'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockProfile, mockTrainers, mockChatMessages, quickReplies } from '../../lib/mock-data'

const MOCK_RESPONSES = [
  "Great question! Based on your current stats and our programming, here's what I'd recommend: focus on progressive overload this week — if you hit all your reps last session, add 2.5kg. Recovery is looking good based on your logs. 💪",
  "Looking at your macros, you're on track! Protein is the priority — make sure you're hitting that 168g daily. Pre-workout meal about 60-90 min before training will help. You've got this!",
  "Based on where you're at in the program, today's the perfect day to push intensity. Your body has adapted to the volume, now we need to keep the stimulus fresh. Let's go! 🔥",
  "Rest days are part of the program, not a skip day. Active recovery — walk, stretch, foam roll — will actually accelerate your progress. Trust the process.",
  "Your weight trend is exactly where we want it. Slow and steady fat loss preserves more muscle. You're doing everything right — stay patient and consistent!",
]

function TypingIndicator({ trainerEmoji }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(110,231,183,0.08)',
        border: '1px solid rgba(110,231,183,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>{trainerEmoji}</div>
      <div style={{
        padding: '12px 16px',
        background: 'rgba(14,20,14,0.55)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(110,231,183,0.07)',
        borderRadius: '4px 18px 18px 18px',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#6EE7B7', opacity: 0.8 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function MessageBubble({ msg, trainerEmoji }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 14,
      }}
    >
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(110,231,183,0.08)',
          border: '1px solid rgba(110,231,183,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>{trainerEmoji}</div>
      )}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          padding: '12px 15px',
          background: isUser
            ? 'linear-gradient(135deg, #10B981, #6EE7B7)'
            : 'rgba(14,20,14,0.55)',
          backdropFilter: isUser ? 'none' : 'blur(24px)',
          WebkitBackdropFilter: isUser ? 'none' : 'blur(24px)',
          border: isUser ? 'none' : '1px solid rgba(110,231,183,0.07)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          color: isUser ? '#070B07' : '#D1FAE5',
          fontSize: 14, lineHeight: 1.55, fontWeight: isUser ? 600 : 400,
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: 10, color: '#1A3326', marginTop: 4,
          textAlign: isUser ? 'right' : 'left', paddingLeft: isUser ? 0 : 4,
        }}>
          {msg.timestamp}
        </div>
      </div>
    </motion.div>
  )
}

let responseIndex = 0

export default function Chat() {
  const [messages, setMessages] = useState(mockChatMessages)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const trainer = mockTrainers.find(t => t.id === mockProfile.trainer) || mockTrainers[2]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = (text) => {
    const content = (text || input).trim()
    if (!content || typing) return
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', content, timestamp: now }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const response = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length]
      responseIndex++
      setTyping(false)
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }, 2000)
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        background: 'rgba(7,11,7,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(110,231,183,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `${trainer.color}18`,
            border: `1px solid ${trainer.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>{trainer.emoji}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#E2FBE8' }}>{trainer.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 11, color: '#2D5B3F', fontWeight: 600 }}>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* "Today" separator */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <span style={{
            fontSize: 11, color: '#1A3326', fontWeight: 600,
            padding: '4px 12px',
            background: 'rgba(110,231,183,0.04)',
            border: '1px solid rgba(110,231,183,0.06)',
            borderRadius: 100,
          }}>Today</span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} trainerEmoji={trainer.emoji} />
          ))}
          {typing && <TypingIndicator key="typing" trainerEmoji={trainer.emoji} />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      <div style={{
        padding: '8px 16px 6px',
        overflowX: 'auto',
        display: 'flex', gap: 8, flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {quickReplies.map((r, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage(r)}
            style={{
              padding: '7px 14px', borderRadius: 100, flexShrink: 0, cursor: 'pointer',
              background: 'rgba(14,20,14,0.55)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(110,231,183,0.1)',
              color: '#6EE7B7', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {r}
          </motion.button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 14px 14px', flexShrink: 0,
        background: 'rgba(7,11,7,0.9)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(110,231,183,0.06)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(14,20,14,0.55)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(110,231,183,0.1)',
          borderRadius: 100, padding: '8px 8px 8px 14px',
        }}>
          {/* Camera button */}
          <button style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(110,231,183,0.06)',
            border: '1px solid rgba(110,231,183,0.08)',
            color: '#2D5B3F', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>📷</button>

          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your trainer..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#E2FBE8', fontSize: 14, fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
            }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              background: input.trim() && !typing
                ? 'linear-gradient(135deg, #10B981, #6EE7B7)'
                : 'rgba(110,231,183,0.08)',
              border: 'none',
              color: input.trim() && !typing ? '#070B07' : '#1A3326',
              fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: input.trim() && !typing ? '0 0 12px rgba(110,231,183,0.3)' : 'none',
            }}
          >↑</motion.button>
        </div>
      </div>
    </div>
  )
}
