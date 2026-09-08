'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Bolt, LoaderCircle, LogIn, UserPlus, Sparkles, Trophy } from 'lucide-react'
import { clearToken, getStoredToken, isDemoMode, movegridApi, storeToken } from '../../lib/api'
import { hasCompletedOnboarding } from '../../lib/fitnessPlan'
import { useRouter } from 'next/navigation'

function Brand() {
  return (
    <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
      <div className="brand-mark">
        <Trophy size={18} fill="currentColor" />
      </div>
      <span>
        MOVE<span>GRID</span>
      </span>
    </Link>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner')
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
      const tokenRes = await movegridApi.register(name, email, password, fitnessLevel)
      let tokenStr = typeof tokenRes === 'object' && 'access_token' in tokenRes ? (tokenRes as any).access_token : null
      if (!tokenStr) {
        const loginRes = await movegridApi.login(email, password)
        tokenStr = loginRes.access_token
      }
      storeToken(tokenStr)
      router.push(hasCompletedOnboarding() ? '/' : '/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
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
        <div className="login-card">
          <div className="auth-tabs">
            <Link href="/login" className="auth-tab" style={{ textDecoration: 'none' }}>
              <LogIn size={15} /> Sign In
            </Link>
            <div className="auth-tab active">
              <UserPlus size={15} /> Sign Up
            </div>
          </div>

          <p className="eyebrow">JOIN MOVEGRID</p>
          <h1>
            Start earning <span>MOVE points</span>
          </h1>
          <p className="subhead">
            Create an account to save your progress, climb standings, and unlock rewards.
          </p>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px', marginTop: '8px' }}>
            <label>
              Full Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="e.g. Alex Mover"
                required
                autoComplete="name"
              />
            </label>

            <label>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>

            <label>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>

            <label>
              Fitness Experience
              <div className="fitness-level-selector">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`level-pill ${fitnessLevel === level ? 'selected' : ''}`}
                    onClick={() => setFitnessLevel(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="primary-button full" type="submit" disabled={loading} style={{ marginTop: '6px' }}>
              {loading ? <LoaderCircle size={16} className="spin" /> : <UserPlus size={16} />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="signup-bonus-badge">
            <Sparkles size={16} />
            <span>Get <strong>+250 MOVE bonus points</strong> when you sign up today!</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <p className="login-hint">
              Already have an account?{' '}
              <Link
                href="/login"
                style={{ color: '#657a17', fontWeight: 900, textDecoration: 'underline' }}
              >
                Sign in here
              </Link>
            </p>
          </div>

          <p className="login-hint" style={{ fontSize: '10px', opacity: 0.85, marginTop: '8px' }}>
            {isDemoMode
              ? 'Offline demo — any email/password works without backend setup.'
              : 'Demo mode active.'}
          </p>
        </div>
      </main>
    </div>
  )
}
