'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bolt,
  Flame,
  LoaderCircle,
  Minus,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import {
  ApiLeaderboard,
  ApiLeaderboardEntry,
  ApiUser,
  clearToken,
  getStoredToken,
  movegridApi,
} from '../../lib/api'

type BoardTab = 'move' | 'streak' | 'competition'

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

function initialsFromAvatar(avatar: string, name: string) {
  if (avatar.startsWith('initials:')) {
    return avatar.split(':')[1] || name.slice(0, 2).toUpperCase()
  }
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function colorFromAvatar(avatar: string, fallback: string) {
  if (avatar.startsWith('initials:')) {
    return avatar.split(':')[2] || fallback
  }
  return fallback
}

function MovementBadge({ movement }: { movement: number }) {
  if (movement > 0) {
    return (
      <span className="lb-move up" title={`Up ${movement}`}>
        <ArrowUp size={12} />
        {movement}
      </span>
    )
  }
  if (movement < 0) {
    return (
      <span className="lb-move down" title={`Down ${Math.abs(movement)}`}>
        <ArrowDown size={12} />
        {Math.abs(movement)}
      </span>
    )
  }
  return (
    <span className="lb-move flat" title="No change">
      <Minus size={12} />
    </span>
  )
}

function LeaderRow({
  entry,
  metric,
  tone,
}: {
  entry: ApiLeaderboardEntry
  metric: string
  tone: string
}) {
  const initials = initialsFromAvatar(entry.avatar, entry.name)
  const color = colorFromAvatar(entry.avatar, tone)
  return (
    <div className={`lb-row ${entry.is_current_user ? 'you' : ''} ${entry.rank <= 3 ? `podium-${entry.rank}` : ''}`}>
      <b className="lb-rank">{entry.rank}</b>
      <div className="lb-avatar" style={{ background: color }}>
        {initials}
      </div>
      <div className="lb-identity">
        <strong>
          {entry.name}
          {entry.is_current_user && <span className="pill lime">you</span>}
        </strong>
        <small>
          {typeof entry.meta?.streak === 'number' ? `${entry.meta.streak}-day streak` : null}
          {typeof entry.meta?.member_count === 'number' ? `${entry.meta.member_count} movers` : null}
        </small>
      </div>
      <MovementBadge movement={entry.movement} />
      <div className="lb-points">
        <strong>{entry.points.toLocaleString()}</strong>
        <span>{metric}</span>
      </div>
    </div>
  )
}

const TABS: { id: BoardTab; label: string; icon: typeof Zap; tone: string }[] = [
  { id: 'move', label: 'MOVE', icon: Zap, tone: '#ffd447' },
  { id: 'streak', label: 'STREAK', icon: Flame, tone: '#ff9a61' },
  { id: 'competition', label: 'COMPETITIONS', icon: Users, tone: '#8bd4f4' },
]

export default function LeaderboardPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [tab, setTab] = useState<BoardTab>('move')
  const [board, setBoard] = useState<ApiLeaderboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadBoard = useCallback(async (authToken: string, boardTab: BoardTab) => {
    const fetcher =
      boardTab === 'streak'
        ? movegridApi.leaderboardStreak
        : boardTab === 'competition'
          ? movegridApi.leaderboardCompetition
          : movegridApi.leaderboardMove
    return fetcher(authToken, 20)
  }, [])

  useEffect(() => {
    const stored = getStoredToken()
    if (!stored) {
      router.replace('/login')
      return
    }
    setToken(stored)
    setLoading(true)
    Promise.all([movegridApi.me(stored), loadBoard(stored, tab)])
      .then(([me, data]) => {
        setUser(me)
        setBoard(data)
        setError('')
      })
      .catch((err) => {
        clearToken()
        setError(err instanceof Error ? err.message : 'Could not load leaderboard')
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [loadBoard, router, tab])

  const showPinnedMe = useMemo(() => {
    if (!board?.me) return false
    return !board.entries.some((entry) => entry.id === board.me?.id && entry.is_current_user)
  }, [board])

  function logout() {
    clearToken()
    router.push('/login')
  }

  if (loading || !board || !user) {
    return (
      <div className="app-shell fitness-loading">
        <LoaderCircle className="spin" size={28} />
        <p>Loading leaderboards…</p>
      </div>
    )
  }

  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0]

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/fitness">Fitness</Link>
          <Link href="/leaderboard" className="nav-active">
            Leaderboard
          </Link>
        </nav>
        <div className="top-actions">
          <div className="move-chip">
            <Zap size={14} fill="currentColor" />
            {user.total_points.toLocaleString()} MOVE
          </div>
          <div className="avatar">{initialsFromAvatar(user.avatar, user.name)}</div>
          <button className="outline-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="main-content leaderboard-page">
        <div className="welcome">
          <div>
            <Link className="text-button" href="/">
              <ArrowLeft size={14} /> Back to campus
            </Link>
            <p className="eyebrow">CAMPUS LEADERBOARDS</p>
            <h1>
              See who&apos;s moving, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">
              Rankings are calculated on the server after every completed activity.
            </p>
          </div>
          <div className="streak-badge">
            <Trophy size={20} fill="currentColor" />
            <div>
              <strong>{board.total_participants} ranked</strong>
              <span>{board.title}</span>
            </div>
          </div>
        </div>

        <div className="lb-tabs" role="tablist" aria-label="Leaderboard type">
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                className={`lb-tab ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </div>

        {error && <p className="form-error">{error}</p>}

        <section className="lb-panel">
          <div className="lb-panel-head">
            <div>
              <p className="eyebrow">{board.metric_label}</p>
              <h2>{board.title}</h2>
            </div>
            <span className="pill lime">Top {board.limit}</span>
          </div>

          <div className="lb-list">
            {board.entries.map((entry) => (
              <LeaderRow key={`${board.board}-${entry.id}`} entry={entry} metric={board.metric_label} tone={activeTab.tone} />
            ))}
            {board.entries.length === 0 && (
              <div className="fitness-empty">
                <Trophy size={22} />
                <strong>No rankings yet</strong>
                <span>Complete a mission or fitness task to appear here.</span>
              </div>
            )}
          </div>
        </section>

        {board.me && (
          <section className={`lb-you-bar ${showPinnedMe ? 'pinned' : ''}`}>
            <div>
              <p className="eyebrow">YOUR POSITION</p>
              <h3>
                #{board.me.rank} · {board.me.name}
              </h3>
            </div>
            <MovementBadge movement={board.me.movement} />
            <div className="lb-points">
              <strong>{board.me.points.toLocaleString()}</strong>
              <span>{board.metric_label}</span>
            </div>
          </section>
        )}

        {!board.me && tab === 'competition' && (
          <section className="lb-you-bar empty">
            <div>
              <p className="eyebrow">YOUR TEAM</p>
              <h3>You are not on a competition team yet</h3>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
