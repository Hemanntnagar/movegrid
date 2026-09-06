'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bolt,
  Crown,
  Flame,
  LoaderCircle,
  Minus,
  Search,
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
import { AppChrome } from '../../components/AppChrome'

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

function PenguinMascot({ message = "See who's leading the pack!" }: { message?: string }) {
  return (
    <div className="penguin-mascot-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.6rem 0.9rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg className="penguin-svg" width="38" height="42" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="65" rx="35" ry="40" fill="#0f172a" />
        <ellipse cx="50" cy="68" rx="24" ry="32" fill="#ffffff" />
        <circle cx="50" cy="32" r="24" fill="#0f172a" />
        <circle cx="42" cy="28" r="4" fill="#ffffff" />
        <circle cx="43" cy="28" r="2" fill="#000000" />
        <circle cx="58" cy="28" r="4" fill="#ffffff" />
        <circle cx="57" cy="28" r="2" fill="#000000" />
        <polygon points="50,32 44,38 56,38" fill="#f97316" />
        <circle cx="36" cy="34" r="3" fill="#f43f5e" opacity="0.6" />
        <circle cx="64" cy="34" r="3" fill="#f43f5e" opacity="0.6" />
        <rect x="30" y="48" width="40" height="8" rx="4" fill="#38bdf8" />
        <rect x="58" y="52" width="10" height="20" rx="3" fill="#0284c7" />
        <ellipse cx="14" cy="65" rx="7" ry="18" fill="#0f172a" transform="rotate(20 14 65)" />
        <ellipse cx="86" cy="65" rx="7" ry="18" fill="#0f172a" transform="rotate(-20 86 65)" />
        <ellipse cx="38" cy="102" rx="10" ry="5" fill="#f97316" />
        <ellipse cx="62" cy="102" rx="10" ry="5" fill="#f97316" />
      </svg>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>
          <span>🐧 Pebble the Mascot</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#e2e8f0', fontStyle: 'italic' }}>&quot;{message}&quot;</p>
      </div>
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
          {entry.name} {entry.is_current_user && <span className="pill lime">you</span>}
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
  const [search, setSearch] = useState('')
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

  const filteredEntries = useMemo(() => {
    if (!board) return []
    if (!search.trim()) return board.entries
    return board.entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
  }, [board, search])

  const top3 = useMemo(() => {
    if (!board) return []
    return board.entries.slice(0, 3)
  }, [board])

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
      <AppChrome
        rightSlot={
          <>
            <div className="move-chip">
              <Zap size={14} fill="currentColor" />
              {user.total_points.toLocaleString()} MOVE
            </div>
            <button className="outline-button" onClick={logout}>
              Log out
            </button>
          </>
        }
      />

      <main className="main-content leaderboard-page">
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link className="text-button" href="/">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <p className="eyebrow">STANDINGS</p>
            <h1>
              See who&apos;s moving, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">
              Rankings update automatically after every completed 10k step challenge or workout.
            </p>
          </div>
          <PenguinMascot message="Climb the ranks! Every step gets you higher on the leaderboard!" />
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

        {top3.length >= 3 && !search && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {top3.map((entry, idx) => (
              <div
                key={`podium-${entry.id}`}
                className="stat-card"
                style={{
                  background: idx === 0 ? 'rgba(255, 212, 71, 0.12)' : idx === 1 ? 'rgba(190, 200, 210, 0.12)' : 'rgba(230, 150, 100, 0.12)',
                  border: idx === 0 ? '1px solid rgba(255, 212, 71, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    className="avatar"
                    style={{
                      width: '42px',
                      height: '42px',
                      fontSize: '1rem',
                      background: idx === 0 ? '#ffd447' : idx === 1 ? '#cbd5e1' : '#f97316',
                      color: '#0f172a',
                      fontWeight: 'bold',
                    }}
                  >
                    {initialsFromAvatar(entry.avatar, entry.name)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Crown size={14} color={idx === 0 ? '#ffd447' : idx === 1 ? '#cbd5e1' : '#f97316'} />
                      <span className="eyebrow" style={{ color: '#fff', fontSize: '0.75rem' }}>
                        RANK #{entry.rank}
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{entry.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.1rem', fontWeight: '600' }}>
                      {entry.points.toLocaleString()} {board.metric_label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <section className="lb-panel">
          <div className="lb-panel-head">
            <div>
              <p className="eyebrow">{board.metric_label}</p>
              <h2>{board.title}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  type="text"
                  placeholder="Search movers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: '0.35rem 0.6rem 0.35rem 2rem',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                />
              </div>
              <span className="pill lime">Top {board.limit}</span>
            </div>
          </div>

          <div className="lb-list">
            {filteredEntries.map((entry) => (
              <LeaderRow key={`${board.board}-${entry.id}`} entry={entry} metric={board.metric_label} tone={activeTab.tone} />
            ))}
            {filteredEntries.length === 0 && (
              <div className="fitness-empty">
                <Trophy size={22} />
                <strong>No movers found</strong>
                <span>Try searching another name or reset the filter.</span>
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
      </main>
    </div>
  )
}
