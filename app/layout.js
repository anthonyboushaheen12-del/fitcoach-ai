'use client'

import './globals.css'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SplashScreen from './components/SplashScreen'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [splashDone, setSplashDone] = useState(false)

  const isOnboarding = pathname === '/'

  const tabs = [
    { id: '/dashboard', icon: '🏠', label: 'Home' },
    { id: '/chat', icon: '💬', label: 'Chat' },
    { id: '/plans', icon: '📋', label: 'Plans' },
    { id: '/settings', icon: '⚙️', label: 'Settings' },
  ]

  const handleSplashComplete = useCallback(() => setSplashDone(true), [])

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

        <SplashScreen onComplete={handleSplashComplete} />

        {/* Main content */}
        <main style={{
            maxWidth: 480,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
            minHeight: '100vh',
            paddingBottom: isOnboarding ? 0 : 70,
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

        {/* Bottom Navigation - hidden on onboarding */}
        {!isOnboarding && (
          <NavBar tabs={tabs} pathname={pathname} router={router} />
        )}
      </body>
    </html>
  )
}

function NavBar({ tabs, pathname, router }) {
  return (
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
        <NavTab
          key={tab.id}
          tab={tab}
          isActive={pathname === tab.id}
          onClick={() => router.push(tab.id)}
        />
      ))}
    </nav>
  )
}

function NavTab({ tab, isActive, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      style={{
        background: 'none',
        border: 'none',
        padding: '4px 16px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <motion.div
        animate={isActive ? { scale: 1.05 } : { scale: 1 }}
        style={{
          fontSize: 19,
          filter: isActive ? 'none' : 'grayscale(1) opacity(0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        {tab.icon}
      </motion.div>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        marginTop: 2,
        color: isActive ? '#6EE7B7' : '#1A3326',
        transition: 'color 0.2s ease',
      }}>
        {tab.label}
      </div>
      {isActive && (
        <motion.div
          layoutId="navIndicator"
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 20,
            height: 3,
            borderRadius: 100,
            background: 'linear-gradient(90deg, #10B981, #6EE7B7)',
            boxShadow: '0 0 8px rgba(110,231,183,0.4)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  )
}
