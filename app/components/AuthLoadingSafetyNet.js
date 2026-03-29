'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'

/** Must exceed worst-case init (getUser + getSession + profile fetch races ~9s) so we never open the shell with user still null. */
const SAFETY_MS = 14000

/** Belt-and-suspenders: forces auth gate open if loading stays true too long. */
export default function AuthLoadingSafetyNet() {
  const { loading, forceReleaseLoading } = useAuth()
  const releasedRef = useRef(false)

  useEffect(() => {
    releasedRef.current = false
  }, [loading])

  useEffect(() => {
    if (!loading) return
    const id = setTimeout(() => {
      if (!releasedRef.current) {
        releasedRef.current = true
        forceReleaseLoading()
      }
    }, SAFETY_MS)
    return () => clearTimeout(id)
  }, [loading, forceReleaseLoading])

  return null
}
