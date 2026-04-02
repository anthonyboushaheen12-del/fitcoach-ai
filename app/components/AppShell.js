'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './AuthProvider'

const SIDEBAR_W = 220
const TABS = [
  { id: '/dashboard', icon: '🏠', label: 'Home' },
  { id: '/chat', icon: '💬', label: 'Chat' },
  { id: '/plans', icon: '📋', label: 'Plans' },
  { id: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const set = () => setIsDesktop(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  const hideNav = pathname === '/' || pathname === '/onboarding'
  const isOnboarding = hideNav

  const footerLabel =
    profile?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    user?.email ||
    ''

  return (
    <>
      {!hideNav && isDesktop && (
        <nav
          className="app-sidebar-desktop glass"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: SIDEBAR_W,
            height: '100dvh',
            zIndex: 12,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderRight: '1px solid rgba(110,231,183,0.1)',
            borderTop: 'none',
            borderLeft: 'none',
            borderBottom: 'none',
            background: 'rgba(7,11,7,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingTop: 24,
            paddingBottom: 16,
          }}
        >
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.6 }}>
              <span style={{ color: '#6EE7B7' }}>Fit</span>
              <span style={{ color: '#fff' }}>Coach</span>
              <span
                className="gradient-accent"
                style={{ fontSize: 11, fontWeight: 600, marginLeft: 6 }}
              >
                AI
              </span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
            {TABS.map((tab) => {
              const isActive = pathname === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => router.push(tab.id)}
                  className="app-sidebar-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '14px 16px',
                    border: 'none',
                    borderRadius: 12,
                    background: isActive ? 'rgba(110,231,183,0.08)' : 'transparent',
                    borderLeft: isActive ? '4px solid #6EE7B7' : '4px solid transparent',
                    marginLeft: -4,
                    paddingLeft: 20,
                    cursor: 'pointer',
                    color: isActive ? '#6EE7B7' : '#7A9A88',
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>
          {user && (
            <div
              style={{
                padding: '16px 16px 8px',
                borderTop: '1px solid rgba(110,231,183,0.08)',
                marginTop: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: '#2D5B3F',
                  fontWeight: 600,
                  marginBottom: 8,
                  wordBreak: 'break-word',
                }}
              >
                {user?.email || footerLabel}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#FB7185',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      )}

      <main
        style={{
          ...(hideNav || !isDesktop
            ? {
                maxWidth: 1200,
                width: '100%',
                marginLeft: 'auto',
                marginRight: 'auto',
              }
            : {
                marginLeft: SIDEBAR_W,
                width: `calc(100vw - ${SIDEBAR_W}px)`,
                maxWidth: 'none',
              }),
          minWidth: 0,
          overflowX: 'hidden',
          position: 'relative',
          zIndex: 1,
          minHeight: 'min(100vh, 100dvh)',
          paddingBottom:
            hideNav || isDesktop
              ? 0
              : 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
      >
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

      {!hideNav && !isDesktop && (
        <BottomNav tabs={TABS} pathname={pathname} router={router} />
      )}
    </>
  )
}

function BottomNav({ tabs, pathname, router }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'space-around',
        boxSizing: 'border-box',
        minHeight: 'calc(52px + env(safe-area-inset-bottom, 0px))',
        padding: `8px max(0px, env(safe-area-inset-right, 0px)) calc(12px + env(safe-area-inset-bottom, 0px)) max(0px, env(safe-area-inset-left, 0px))`,
        background: 'rgba(7,11,7,0.92)',
        borderTop: '1px solid rgba(110,231,183,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10,
      }}
    >
      {tabs.map((tab) => (
        <BottomNavTab
          key={tab.id}
          tab={tab}
          isActive={pathname === tab.id}
          onClick={() => router.push(tab.id)}
        />
      ))}
    </nav>
  )
}

function BottomNavTab({ tab, isActive, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      style={{
        background: 'none',
        border: 'none',
        padding: '12px 20px',
        minWidth: 44,
        minHeight: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          marginTop: 2,
          color: isActive ? '#6EE7B7' : '#1A3326',
          transition: 'color 0.2s ease',
        }}
      >
        {tab.label}
      </div>
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
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
