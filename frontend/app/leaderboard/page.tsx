'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Leaderboard page moved to /standings */
export default function LeaderboardRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/standings')
  }, [router])
  return null
}
