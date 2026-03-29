'use client'

/**
 * FitCoach wordmark + animated green progress bar (no loading text).
 */
export default function BrandedAuthLoading({
  minHeight = '100vh',
  barWidth = 200,
  style,
  className,
}) {
  return (
    <div
      className={className}
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070B07',
        gap: 16,
        ...style,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#6EE7B7' }}>
          Fit<span style={{ color: '#fff' }}>Coach</span>
          <span
            style={{
              fontSize: 14,
              marginLeft: 6,
              background: 'linear-gradient(135deg, #F97316, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI
          </span>
        </div>
        <div
          style={{
            width: barWidth,
            maxWidth: '80vw',
            height: 4,
            borderRadius: 100,
            background: 'rgba(110,231,183,0.12)',
            overflow: 'hidden',
            margin: '18px auto 0',
          }}
        >
          <div className="auth-loading-bar-inner" />
        </div>
      </div>
    </div>
  )
}
