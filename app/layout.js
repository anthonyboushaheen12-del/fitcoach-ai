'use client'

import './globals.css'
import { usePathname, useRouter } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  // Don't show nav on onboarding page
  const isOnboarding = pathname === '/'
  
  const tabs = [
    { id: '/dashboard', icon: '🏠', label: 'Home' },
    { id: '/chat', icon: '💬', label: 'Chat' },
    { id: '/plans', icon: '📋', label: 'Plans' },
    { id: '/settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#070B07" />
        <title>FitCoach AI</title>
      </head>
      <body>
        {/* Ambient background effects */}
        <div className="dot-grid" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
        <div className="ambient-green" style={{ top: -180, left: '30%' }} />
        <div className="ambient-pink" style={{ top: 100, right: -150 }} />
        <div className="ambient-yellow" style={{ bottom: -80, left: -80 }} />

        {/* Main content */}
        <main style={{
          maxWidth: 480,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          paddingBottom: isOnboarding ? 0 : 70,
        }}>
          {children}
        </main>

        {/* Bottom Navigation - hidden on onboarding */}
        {!isOnboarding && (
          <nav style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px 0 14px',
            background: 'rgba(7,11,7,0.92)',
            borderTop: '1px solid rgba(110,231,183,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 10,
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => router.push(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 16px',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <div style={{
                  fontSize: 19,
                  filter: pathname === tab.id ? 'none' : 'grayscale(1) opacity(0.25)',
                  transition: 'all 0.2s ease',
                }}>{tab.icon}</div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  marginTop: 2,
                  color: pathname === tab.id ? '#6EE7B7' : '#1A3326',
                  transition: 'color 0.2s ease',
                }}>{tab.label}</div>
                {pathname === tab.id && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 20,
                    height: 3,
                    borderRadius: 100,
                    background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
                    boxShadow: '0 0 8px rgba(110,231,183,0.4)',
                  }} />
                )}
              </button>
            ))}
          </nav>
        )}
      </body>
    </html>
  )
}
