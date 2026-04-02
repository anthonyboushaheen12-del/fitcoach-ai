'use client'

import './globals.css'
import { useCallback } from 'react'
import SplashScreen from './components/SplashScreen'
import { AuthProvider } from './components/AuthProvider'
import AuthLoadingSafetyNet from './components/AuthLoadingSafetyNet'
import AppShell from './components/AppShell'

export default function RootLayout({ children }) {
  const handleSplashComplete = useCallback(() => {}, [])

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#070B07" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <title>FitCoach AI</title>
      </head>
      <body>
        <div className="dot-grid" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
        <div className="ambient-green" style={{ top: -180, left: '30%' }} />
        <div className="ambient-pink" style={{ top: 100, right: -150 }} />
        <div className="ambient-yellow" style={{ bottom: -80, left: -80 }} />

        <div style={{ position: 'relative', zIndex: 1, overflowX: 'hidden', minHeight: '100dvh' }}>
          <SplashScreen onComplete={handleSplashComplete} />

          <AuthProvider>
            <AuthLoadingSafetyNet />
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
