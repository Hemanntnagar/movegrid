'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Leaderboard removed — competitions list lives at /competitions. */
export default function LeaderboardRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/competitions')
  }, [router])
  return null
}
