'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bot,
  Gift,
  LogIn,
  Swords,
  Target,
  Trophy,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import { ApiUser, clearToken, getStoredToken, movegridApi } from '../lib/api'

export type MenuAction =
  | 'standings'
  | 'buddies'
  | 'competitions'
  | 'challenges'
  | 'reward-hub'
  | 'assistant'

const MENU_ITEMS: {
  id: MenuAction
  label: string
  href?: string
  icon: typeof Users
  tone: string
}[] = [
  { id: 'standings', label: 'Standings', icon: Trophy, tone: 'orange', href: '/standings' },
  { id: 'buddies', label: 'Buddies', icon: Users, tone: 'lime', href: '/buddies' },
  { id: 'competitions', label: 'Competitions', icon: Swords, tone: 'orange', href: '/competitions' },
  { id: 'challenges', label: 'Challenges', icon: Target, tone: 'purple', href: '/challenges' },
  { id: 'reward-hub', label: 'Reward Hub', icon: Gift, tone: 'lime', href: '/rewards' },
  { id: 'assistant', label: 'Assistant', icon: Bot, tone: 'blue', href: '/assistant' },
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
              href="/login"
              className="profile-orb"
              title={user.name}
              aria-label={`Profile: ${user.name}`}
            >
              <span>{initials}</span>
            </Link>
          ) : (
            <Link href="/login" className="profile-orb guest" title="Sign in" aria-label="Open profile / sign in">
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
            <div className="side-panel-user">
              <div className="profile-orb sm">{initials}</div>
              <div>
                <strong>{user.name}</strong>
                <small>{user.total_points.toLocaleString()} MOVE</small>
              </div>
            </div>
          ) : (
            <Link href="/login" className="primary-button full" onClick={() => setOpen(false)}>
              <LogIn size={15} /> Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
