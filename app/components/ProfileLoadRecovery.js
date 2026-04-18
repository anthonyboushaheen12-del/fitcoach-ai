'use client'

/**
 * Shown when the user is signed in but the profile row could not be loaded (network/timeout).
 * Do not use when `profileMissingConfirmed` — that flow goes to onboarding instead.
 */
export default function ProfileLoadRecovery({ onRetry, onHome, detail }) {
  return (
    <div className="dashboard-app-container" style={{ paddingTop: 48, paddingBottom: 32, textAlign: 'center' }}>
      <p style={{ color: '#FB7185', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Couldn&apos;t load your profile</p>
      <p style={{ color: '#2D5B3F', fontSize: 14, maxWidth: 360, margin: '0 auto 12px', lineHeight: 1.5 }}>
        Check your connection or try again in a moment.
      </p>
      {detail ? (
        <p style={{ color: '#5C7066', fontSize: 12, maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.4 }}>
          {detail}
        </p>
      ) : (
        <div style={{ marginBottom: 20 }} />
      )}
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: '12px 24px',
          borderRadius: 12,
          border: '1px solid rgba(110,231,183,0.35)',
          background: 'rgba(16,185,129,0.2)',
          color: '#6EE7B7',
          fontWeight: 600,
          marginRight: 12,
        }}
      >
        Retry
      </button>
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            border: '1px solid rgba(110,231,183,0.15)',
            background: 'transparent',
            color: '#A7C4B8',
            fontWeight: 600,
          }}
        >
          Home
        </button>
      ) : null}
    </div>
  )
}
