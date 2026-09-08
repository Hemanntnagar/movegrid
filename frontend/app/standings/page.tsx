'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  Award,
  Crown,
  Flame,
  Medal,
  Minus,
  Search,
  Trophy,
  Zap,
} from 'lucide-react'
import {
  ApiLeaderboard,
  ApiLeaderboardEntry,
  ApiUser,
  getStoredToken,
  movegridApi,
} from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'

type TabType = 'move' | 'streak'

function AvatarCircle({ avatar, name }: { avatar: string; name: string }) {
  if (avatar?.startsWith('initials:')) {
    const parts = avatar.split(':')
    const initials = parts[1] || name.slice(0, 2).toUpperCase()
    const bg = parts[2] || '#ffd447'
    return (
      <div className="lb-avatar" style={{ background: bg, color: '#183d59' }}>
        {initials}
      </div>
    )
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return <div className="lb-avatar">{initials || 'MG'}</div>
}

function MovementBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="lb-move up" title={`Moved up ${delta} positions`}>
        <ArrowUp size={11} /> {delta}
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="lb-move down" title={`Moved down ${Math.abs(delta)} positions`}>
        <ArrowDown size={11} /> {Math.abs(delta)}
      </span>
    )
  }
  return (
    <span className="lb-move flat" title="No change in rank">
      <Minus size={11} />
    </span>
  )
}

export default function StandingsPage() {
  const [tab, setTab] = useState<TabType>('move')
  const [moveData, setMoveData] = useState<ApiLeaderboard | null>(null)
  const [streakData, setStreakData] = useState<ApiLeaderboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)

  const token = getStoredToken()

  const fetchStandings = useCallback(async () => {
    setLoading(true)
    try {
      if (token) {
        movegridApi.me(token).then(setCurrentUser).catch(() => null)
      }
      const [moveRes, streakRes] = await Promise.all([
        movegridApi.leaderboardMove(token, 50),
        movegridApi.leaderboardStreak(token, 50),
      ])
      setMoveData(moveRes)
      setStreakData(streakRes)
    } catch (err) {
      console.error('Failed to load standings data', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStandings()
  }, [fetchStandings])

  const activeData = tab === 'move' ? moveData : streakData

  const filteredEntries = (activeData?.entries || []).filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  const topThree = (activeData?.entries || []).slice(0, 3)

  return (
    <div className="app-shell leaderboard-page">
      <AppChrome />

      <main className="main-content">
        <div className="welcome">
          <div>
            <p className="eyebrow">STANDINGS & RANKINGS</p>
            <h1>
              Community <span>Leaderboard.</span>
            </h1>
            <p className="subhead">
              Track global MOVE points accumulated and daily movement streak rankings across the MOVEGRID network.
            </p>
          </div>

          <div className="lb-tabs" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`lb-tab ${tab === 'move' ? 'active' : ''}`}
              onClick={() => setTab('move')}
            >
              <Trophy size={16} /> Global MOVE Ranking
            </button>
            <button
              type="button"
              className={`lb-tab ${tab === 'streak' ? 'active' : ''}`}
              onClick={() => setTab('streak')}
            >
              <Flame size={16} /> Streak Ranking
            </button>
          </div>
        </div>

        {/* Podium Highlight */}
        {!loading && topThree.length >= 3 && !searchQuery && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {/* 2nd Place */}
            {topThree[1] && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0f4f8, #ffffff)',
                  border: '3px solid #cbd5e1',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
                  position: 'relative',
                  marginTop: '16px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    background: '#94a3b8',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '3px 12px',
                    fontSize: '11px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Medal size={13} /> 2nd Place
                </div>
                <div style={{ marginTop: '8px' }}>
                  <AvatarCircle avatar={topThree[1].avatar} name={topThree[1].name} />
                </div>
                <strong style={{ fontSize: '16px', marginTop: '8px', color: '#1e293b' }}>
                  {topThree[1].name}
                  {topThree[1].is_current_user && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '9px',
                        background: '#38bdf8',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '999px',
                      }}
                    >
                      YOU
                    </span>
                  )}
                </strong>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  {tab === 'move' ? `${topThree[1].points.toLocaleString()} MOVE` : `${topThree[1].points} Days 🔥`}
                </span>
                <MovementBadge delta={topThree[1].movement} />
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fffbeb, #fef08a)',
                  border: '4px solid #f59e0b',
                  borderRadius: '24px',
                  padding: '22px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 12px 30px rgba(245, 158, 11, 0.18)',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-16px',
                    background: '#f59e0b',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '4px 14px',
                    fontSize: '12px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Crown size={14} /> CHAMPION #1
                </div>
                <div style={{ marginTop: '6px', scale: '1.15' }}>
                  <AvatarCircle avatar={topThree[0].avatar} name={topThree[0].name} />
                </div>
                <strong style={{ fontSize: '18px', marginTop: '12px', color: '#78350f' }}>
                  {topThree[0].name}
                  {topThree[0].is_current_user && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '9px',
                        background: '#f59e0b',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '999px',
                      }}
                    >
                      YOU
                    </span>
                  )}
                </strong>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#78350f', marginTop: '4px' }}>
                  {tab === 'move' ? `${topThree[0].points.toLocaleString()} MOVE` : `${topThree[0].points} Days 🔥`}
                </span>
                <MovementBadge delta={topThree[0].movement} />
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                  border: '3px solid #f97316',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
                  position: 'relative',
                  marginTop: '20px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    background: '#ea580c',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '3px 12px',
                    fontSize: '11px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Award size={13} /> 3rd Place
                </div>
                <div style={{ marginTop: '8px' }}>
                  <AvatarCircle avatar={topThree[2].avatar} name={topThree[2].name} />
                </div>
                <strong style={{ fontSize: '16px', marginTop: '8px', color: '#7c2d12' }}>
                  {topThree[2].name}
                  {topThree[2].is_current_user && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '9px',
                        background: '#ea580c',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '999px',
                      }}
                    >
                      YOU
                    </span>
                  )}
                </strong>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#7c2d12', marginTop: '4px' }}>
                  {tab === 'move' ? `${topThree[2].points.toLocaleString()} MOVE` : `${topThree[2].points} Days 🔥`}
                </span>
                <MovementBadge delta={topThree[2].movement} />
              </div>
            )}
          </div>
        )}

        {/* Panel Head with Search */}
        <div className="lb-panel">
          <div className="lb-panel-head">
            <div>
              <p className="eyebrow" style={{ margin: '0 0 4px' }}>
                {tab === 'move' ? 'GLOBAL MOVE RANKINGS' : 'STREAK LEADERBOARD'}
              </p>
              <h2>{activeData?.title || (tab === 'move' ? 'Top MOVE Performers' : 'Top Streak Keepers')}</h2>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fff',
                border: '2px solid var(--border)',
                borderRadius: '999px',
                padding: '6px 14px',
                maxWidth: '260px',
                width: '100%',
              }}
            >
              <Search size={15} style={{ color: '#82908a' }} />
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  width: '100%',
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          {/* Leaderboard List */}
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              Loading standings...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              No members found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="lb-list">
              {filteredEntries.map((entry) => {
                const isPodium1 = entry.rank === 1
                const isPodium2 = entry.rank === 2
                const isPodium3 = entry.rank === 3
                const podiumClass = isPodium1
                  ? 'podium-1'
                  : isPodium2
                  ? 'podium-2'
                  : isPodium3
                  ? 'podium-3'
                  : ''

                return (
                  <div
                    key={entry.id}
                    className={`lb-row ${podiumClass} ${entry.is_current_user ? 'you' : ''}`}
                  >
                    <div className="lb-rank">
                      {isPodium1 ? '🥇' : isPodium2 ? '🥈' : isPodium3 ? '🥉' : `#${entry.rank}`}
                    </div>

                    <AvatarCircle avatar={entry.avatar} name={entry.name} />

                    <div className="lb-identity">
                      <strong>
                        {entry.name}
                        {entry.is_current_user && (
                          <span
                            style={{
                              fontSize: '9px',
                              background: '#183d59',
                              color: '#fffdf0',
                              padding: '2px 6px',
                              borderRadius: '999px',
                              fontWeight: 900,
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </strong>
                      <small>
                        {tab === 'move'
                          ? `Streak: ${entry.meta?.streak ?? 0} days 🔥`
                          : `Total: ${entry.points} streak days`}
                      </small>
                    </div>

                    <MovementBadge delta={entry.movement} />

                    <div className="lb-points">
                      <strong>
                        {tab === 'move'
                          ? entry.points.toLocaleString()
                          : `${entry.points} d`}
                      </strong>
                      <span>{tab === 'move' ? 'MOVE' : 'STREAK'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Current User Standings Footer Bar */}
        {activeData?.me && (
          <div className="lb-you-bar">
            <div>
              <p className="eyebrow">YOUR CURRENT STANDING</p>
              <h3>
                {activeData.me.name} — #{activeData.me.rank} on {tab === 'move' ? 'Global Board' : 'Streak Board'}
              </h3>
            </div>

            <div className="lb-points" style={{ textAlign: 'right' }}>
              <strong>
                {tab === 'move'
                  ? `${activeData.me.points.toLocaleString()} MOVE`
                  : `${activeData.me.points} Days 🔥`}
              </strong>
              <span>RANK #{activeData.me.rank} OF {activeData.total_participants}</span>
            </div>

            <MovementBadge delta={activeData.me.movement} />
          </div>
        )}
      </main>
    </div>
  )
}
