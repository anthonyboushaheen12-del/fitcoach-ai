'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'

/** Must exceed worst-case init (10s auth race + 10s profile fetch + retries) before forcing the shell open. */
const SAFETY_MS = 26000

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
