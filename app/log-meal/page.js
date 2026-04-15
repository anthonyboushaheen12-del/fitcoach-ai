'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Bottom-nav entry: opens Home with food log modal via ?logMeal=1 */
export default function LogMealPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard?logMeal=1')
  }, [router])
  return (
    <div className="app-container" style={{ padding: 48, textAlign: 'center', color: '#2D5B3F', fontSize: 14 }}>
      Opening meal log…
    </div>
  )
}
