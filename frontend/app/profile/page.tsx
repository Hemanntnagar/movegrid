'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Footprints,
  Gift,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react'
import { ApiUser, MOVEGRID_USER_UPDATED, clearToken, getStoredToken, movegridApi } from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'
import { getStoredPlan } from '../../lib/fitnessPlan'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const plan = getStoredPlan()

  function refreshUser() {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    movegridApi
      .me(token)
      .then(setUser)
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refreshUser()
  }, [])

  useEffect(() => {
    const onUserUpdated = () => refreshUser()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUser()
    }
    window.addEventListener(MOVEGRID_USER_UPDATED, onUserUpdated)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(MOVEGRID_USER_UPDATED, onUserUpdated)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function handleSignOut() {
    clearToken()
    setUser(null)
    router.push('/login')
  }

  const initials = user
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : 'G'

  return (
    <div className="app-shell">
      <AppChrome />

      <main className="main-content profile-page">
        <div className="profile-hero-card">
          <div className="profile-hero-main">
            <div className="profile-hero-avatar">
              <span>{initials}</span>
              <div className="profile-avatar-badge" title="Active member">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="profile-hero-info">
              <div className="profile-identity">
                <p className="profile-identity-label">{user ? 'Your profile' : 'Guest session'}</p>
                <h1 className="profile-display-name">{user ? user.name : 'Guest User'}</h1>
                <div className="profile-badges-row">
                  <span className="pill lime">{user?.role ? user.role.toUpperCase() : 'GUEST'}</span>
                  <span className="pill orange">
                    {user?.fitness_level || plan?.fitnessLevel || 'Beginner'} tier
                  </span>
                </div>
              </div>
              <p className="profile-email">
                {user ? user.email : 'Sign in to sync MOVE points and streaks'}
              </p>
              <div className="profile-tags">
                <span className="profile-tag">
                  <Zap size={13} /> {user ? user.total_points.toLocaleString() : 0} MOVE
                </span>
                <span className="profile-tag">
                  <Flame size={13} /> {user?.streak ?? 0} Day Streak
                </span>
                <span className="profile-tag">
                  <Footprints size={13} /> {user?.active_minutes ?? 0} Active Mins
                </span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            {user ? (
              <>
                <Link href="/onboarding" className="outline-button">
                  Update plan <ArrowRight size={14} />
                </Link>
                <button type="button" className="outline-button danger" onClick={handleSignOut}>
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link href="/login" className="primary-button" style={{ textDecoration: 'none' }}>
                  <LogIn size={15} /> Sign in
                </Link>
                <Link href="/signup" className="outline-button" style={{ textDecoration: 'none' }}>
                  <UserPlus size={15} /> Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="stat-box-icon lime">
              <Zap size={22} />
            </div>
            <div>
              <p>Total MOVE Points</p>
              <strong>{user ? user.total_points.toLocaleString() : '0'}</strong>
              <small>From challenges, daily path, and missions</small>
            </div>
          </div>

          <div className="profile-stat-box">
            <div className="stat-box-icon orange">
              <Flame size={22} />
            </div>
            <div>
              <p>Current Streak</p>
              <strong>{user?.streak ?? 0} Days</strong>
              <small>Streak score: {user?.streak_score ?? 0} pts</small>
            </div>
          </div>

          <div className="profile-stat-box">
            <div className="stat-box-icon blue">
              <Footprints size={22} />
            </div>
            <div>
              <p>Active Movement</p>
              <strong>{user?.active_minutes ?? 0} mins</strong>
              <small>Total exercise time logged</small>
            </div>
          </div>

          <div className="profile-stat-box">
            <div className="stat-box-icon purple">
              <Trophy size={22} />
            </div>
            <div>
              <p>Fitness Level</p>
              <strong>{user?.fitness_level || plan?.fitnessLevel || 'Beginner'}</strong>
              <small>Custom tailored workout schedule</small>
            </div>
          </div>
        </div>

        {/* Profile Content Sections */}
        <div className="profile-details-grid">
          {/* Account Details Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <User size={20} className="card-header-icon" />
              <div>
                <h2>Account Details</h2>
                <p>Personal profile information and rank status</p>
              </div>
            </div>

            <div className="profile-info-list">
              <div className="info-row">
                <span>Display Name</span>
                <strong>{user ? user.name : 'Guest User'}</strong>
              </div>
              <div className="info-row">
                <span>Email Address</span>
                <strong>{user ? user.email : 'Not signed in'}</strong>
              </div>
              <div className="info-row">
                <span>User ID</span>
                <strong>#{user ? user.id : '0000'}</strong>
              </div>
              <div className="info-row">
                <span>Team / Squad</span>
                <strong>{user?.team_id ? `Team #${user.team_id}` : 'Solo Mover'}</strong>
              </div>
              <div className="info-row">
                <span>Account Status</span>
                <span className="pill lime">Active Member</span>
              </div>
            </div>
          </div>

          {/* Fitness Plan Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <Target size={20} className="card-header-icon" />
              <div>
                <h2>Fitness Plan & Goals</h2>
                <p>Current routine schedule and daily target parameters</p>
              </div>
            </div>

            <div className="profile-info-list">
              <div className="info-row">
                <span>Routine Level</span>
                <strong>{plan?.fitnessLevel || user?.fitness_level || 'Beginner'}</strong>
              </div>
              <div className="info-row">
                <span>Primary Goal</span>
                <strong>{plan?.goal || 'Build daily movement & habits'}</strong>
              </div>
              <div className="info-row">
                <span>Scheduled Exercises</span>
                <strong>{plan?.schedule?.length ?? 2} daily workouts</strong>
              </div>
              <div className="info-row">
                <span>Reset Window</span>
                <strong>24-Hour IST Daily Window</strong>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <Link href="/onboarding" className="outline-button full" style={{ textDecoration: 'none' }}>
                <Sparkles size={15} /> Re-customize Fitness Questionnaire
              </Link>
            </div>
          </div>
        </div>

        {/* Login & Sign Up Options / Session Card */}
        <div className="profile-card full-width-card" style={{ marginTop: '24px' }}>
          <div className="profile-card-header">
            <ShieldCheck size={20} className="card-header-icon" />
            <div>
              <h2>Authentication & Account Access</h2>
              <p>Manage session login credentials, switch accounts, or register new profile</p>
            </div>
          </div>

          <div className="auth-access-banner">
            {user ? (
              <div className="auth-access-content">
                <div>
                  <h3>
                    Logged in as <span className="profile-logged-in-name">{user.name}</span>
                  </h3>
                  <p>Your progress is saved locally and synced with MOVEGRID servers.</p>
                </div>
                <div className="auth-access-buttons">
                  <Link href="/login" className="outline-button" style={{ textDecoration: 'none' }}>
                    <LogIn size={14} /> Switch Account
                  </Link>
                  <Link href="/signup" className="outline-button" style={{ textDecoration: 'none' }}>
                    <UserPlus size={14} /> Register New Account
                  </Link>
                  <button type="button" className="outline-button danger" onClick={handleSignOut}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-access-content">
                <div>
                  <h3>Browsing as Guest</h3>
                  <p>Sign in or create an account to save your MOVE points, streak, and competition progress.</p>
                </div>
                <div className="auth-access-buttons">
                  <Link href="/login" className="primary-button" style={{ textDecoration: 'none' }}>
                    <LogIn size={15} /> Sign In
                  </Link>
                  <Link href="/signup" className="outline-button" style={{ textDecoration: 'none' }}>
                    <UserPlus size={15} /> Sign Up
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
