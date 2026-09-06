'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Bolt, LoaderCircle, LogIn } from 'lucide-react'
import { clearToken, getStoredToken, isDemoMode, movegridApi, storeToken } from '../../lib/api'
import { hasCompletedOnboarding } from '../../lib/fitnessPlan'
import { useRouter } from 'next/navigation'

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Bolt size={18} fill="currentColor" />
      </div>
      <span>
        MOVE<span>GRID</span>
      </span>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('student@movegrid.demo')
  const [password, setPassword] = useState('movegrid-demo')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    movegridApi
      .me(token)
      .then(() => router.replace(hasCompletedOnboarding() ? '/' : '/onboarding'))
      .catch(() => clearToken())
  }, [router])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const token = await movegridApi.login(email, password)
      storeToken(token.access_token)
      router.push(hasCompletedOnboarding() ? '/' : '/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell login-shell">
      <header className="topbar">
        <Brand />
        <Link className="outline-button" href="/">
          Back home
        </Link>
      </header>
      <main className="login-main">
        <form className="login-card" onSubmit={onSubmit}>
          <p className="eyebrow">STUDENT ACCESS</p>
          <h1>
            Jump into <span>daily fitness</span>
          </h1>
          <p className="subhead">Sign in to get today&apos;s personalized exercises and earn MOVE.</p>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" type="submit" disabled={loading}>
            {loading ? <LoaderCircle size={16} className="spin" /> : <LogIn size={16} />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="login-hint">
            {isDemoMode
              ? 'Offline demo — any email/password works (no API env needed).'
              : 'Demo: student@movegrid.demo / movegrid-demo'}
          </p>
        </form>
      </main>
    </div>
  )
}
