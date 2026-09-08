'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Map lives inside Buddies now. */
export default function MapRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/buddies')
  }, [router])
  return null
}
