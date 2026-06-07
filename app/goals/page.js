'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BrandedAuthLoading from '../components/BrandedAuthLoading'

/** AI Goals moved into Program — redirect legacy links. */
export default function GoalsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/plans')
  }, [router])

  return <BrandedAuthLoading minHeight="70vh" />
}
