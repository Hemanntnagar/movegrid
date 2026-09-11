'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Flame,
  Gift,
  LayoutDashboard,
  LogIn,
  Swords,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { ApiUser, MOVEGRID_USER_UPDATED, clearToken, getStoredToken, movegridApi } from '../lib/api'
import { ExerciseReminderBell } from './ExerciseReminderBell'

export type MenuAction =
  | 'dashboard'
  | 'challenges'
  | 'buddies'
  | 'competitions'
  | 'reward-hub'
  | 'leaderboard'

const MENU_ITEMS: {
  id: MenuAction
  label: string
  href?: string
  icon: typeof Users
  tone: string
}[] = [
  { id: 'dashboard', label: 'Dashboard Trail', icon: LayoutDashboard, tone: 'lime', href: '/' },
  { id: 'challenges', label: 'Challenges', icon: Target, tone: 'mint', href: '/challenges' },
  { id: 'leaderboard', label: 'Leaderboards', icon: Flame, tone: 'orange', href: '/leaderboard' },
  { id: 'competitions', label: 'Competitions', icon: Swords, tone: 'orange', href: '/competitions' },
  { id: 'buddies', label: 'Buddies & Nearby', icon: Users, tone: 'lime', href: '/buddies' },
  { id: 'reward-hub', label: 'Reward Store', icon: Gift, tone: 'lime', href: '/rewards' },
]

type AppChromeProps = {
  onMenuAction?: (action: MenuAction) => void
  rightSlot?: React.ReactNode
  brandHref?: string
}

export function AppChrome({ onMenuAction, rightSlot, brandHref = '/' }: AppChromeProps) {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<ApiUser | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const token = getStoredToken()

  useEffect(() => {
    function loadUser() {
      if (!token) {
        setUser(null)
        return
      }
      movegridApi
        .me(token)
        .then(setUser)
        .catch(() => {
          clearToken()
          setUser(null)
        })
    }
    loadUser()
    const onUserUpdated = () => loadUser()
    window.addEventListener(MOVEGRID_USER_UPDATED, onUserUpdated)
    return () => window.removeEventListener(MOVEGRID_USER_UPDATED, onUserUpdated)
  }, [token])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const initials = user
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : 'MG'

  const handleSelect = (item: (typeof MENU_ITEMS)[number]) => {
    setOpen(false)
    onMenuAction?.(item.id)
    if (item.href) router.push(item.href)
  }

  return (
    <>
      <header className="topbar app-chrome-topbar">
        <div className="chrome-left">
          {user ? (
            <Link
              href="/profile"
              className="profile-orb"
              title={`Profile: ${user.name}`}
              aria-label={`Profile: ${user.name}`}
            >
              <span>{initials}</span>
            </Link>
          ) : (
            <Link href="/profile" className="profile-orb guest" title="User profile" aria-label="Open user profile">
              <UserRound size={18} />
            </Link>
          )}
          <Link href={brandHref} className="brand chrome-brand">
            <div className="brand-mark">
              <Trophy size={16} fill="currentColor" />
            </div>
            <span>
              MOVE<span>GRID</span>
            </span>
          </Link>
        </div>

        <div className="chrome-right">
          <ExerciseReminderBell />
          {rightSlot}
          <button
            type="button"
            className={`hamburger-btn ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="app-side-panel"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div
        className={`side-panel-backdrop ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="app-side-panel"
        className={`side-panel ${open ? 'open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="MOVEGRID menu"
      >
        <div className="side-panel-head">
          <div>
            <p className="eyebrow">MENU</p>
            <strong>Explore MOVEGRID</strong>
          </div>
          <button type="button" className="side-panel-close" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <nav className="side-panel-nav">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`side-panel-item tone-${item.tone}`}
                onClick={() => handleSelect(item)}
              >
                <span className="side-panel-icon">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="side-panel-foot">
          {user ? (
            <Link href="/profile" className="side-panel-user" onClick={() => setOpen(false)} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="profile-orb sm">{initials}</div>
              <div>
                <strong>{user.name}</strong>
                <small>{user.total_points.toLocaleString()} MOVE · View profile</small>
              </div>
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Link href="/login" className="primary-button" style={{ flex: 1, textDecoration: 'none' }} onClick={() => setOpen(false)}>
                <LogIn size={15} /> Sign in
              </Link>
              <Link href="/signup" className="outline-button" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
