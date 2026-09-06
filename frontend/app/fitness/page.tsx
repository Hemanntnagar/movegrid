'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Daily exercises live on the dashboard path map. */
export default function FitnessRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/')
  }, [router])
  return null
}
