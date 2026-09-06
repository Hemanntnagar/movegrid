'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowRight, BarChart3, Bell, Bolt, Check, ChevronRight, CircleHelp,
  Flame, Gift, LayoutDashboard, Lock, MapPin, Plus, Target, Trash2, Trophy,
  Unlock, Users, X, Zap
} from 'lucide-react'
import {
  ApiTodayFitness, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { AppChrome } from '../components/AppChrome'
import { DashboardPath } from '../components/DashboardPath'

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

function Pill({ children, tone = 'lime' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function DailyChallengeBar({
  unlocked,
  secondsRemaining,
  challengeTitle,
  challengeMove,
}: {
  unlocked: boolean
  secondsRemaining: number
  challengeTitle: string
  challengeMove: number
}) {
  return (
    <div className={`daily-challenge-bar ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="daily-challenge-copy">
        <p className="eyebrow">DAILY CHALLENGE · 24H</p>
        <strong>{challengeTitle}</strong>
        <span>
          {unlocked
            ? `Unlocked · +${challengeMove} MOVE · expires in ${formatCountdown(secondsRemaining)}`
            : `Finish today's path level to unlock · expires in ${formatCountdown(secondsRemaining)}`}
        </span>
        {unlocked ? (
          <Link href="/challenges" className="daily-challenge-inline">
            Open challenge <ArrowRight size={14} />
          </Link>
        ) : (
          <span className="daily-challenge-inline">Tap today&apos;s level on the trail below</span>
        )}
      </div>
      <div className="daily-challenge-lock" aria-label={unlocked ? 'Challenge unlocked' : 'Challenge locked'}>
        {unlocked ? <Unlock size={22} /> : <Lock size={22} />}
      </div>
    </div>
  )
}

function StudentView({ onAdmin }: { onAdmin: () => void }) {
  const [move, setMove] = useState(2480)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [fitness, setFitness] = useState<ApiTodayFitness | null>(null)
  const [tick, setTick] = useState(0)
  const [rankLabel, setRankLabel] = useState('#24')

  const token = getStoredToken()

  const load = useCallback(async (authToken: string) => {
    const me = await movegridApi.me(authToken)
    setUser(me)
    if (me.total_points) setMove(me.total_points)
    try {
      const board = await movegridApi.leaderboardMove(authToken, 20)
      if (board.me?.rank) setRankLabel(`#${board.me.rank}`)
    } catch {
      /* keep demo rank */
    }
  }, [])

  useEffect(() => {
    if (!token) return
    load(token).catch(() => clearToken())
  }, [token, load])

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const dailyExerciseDone = useMemo(() => {
    if (!fitness) return false
    if (fitness.progress.total > 0) {
      return fitness.progress.completed >= fitness.progress.total
    }
    return fitness.assigned.length === 0 && fitness.completed.length > 0
  }, [fitness])

  const secondsRemaining = useMemo(() => {
    void tick
    if (fitness?.expires_at) {
      return Math.max(0, Math.floor((new Date(fitness.expires_at).getTime() - Date.now()) / 1000))
    }
    // Fallback: end of local day window (24h from midnight)
    const end = new Date()
    end.setHours(24, 0, 0, 0)
    return Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000))
  }, [fitness?.expires_at, tick])

  const activeMinutes = user?.active_minutes ?? 86

  return (
    <div className="app-shell">
      <AppChrome
        rightSlot={
          <button type="button" className="icon-button" aria-label="Notifications">
            <Bell size={18} />
          </button>
        }
      />

      <main className="main-content dashboard-with-trail">
        <div className="welcome trail-welcome">
          <div>
            <p className="eyebrow">MOVEGRID</p>
            <h1>
              Keep moving, <span>{user ? user.name.split(' ')[0] : 'Alex'}.</span>
            </h1>
            <p className="subhead">Tap today&apos;s level · finish before the 24-hour IST window ends.</p>
          </div>
          <div className="move-chip">
            <Zap size={14} fill="currentColor" />
            {move.toLocaleString()} MOVE
          </div>
        </div>

        <DailyChallengeBar
          unlocked={dailyExerciseDone}
          secondsRemaining={secondsRemaining}
          challengeTitle="10,000 Daily Steps Goal"
          challengeMove={150}
        />

        <section className="stats-grid" style={{ marginTop: '1.25rem' }}>
          <StatCard icon={<Zap size={19} />} label="MOVE points" value={move.toLocaleString()} detail="+150 today" tone="lime" />
          <StatCard icon={<Flame size={19} />} label="Current streak" value={`${user?.streak ?? 7} days`} detail="2 days to badge" tone="orange" />
          <StatCard icon={<Activity size={19} />} label="Active minutes" value={String(activeMinutes)} detail="of 150 weekly" tone="blue" />
          <StatCard icon={<Trophy size={19} />} label="Global rank" value={rankLabel} detail="↑ 6 places" tone="purple" />
        </section>

        <div className="home-quick-links">
          <Link href="/challenges" className="outline-button">
            <Target size={15} /> Challenges
          </Link>
          <Link href="/leaderboard" className="outline-button">
            <Trophy size={15} /> Standings
          </Link>
          <Link href="/assistant" className="outline-button">
            Customize plan
          </Link>
          <Link href="/buddies" className="outline-button">
            <Users size={15} /> Buddies
          </Link>
        </div>

        <DashboardPath onPointsChange={setMove} onFitnessChange={setFitness} />
      </main>

      <footer className="mobile-nav">
        {(
          [
            ['Home', LayoutDashboard, '/'],
            ['Challenges', Target, '/challenges'],
            ['Standings', Trophy, '/leaderboard'],
            ['Rewards', Gift, '/rewards'],
          ] as const
        ).map(([label, Icon, path]) => (
          <Link className={label === 'Home' ? 'active' : ''} href={path} key={label}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </footer>

      <div className="demo-note">
        MOVEGRID DEMO · <button type="button" onClick={onAdmin}>Switch to admin</button>
      </div>
    </div>
  )
}

function AdminView({ onStudent }: { onStudent: () => void }) {
  const [tab, setTab] = useState('Overview')
  const [modalOpen, setModalOpen] = useState(false)

  const [challenges, setChallenges] = useState([
    { id: 1, title: '10,000 Daily Steps Goal', zone: 'Downtown Loop', move: 150, minutes: 45, completions: 842, status: 'Live' },
    { id: 2, title: 'Hydration Hero: Drink 2L Water', zone: 'Hydration Tracker', move: 100, minutes: 5, completions: 1205, status: 'Live' },
    { id: 3, title: 'City Park 5K Trail Run', zone: 'Central Park', move: 200, minutes: 28, completions: 430, status: 'Live' },
  ])

  const [zones, setZones] = useState([
    { id: 1, name: 'Central Park Trail', code: 'CP-01', activeMissions: 4, qr: 'cp-qr-token-01' },
    { id: 2, name: 'Downtown District', code: 'DT-02', activeMissions: 3, qr: 'dt-qr-token-02' },
    { id: 3, name: 'Riverside Bikeway', code: 'RB-03', activeMissions: 5, qr: 'rb-qr-token-03' },
  ])

  const [rewards, setRewards] = useState([
    { id: 1, title: 'Organic Smoothie Voucher', category: 'Health & Dining', points: 300, stock: 45 },
    { id: 2, title: 'Gym & Spa Day Pass', category: 'Sports', points: 500, stock: 20 },
    { id: 3, title: 'Performance Running Socks', category: 'Merchandise', points: 400, stock: 35 },
  ])

  const [newTitle, setNewTitle] = useState('')
  const [newZone, setNewZone] = useState('')
  const [newMove, setNewMove] = useState('150')

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return
    const created = {
      id: Date.now(),
      title: newTitle,
      zone: newZone || 'City District',
      move: parseInt(newMove) || 150,
      minutes: 15,
      completions: 0,
      status: 'Live',
    }
    setChallenges([created, ...challenges])
    setNewTitle('')
    setNewZone('')
    setModalOpen(false)
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <div className="admin-label">OPERATIONS</div>
        {[
          ['Overview', LayoutDashboard],
          ['Challenges', Target],
          ['Workout zones', MapPin],
          ['Rewards', Gift],
          ['Movers', Users],
          ['Analytics', BarChart3],
        ].map(([n, I]) => {
          const Icon = I as typeof LayoutDashboard
          return (
          <button type="button" className={tab === n ? 'selected' : ''} onClick={() => setTab(String(n))} key={String(n)}>
            <Icon size={17} />
            {String(n)}
            {n === 'Challenges' && <span className="sidebar-count">{challenges.length}</span>}
          </button>
          )
        })}
        <div className="sidebar-spacer" />
        <button type="button">
          <CircleHelp size={17} />
          Help center
        </button>
        <div className="admin-user">
          <div className="avatar">AD</div>
          <div>
            <strong>Admin Demo</strong>
            <span>Global ops</span>
          </div>
          <ChevronRight size={15} />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">GLOBAL OPERATIONS / {tab.toUpperCase()}</p>
            <h1>Good morning, Admin.</h1>
            <p className="subhead">Manage active daily missions, workout routes, and community rewards.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="date-button">
              Oct 21 – Oct 27, 2024 <ChevronRight size={15} />
            </button>
            <button type="button" className="primary-button" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Create item
            </button>
            <button type="button" className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button type="button" className="admin-switch" onClick={onStudent}>
              User view <ArrowRight size={14} />
            </button>
          </div>
        </header>

        {tab === 'Overview' && (
          <>
            <div className="admin-kpi">
              <div>
                <p className="eyebrow">PRIMARY KPI</p>
                <h2>Movement Generated</h2>
                <div className="big-kpi">
                  52,840 <small>MOVE</small>
                </div>
                <span className="positive">
                  <ArrowRight size={13} /> 22.4% vs last week
                </span>
              </div>
              <div className="kpi-chart">
                <div className="chart-bars">
                  {[40, 62, 47, 72, 55, 84, 68, 92, 74, 88, 80, 100].map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} className={i > 9 ? 'current' : ''} />
                  ))}
                </div>
                <div className="chart-labels">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            <div className="admin-stat-grid">
              <StatCard icon={<Users size={18} />} label="Total movers" value="6,420" detail="↑ 12.2% this month" tone="blue" />
              <StatCard icon={<Activity size={18} />} label="Active daily" value="2,910" detail="45% of total" tone="lime" />
              <StatCard icon={<Target size={18} />} label="Missions completed" value="18,420" detail="↑ 31.5% this week" tone="orange" />
              <StatCard icon={<BarChart3 size={18} />} label="Engagement rate" value="74.2%" detail="↑ 5.2% vs last week" tone="purple" />
            </div>
          </>
        )}

        <div className="admin-panel table-panel" style={{ marginTop: '1.5rem' }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LIVE MANAGEMENT</p>
              <h2>{tab}</h2>
            </div>
            <button type="button" className="outline-button" onClick={() => setModalOpen(true)}>
              + Add new
            </button>
          </div>

          {tab === 'Overview' || tab === 'Challenges' ? (
            <div className="challenge-table">
              <div className="table-head">
                <span>MISSION</span>
                <span>ZONE</span>
                <span>MOVE REWARD</span>
                <span>COMPLETIONS</span>
                <span>STATUS</span>
                <span />
              </div>
              {challenges.map((m) => (
                <div className="table-row" key={m.id}>
                  <div>
                    <div className="table-icon mint">
                      <Target size={16} />
                    </div>
                    <strong>{m.title}</strong>
                  </div>
                  <span>{m.zone}</span>
                  <span>+{m.move} MOVE</span>
                  <span>{m.completions}</span>
                  <Pill tone="lime">{m.status}</Pill>
                  <button
                    type="button"
                    className="kebab"
                    onClick={() => setChallenges(challenges.filter((c) => c.id !== m.id))}
                    title="Delete challenge"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : tab === 'Workout zones' ? (
            <div className="challenge-table">
              <div className="table-head">
                <span>ZONE NAME</span>
                <span>CODE</span>
                <span>ACTIVE ROUTES</span>
                <span>CHECKPOINT</span>
                <span />
              </div>
              {zones.map((z) => (
                <div className="table-row" key={z.id}>
                  <div>
                    <div className="table-icon orange">
                      <MapPin size={16} />
                    </div>
                    <strong>{z.name}</strong>
                  </div>
                  <span>{z.code}</span>
                  <span>{z.activeMissions} routes</span>
                  <Pill tone="blue">{z.qr}</Pill>
                  <button
                    type="button"
                    className="kebab"
                    onClick={() => setZones(zones.filter((item) => item.id !== z.id))}
                    title="Remove zone"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : tab === 'Rewards' ? (
            <div className="challenge-table">
              <div className="table-head">
                <span>REWARD TITLE</span>
                <span>CATEGORY</span>
                <span>COST</span>
                <span>STOCK</span>
                <span />
              </div>
              {rewards.map((r) => (
                <div className="table-row" key={r.id}>
                  <div>
                    <div className="table-icon purple">
                      <Gift size={16} />
                    </div>
                    <strong>{r.title}</strong>
                  </div>
                  <span>{r.category}</span>
                  <span>{r.points} MOVE</span>
                  <Pill tone={r.stock > 15 ? 'lime' : 'orange'}>{r.stock} left</Pill>
                  <button
                    type="button"
                    className="kebab"
                    onClick={() => setRewards(rewards.filter((item) => item.id !== r.id))}
                    title="Remove reward"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <h3>{tab} Dashboard</h3>
              <p>Active live management module ready for community operations.</p>
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <button type="button" className="close-button" onClick={() => setModalOpen(false)}>
              <X size={18} />
            </button>
            <div className="modal-kicker">
              <Plus size={15} /> ADMIN ACTION
            </div>
            <h2>Create New {tab === 'Workout zones' ? 'Zone' : tab === 'Rewards' ? 'Reward' : 'Mission'}</h2>
            <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                Item Title / Goal Name
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 10,000 Daily Steps Goal"
                  required
                  style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                Zone Location / Category
                <input
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="e.g. Central Park"
                  style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                MOVE Reward Points
                <input
                  type="number"
                  value={newMove}
                  onChange={(e) => setNewMove(e.target.value)}
                  style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </label>
              <button type="submit" className="primary-button full" style={{ marginTop: '0.5rem' }}>
                Publish Goal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  const [mode, setMode] = useState<'student' | 'admin'>('student')
  return mode === 'student' ? <StudentView onAdmin={() => setMode('admin')} /> : <AdminView onStudent={() => setMode('student')} />
}
