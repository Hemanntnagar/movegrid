'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getStoredToken } from '../lib/api'
import { hasCompletedOnboarding } from '../lib/fitnessPlan'

const AUTH_PUBLIC = new Set(['/login', '/signup'])
const ONBOARDING_OPTIONAL = new Set(['/profile'])

/** Requires sign-in, then one-time onboarding, before the main app. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = AUTH_PUBLIC.has(pathname)
  const [ready, setReady] = useState(isPublic)

  useEffect(() => {
    if (AUTH_PUBLIC.has(pathname)) {
      setReady(true)
      return
    }

    const token = getStoredToken()
    if (!token) {
      setReady(false)
      router.replace('/login')
      return
    }

    if (!hasCompletedOnboarding() && !ONBOARDING_OPTIONAL.has(pathname)) {
      if (pathname !== '/onboarding') {
        setReady(false)
        router.replace('/onboarding')
        return
      }
      setReady(true)
      return
    }

    if (pathname === '/onboarding' && hasCompletedOnboarding()) {
      router.replace('/')
      return
    }

    setReady(true)
  }, [pathname, router])

  if (isPublic) return <>{children}</>
  if (!ready) {
    return (
      <div className="app-shell fitness-loading">
        <p>Loading…</p>
      </div>
    )
  }
  return <>{children}</>
}
