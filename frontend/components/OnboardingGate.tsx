'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ensureDemoSession } from '../lib/api'
import { hasCompletedOnboarding } from '../lib/fitnessPlan'

const SKIP = new Set(['/onboarding', '/login'])

/** Redirects first-time visitors to the one-time questionnaire. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const skip = SKIP.has(pathname)
  const [ready, setReady] = useState(skip)

  useEffect(() => {
    if (SKIP.has(pathname)) {
      setReady(true)
      return
    }
    if (!hasCompletedOnboarding()) {
      setReady(false)
      router.replace('/onboarding')
      return
    }
    ensureDemoSession()
    setReady(true)
  }, [pathname, router])

  if (skip) return <>{children}</>
  if (!ready) {
    return (
      <div className="app-shell fitness-loading">
        <p>Preparing your plan…</p>
      </div>
    )
  }
  return <>{children}</>
}
