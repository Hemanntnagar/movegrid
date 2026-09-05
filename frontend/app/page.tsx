'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowRight, BarChart3, Bell, Bike, Bolt, Check, ChevronRight, CircleHelp, Compass,
  Crown, Flame, Footprints, Gift, Grid3X3, LayoutDashboard, LoaderCircle, LogIn, LogOut, MapPin, MapPinned, Menu, Plus, Play, QrCode,
  ScanLine, Search, ShieldCheck, Sparkles, Star, Target, Trash2, Trophy, Users, X, Zap
} from 'lucide-react'
import {
  ApiMission, ApiLeaderboardEntry, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { NearbyLiveMap } from '../components/NearbyLiveMap'

type UIKind = 'Walk' | 'Climb' | 'Run' | 'Bike' | string

type Mission = {
  id: number
  title: string
  zone: string
  distance: string
  minutes: number
  move: number
  kind: UIKind
  color: string
  description: string
}

const DEFAULT_MISSIONS: Mission[] = [
  { id: 1, title: 'Library Loop', zone: 'North Quad', distance: '0.2 mi', minutes: 12, move: 120, kind: 'Walk', color: 'mint', description: 'A brisk loop around the library and fountain.' },
  { id: 2, title: 'Stadium Stairs', zone: 'Athletics District', distance: '0.6 mi', minutes: 18, move: 180, kind: 'Climb', color: 'orange', description: 'Take the long way up the stadium steps.' },
  { id: 3, title: 'Quad Dash', zone: 'Central Quad', distance: '0.4 mi', minutes: 15, move: 150, kind: 'Run', color: 'blue', description: 'Sprint between the campus landmarks.' },
  { id: 4, title: 'Arts Center Circuit', zone: 'Arts District', distance: '0.5 mi', minutes: 14, move: 140, kind: 'Walk', color: 'purple', description: 'Explore the outdoor sculpture garden.' },
]

const DEFAULT_LEADERBOARD = [
  ['Maya Chen', '2,840', 'MC', true],
  ['Jordan Lee', '2,690', 'JL', false],
  ['Alex Morgan (You)', '2,480', 'AM', false],
  ['Sam Rivera', '2,210', 'SR', false]
]

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

function ClockIcon() {
  return <span className="clock-icon">◷</span>
}

function MissionCard({ mission, onStart }: { mission: Mission; onStart: (m: Mission) => void }) {
  return (
    <article className={`mission-card ${mission.color}`}>
      <div className="mission-top">
        <Pill tone={mission.color}>{mission.kind}</Pill>
        <span className="move-value">
          <Zap size={14} fill="currentColor" /> +{mission.move}
        </span>
      </div>
      <h3>{mission.title}</h3>
      <p>{mission.description}</p>
      <div className="mission-meta">
        <span>
          <MapPin size={14} /> {mission.zone}
        </span>
        <span>
          <Activity size={14} /> {mission.minutes} min
        </span>
        <span>
          <Footprints size={14} /> {mission.distance}
        </span>
      </div>
      <button type="button" className="primary-button" onClick={() => onStart(mission)}>
        <Play size={15} fill="currentColor" /> Start mission
      </button>
    </article>
  )
}

function MissionModal({
  mission,
  onClose,
  onComplete,
  loading,
}: {
  mission: Mission
  onClose: () => void
  onComplete: () => void
  loading: boolean
}) {
  const [step, setStep] = useState(0)
  const steps = ['Start mission', 'Reach zone', 'Verify QR', 'Complete']

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button type="button" className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <Target size={15} /> MISSION BRIEF
        </div>
        <h2>{mission.title}</h2>
        <p>
          {mission.description} Make your way to {mission.zone} and check in at the mission marker.
        </p>
        <div className="stepper">
          {steps.map((s, i) => (
            <div className={`step ${i <= step ? 'active' : ''}`} key={s}>
              <span>{i < step ? <Check size={13} /> : i + 1}</span>
              <small>{s}</small>
            </div>
          ))}
        </div>
        {step === 0 && (
          <div className="modal-panel">
            <MapPin size={22} />
            <div>
              <strong>Head to {mission.zone}</strong>
              <span>{mission.distance} away · GPS zone active</span>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="qr-panel">
            <div className="qr-art">
              <QrCode size={92} />
              <div className="scan-line" />
            </div>
            <strong>Scan the demo checkpoint</strong>
            <span>In a real mission, this QR lives at the zone marker.</span>
          </div>
        )}
        {step === 2 && (
          <div className="verified">
            <div className="verified-icon">
              <ShieldCheck size={30} />
            </div>
            <strong>Checkpoint verified</strong>
            <span>Zone confirmed. Finish the challenge to earn your MOVE points.</span>
          </div>
        )}
        {step === 3 && (
          <div className="verified success">
            <div className="verified-icon">
              <Sparkles size={30} />
            </div>
            <strong>Mission complete!</strong>
            <span>
              +{mission.move} MOVE · +{mission.minutes} active minutes
            </span>
          </div>
        )}
        <button
          type="button"
          className="primary-button full"
          disabled={loading}
          onClick={() => {
            if (step < 3) {
              setStep(step + 1)
            } else {
              onComplete()
            }
          }}
        >
          {loading ? (
            <LoaderCircle size={16} className="spin" />
          ) : step === 0 ? (
            'I’m on my way'
          ) : step === 1 ? (
            'Verify demo QR'
          ) : step === 2 ? (
            'Complete challenge'
          ) : (
            'Claim MOVE points'
          )}{' '}
          {!loading && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  )
}

function SquadModal({ onClose }: { onClose: () => void }) {
  const [joined, setJoined] = useState(false)
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button type="button" className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <Users size={15} /> SQUAD HEADQUARTERS
        </div>
        <h2>Late Night Legends</h2>
        <p>Central Quad campus mover squad. Join to stack team points on the monthly leaderboard.</p>
        <div className="modal-panel" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Squad Rank</strong>
              <small>#3 Campus squad</small>
            </div>
            <Pill tone="orange">4,280 MOVE</Pill>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['Alex M.', 'Jordan L.', 'Sam R.', 'Maya C.', 'Taylor K.', 'Devon S.'].map((m) => (
              <span key={m} className="pill lime">
                {m}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`primary-button full ${joined ? 'secondary' : ''}`}
          onClick={() => setJoined(!joined)}
        >
          {joined ? <Check size={16} /> : <Users size={16} />}
          {joined ? 'You are in this Squad' : 'Join Squad'}
        </button>
      </div>
    </div>
  )
}

function StudentView({ onAdmin }: { onAdmin: () => void }) {
  const [activeTab, setActiveTab] = useState('Home')
  const [selected, setSelected] = useState<Mission | null>(null)
  const [move, setMove] = useState(2480)
  const [complete, setComplete] = useState(false)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [apiMissions, setApiMissions] = useState<Mission[]>(DEFAULT_MISSIONS)
  const [squadOpen, setSquadOpen] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)

  const token = getStoredToken()

  useEffect(() => {
    if (token) {
      movegridApi
        .me(token)
        .then((u) => {
          setUser(u)
          if (u.total_points) setMove(u.total_points)
        })
        .catch(() => clearToken())
    }

    movegridApi
      .missions()
      .then((items) => {
        if (items && items.length > 0) {
          setApiMissions(
            items.map((m, idx) => ({
              id: m.id,
              title: m.title,
              zone: m.zone,
              distance: `${(0.2 + (m.id * 0.15) % 0.8).toFixed(1)} mi`,
              minutes: m.minutes || 15,
              move: m.move_reward || 100,
              kind: m.kind || (idx % 3 === 0 ? 'Walk' : idx % 3 === 1 ? 'Climb' : 'Run'),
              color: idx % 3 === 0 ? 'mint' : idx % 3 === 1 ? 'orange' : 'blue',
              description: m.description,
            }))
          )
        }
      })
      .catch(() => {})
  }, [token])

  const start = (m: Mission) => setSelected(m)

  const finish = async () => {
    if (!selected) return
    setLoadingComplete(true)
    try {
      if (token) {
        await movegridApi.completeMission(selected.id, 'movegrid-demo').catch(() => {})
      }
      setMove((v) => v + selected.move)
      setSelected(null)
      setComplete(true)
      setTimeout(() => setComplete(false), 3500)
    } finally {
      setLoadingComplete(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav">
          {['Home', 'Missions', 'Fitness', 'Map', 'Leaderboard', 'Squads', 'Rewards'].map((t) =>
            t === 'Fitness' ? (
              <Link className={activeTab === t ? 'nav-active' : ''} href="/fitness" key={t}>
                {t}
              </Link>
            ) : t === 'Map' ? (
              <Link className={activeTab === t ? 'nav-active' : ''} href="/map" key={t}>
                {t}
              </Link>
            ) : t === 'Leaderboard' ? (
              <Link className={activeTab === t ? 'nav-active' : ''} href="/leaderboard" key={t}>
                {t}
              </Link>
            ) : t === 'Rewards' ? (
              <Link className={activeTab === t ? 'nav-active' : ''} href="/rewards" key={t}>
                {t}
              </Link>
            ) : t === 'Squads' ? (
              <button key={t} type="button" className={activeTab === t ? 'nav-active' : ''} onClick={() => setSquadOpen(true)}>
                {t}
              </button>
            ) : (
              <button key={t} type="button" className={activeTab === t ? 'nav-active' : ''} onClick={() => setActiveTab(t)}>
                {t}
              </button>
            )
          )}
        </nav>
        <div className="top-actions">
          <button type="button" className="icon-button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          {user ? (
            <div className="avatar" title={user.name}>
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <Link href="/login" className="outline-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogIn size={15} /> Sign in
            </Link>
          )}
          <button type="button" className="admin-switch" onClick={onAdmin}>
            Admin view <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="welcome">
          <div>
            <p className="eyebrow">CAMPUS LIVE MOVEMENT</p>
            <h1>
              Keep the grid moving, <span>{user ? user.name.split(' ')[0] : 'Alex'}.</span>
            </h1>
            <p className="subhead">You&apos;re on a roll. Fresh missions and checkpoints are active nearby.</p>
          </div>
          <div className="streak-badge">
            <Flame size={20} fill="currentColor" />
            <div>
              <strong>{user?.streak ?? 7} day streak</strong>
              <span>Best: 14 days</span>
            </div>
          </div>
        </div>

        <section className="stats-grid">
          <StatCard icon={<Zap size={19} />} label="MOVE points" value={move.toLocaleString()} detail="+120 today" tone="lime" />
          <StatCard icon={<Flame size={19} />} label="Current streak" value={`${user?.streak ?? 7} days`} detail="2 days to badge" tone="orange" />
          <StatCard icon={<Activity size={19} />} label="Active minutes" value="86" detail="of 150 weekly" tone="blue" />
          <StatCard icon={<Trophy size={19} />} label="Campus rank" value="#24" detail="↑ 6 places" tone="purple" />
        </section>

        <div className="dashboard-grid">
          <div className="content-col">
            <div className="section-heading">
              <div>
                <p className="eyebrow">RECOMMENDED FOR YOU</p>
                <h2>Make your next move</h2>
              </div>
              <button type="button" className="text-button" onClick={() => start(apiMissions[0])}>
                View details <ArrowRight size={14} />
              </button>
            </div>

            <div className="recommendation">
              <div className="rec-copy">
                <Pill tone="lime">
                  <Sparkles size={12} /> Perfect match
                </Pill>
                <h2>{apiMissions[0]?.title || 'Library Loop'}</h2>
                <p>{apiMissions[0]?.description || 'A quick reset between classes. Walk the north quad, hit checkpoints, and stack your streak.'}</p>
                <div className="rec-meta">
                  <span>
                    <ClockIcon /> {apiMissions[0]?.minutes || 12} min
                  </span>
                  <span>
                    <Zap size={14} /> +{apiMissions[0]?.move || 120} MOVE
                  </span>
                  <span>
                    <MapPin size={14} /> {apiMissions[0]?.distance || '0.2 mi'}
                  </span>
                </div>
                <button type="button" className="primary-button" onClick={() => start(apiMissions[0])}>
                  Start mission <ArrowRight size={16} />
                </button>
              </div>
              <div className="rec-visual">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="rec-icon">
                  <Footprints size={38} />
                </div>
                <span>01</span>
              </div>
            </div>

            <div className="section-heading compact">
              <div>
                <p className="eyebrow">NEARBY NOW</p>
                <h2>Pick a mission</h2>
              </div>
              <button type="button" className="filter-button">
                <Compass size={15} /> Nearby <ChevronRight size={14} />
              </button>
            </div>

            <div className="mission-list">
              {apiMissions.slice(1).map((m) => (
                <MissionCard mission={m} onStart={start} key={m.id} />
              ))}
            </div>

            <div className="section-heading compact">
              <div>
                <p className="eyebrow">YOUR PROGRESS</p>
                <h2>Keep showing up</h2>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-ring">
                <strong>57%</strong>
                <span>weekly goal</span>
              </div>
              <div>
                <h3>150 active minutes</h3>
                <p>You&apos;re 86 minutes in. Two more missions gets you to your target.</p>
                <div className="progress-bar">
                  <span style={{ width: '57%' }} />
                </div>
              </div>
              <button type="button" className="circle-button" onClick={() => start(apiMissions[0])}>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <aside className="side-col">
            <NearbyLiveMap token={token} />

            <div className="side-card leaderboard-card">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">CAMPUS LEADERBOARD</p>
                  <h2>Top movers</h2>
                </div>
                <Trophy size={20} className="gold-icon" />
              </div>
              <div className="leaderboard-list">
                {DEFAULT_LEADERBOARD.map((row, i) => (
                  <div className={`leader-row ${row[3] ? 'highlight' : ''}`} key={row[0] as string}>
                    <b>{i + 1}</b>
                    <div className="mini-avatar">{row[2] as string}</div>
                    <span>
                      {row[0] as string}
                      {row[3] && <Pill tone="blue">you</Pill>}
                    </span>
                    <strong>{row[1] as string}</strong>
                  </div>
                ))}
              </div>
              <Link className="outline-button full" href="/leaderboard">
                See full leaderboard <ArrowRight size={15} />
              </Link>
            </div>

            <div className="side-card squad-card">
              <div className="squad-avatars">
                <div>JD</div>
                <div>SR</div>
                <div>+4</div>
              </div>
              <p className="eyebrow">ACTIVE SQUAD</p>
              <h3>Late Night Legends</h3>
              <p>6 movers · 4,280 MOVE this week</p>
              <button type="button" className="outline-button" onClick={() => setSquadOpen(true)}>
                Open squad <ArrowRight size={15} />
              </button>
            </div>
          </aside>
        </div>
      </main>

      {complete && (
        <div className="toast">
          <div>
            <Check size={18} />
          </div>
          <span>
            <strong>Mission complete!</strong>
            <small>+{selected?.move ?? 120} MOVE added to your account</small>
          </span>
        </div>
      )}

      {selected && (
        <MissionModal mission={selected} onClose={() => setSelected(null)} onComplete={finish} loading={loadingComplete} />
      )}

      {squadOpen && <SquadModal onClose={() => setSquadOpen(false)} />}

      <footer className="mobile-nav">
        {[
          ['Home', LayoutDashboard, '/'],
          ['Map', MapPinned, '/map'],
          ['Fitness', Activity, '/fitness'],
          ['Rewards', Gift, '/rewards'],
        ].map(([label, Icon, path]: any) => (
          <Link className={activeTab === label ? 'active' : ''} href={path} key={label}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </footer>

      <div className="demo-note">
        DEMO PROTOTYPE · <button type="button" onClick={onAdmin}>Switch to admin</button>
      </div>
    </div>
  )
}

function AdminView({ onStudent }: { onStudent: () => void }) {
  const [tab, setTab] = useState('Overview')
  const [modalOpen, setModalOpen] = useState(false)

  // Dynamic state for Admin CRUD
  const [challenges, setChallenges] = useState([
    { id: 1, title: 'Library Loop', zone: 'North Quad', move: 120, minutes: 12, completions: 482, status: 'Live' },
    { id: 2, title: 'Stadium Stairs', zone: 'Athletics District', move: 180, minutes: 18, completions: 318, status: 'Live' },
    { id: 3, title: 'Quad Dash', zone: 'Central Quad', move: 150, minutes: 15, completions: 264, status: 'Live' },
  ])

  const [zones, setZones] = useState([
    { id: 1, name: 'Central Quad', code: 'CQ-01', activeMissions: 4, qr: 'cq-qr-token-01' },
    { id: 2, name: 'North Quad', code: 'NQ-02', activeMissions: 3, qr: 'nq-qr-token-02' },
    { id: 3, name: 'Athletics District', code: 'AD-03', activeMissions: 5, qr: 'ad-qr-token-03' },
  ])

  const [rewards, setRewards] = useState([
    { id: 1, title: 'Campus Canteen 20% Off', category: 'Food & Dining', points: 300, stock: 45 },
    { id: 2, title: 'Campus Gym Day Pass', category: 'Sports', points: 500, stock: 20 },
    { id: 3, title: 'MOVEGRID Hoodie', category: 'Merchandise', points: 1500, stock: 10 },
  ])

  // Form State
  const [newTitle, setNewTitle] = useState('')
  const [newZone, setNewZone] = useState('')
  const [newMove, setNewMove] = useState('150')

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return
    const created = {
      id: Date.now(),
      title: newTitle,
      zone: newZone || 'Central Quad',
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
        <div className="admin-label">WORKSPACE</div>
        {[
          ['Overview', LayoutDashboard],
          ['Challenges', Target],
          ['Campus zones', MapPin],
          ['Rewards', Gift],
          ['Students', Users],
          ['Analytics', BarChart3],
        ].map(([n, I]: any) => (
          <button type="button" className={tab === n ? 'selected' : ''} onClick={() => setTab(n)} key={n}>
            <I size={17} />
            {n}
            {n === 'Challenges' && <span className="sidebar-count">{challenges.length}</span>}
          </button>
        ))}
        <div className="sidebar-spacer" />
        <button type="button">
          <CircleHelp size={17} />
          Help center
        </button>
        <div className="admin-user">
          <div className="avatar">AD</div>
          <div>
            <strong>Admin Demo</strong>
            <span>Campus ops</span>
          </div>
          <ChevronRight size={15} />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">CAMPUS OPERATIONS / {tab.toUpperCase()}</p>
            <h1>Good morning, Admin.</h1>
            <p className="subhead">Manage campus challenges, active movement zones, and student rewards.</p>
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
              Student view <ArrowRight size={14} />
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
                  38,492 <small>MOVE</small>
                </div>
                <span className="positive">
                  <ArrowRight size={13} /> 18.6% vs last week
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
              <StatCard icon={<Users size={18} />} label="Total students" value="4,286" detail="↑ 8.2% this month" tone="blue" />
              <StatCard icon={<Activity size={18} />} label="Active students" value="1,842" detail="43% of total" tone="lime" />
              <StatCard icon={<Target size={18} />} label="Missions completed" value="12,648" detail="↑ 24.5% this week" tone="orange" />
              <StatCard icon={<BarChart3 size={18} />} label="Participation rate" value="68.4%" detail="↑ 4.1% vs last week" tone="purple" />
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
                <span>CHALLENGE</span>
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
          ) : tab === 'Campus zones' ? (
            <div className="challenge-table">
              <div className="table-head">
                <span>ZONE NAME</span>
                <span>ZONE CODE</span>
                <span>ACTIVE MISSIONS</span>
                <span>QR CHECKPOINT</span>
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
                  <span>{z.activeMissions} missions</span>
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
              <p>Active live management module ready for operations.</p>
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
            <h2>Create New {tab === 'Campus zones' ? 'Zone' : tab === 'Rewards' ? 'Reward' : 'Challenge'}</h2>
            <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                Item Title / Name
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Science Library Sprint"
                  required
                  style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                Zone Location
                <input
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="e.g. North Quad"
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
                Publish to Campus Grid
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
