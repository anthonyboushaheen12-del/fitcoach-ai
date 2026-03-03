'use client'

export default function TypingIndicator({ trainerEmoji }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(16,185,129,0.08))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        marginRight: 8,
        flexShrink: 0,
      }}>{trainerEmoji}</div>
      <div className="glass-sm" style={{
        padding: '14px 20px',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}>
        <span className="typing-dot" style={{ '--delay': 0 }} />
        <span className="typing-dot" style={{ '--delay': 1 }} />
        <span className="typing-dot" style={{ '--delay': 2 }} />
      </div>
    </div>
  )
}
