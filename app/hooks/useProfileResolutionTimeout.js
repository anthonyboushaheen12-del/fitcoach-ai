'use client'

import { useEffect, useState } from 'react'

/**
 * After `ms` while user is set and profile is still missing, `timedOut` becomes true.
 * Resets when user is null or profile appears.
 */
export function useProfileResolutionTimeout(user, profile, ms = 3000) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!user) {
      setTimedOut(false)
      return
    }
    if (profile?.id) {
      setTimedOut(false)
      return
    }
    const id = setTimeout(() => setTimedOut(true), ms)
    return () => clearTimeout(id)
  }, [user, profile?.id, ms])

  return timedOut
}
