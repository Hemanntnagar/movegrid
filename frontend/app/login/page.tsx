'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { Bolt, LoaderCircle, LogIn, UserPlus, Sparkles, Trophy } from 'lucide-react'
import { clearToken, getStoredToken, isDemoMode, movegridApi, storeToken } from '../../lib/api'
import { hasCompletedOnboarding } from '../../lib/fitnessPlan'
import { useRouter, useSearchParams } from 'next/navigation'

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

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  
  const [mode, setMode] = useState<'login' | 'signup'>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('demo@movegrid.demo')
  const [password, setPassword] = useState('movegrid-demo')
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
      if (mode === 'signup') {
        const tokenRes = await movegridApi.register(name, email, password, fitnessLevel)
        let tokenStr = typeof tokenRes === 'object' && 'access_token' in tokenRes ? (tokenRes as any).access_token : null
        if (!tokenStr) {
          const loginRes = await movegridApi.login(email, password)
          tokenStr = loginRes.access_token
        }
        storeToken(tokenStr)
      } else {
        const token = await movegridApi.login(email, password)
        storeToken(token.access_token)
      }
      router.push(hasCompletedOnboarding() ? '/' : '/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : `${mode === 'login' ? 'Sign in' : 'Sign up'} failed`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => { setMode('login'); setError(''); }}
        >
          <LogIn size={15} /> Sign In
        </button>
        <button
          type="button"
          className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => { setMode('signup'); setError(''); }}
        >
          <UserPlus size={15} /> Sign Up
        </button>
      </div>

      <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN MOVEGRID'}</p>
      <h1>
        {mode === 'login' ? (
          <>Jump into <span>daily fitness</span></>
        ) : (
          <>Start earning <span>MOVE points</span></>
        )}
      </h1>
      <p className="subhead">
        {mode === 'login'
          ? 'Sign in to access your personalized path, daily exercises, and track your streak.'
          : 'Create an account to save your progress, climb standings, and unlock rewards.'}
      </p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px', marginTop: '8px' }}>
        {mode === 'signup' && (
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
        )}

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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {mode === 'signup' && (
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
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button full" type="submit" disabled={loading} style={{ marginTop: '6px' }}>
          {loading ? (
            <LoaderCircle size={16} className="spin" />
          ) : mode === 'login' ? (
            <LogIn size={16} />
          ) : (
            <UserPlus size={16} />
          )}
          {loading
            ? mode === 'login' ? 'Signing in…' : 'Creating account…'
            : mode === 'login' ? 'Sign in' : 'Create Account'}
        </button>
      </form>

      {mode === 'signup' && (
        <div className="signup-bonus-badge">
          <Sparkles size={16} />
          <span>Get <strong>+250 MOVE bonus points</strong> when you sign up today!</span>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '6px' }}>
        {mode === 'login' ? (
          <p className="login-hint">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#657a17', fontWeight: 900, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Sign up now
            </button>
          </p>
        ) : (
          <p className="login-hint">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#657a17', fontWeight: 900, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Sign in here
            </button>
          </p>
        )}
      </div>

      <p className="login-hint" style={{ fontSize: '10px', opacity: 0.85, marginTop: '8px' }}>
        {isDemoMode
          ? 'Offline demo — any email/password works without backend setup.'
          : 'Demo credentials: demo@movegrid.demo / movegrid-demo'}
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="app-shell login-shell">
      <header className="topbar">
        <Brand />
        <Link className="outline-button" href="/">
          Back home
        </Link>
      </header>
      <main className="login-main">
        <Suspense fallback={<div className="login-card"><p>Loading…</p></div>}>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  )
}
