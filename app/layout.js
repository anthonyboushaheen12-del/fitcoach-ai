'use client'

import './globals.css'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import SplashScreen from './components/SplashScreen'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(true)

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
        {/* Splash Screen */}
        <SplashScreen visible={showSplash} onDone={() => setShowSplash(false)} />

        {/* Dot grid background */}
        <div className="dot-grid" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

        {/* Ambient glow blobs */}
        <div className="ambient-green" style={{ top: -180, left: '30%', pointerEvents: 'none' }} />
        <div className="ambient-pink" style={{ top: 100, right: -150, pointerEvents: 'none' }} />
        <div className="ambient-yellow" style={{ bottom: -80, left: -80, pointerEvents: 'none' }} />

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

        {/* Bottom Navigation */}
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
            padding: '8px 0 16px',
            background: 'rgba(7,11,7,0.94)',
            borderTop: '1px solid rgba(110,231,183,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 10,
          }}>
            {tabs.map((tab) => {
              const isActive = pathname === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 18px',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 22,
                      height: 3,
                      borderRadius: 100,
                      background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
                      boxShadow: '0 0 10px rgba(110,231,183,0.5)',
                    }} />
                  )}
                  <div style={{
                    fontSize: 20,
                    filter: isActive ? 'none' : 'grayscale(1) opacity(0.22)',
                    transition: 'filter 0.2s ease',
                  }}>
                    {tab.icon}
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    marginTop: 2,
                    color: isActive ? '#6EE7B7' : '#1A3326',
                    transition: 'color 0.2s ease',
                    letterSpacing: 0.3,
                  }}>
                    {tab.label}
                  </div>
                </button>
              )
            })}
          </nav>
        )}
      </body>
    </html>
  )
}
