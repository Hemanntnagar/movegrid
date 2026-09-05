'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowRight, BarChart3, Bell, Bike, Bolt, Check, ChevronRight, CircleHelp, Compass,
  Crown, Droplets, Flame, Footprints, Gift, Grid3X3, HeartHandshake, LayoutDashboard, LoaderCircle, LogIn, LogOut, MapPin, MapPinned, Menu, Plus, Play, QrCode,
  ScanLine, Search, ShieldCheck, Sparkles, Star, Target, Trash2, Trophy, UserPlus, Users, X, Zap
} from 'lucide-react'
import {
  ApiMission, ApiLeaderboardEntry, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { NearbyLiveMap } from '../components/NearbyLiveMap'

type UIKind = 'Walk' | 'Climb' | 'Run' | 'Bike' | 'Hydration' | string

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

type Buddy = {
  id: number
  name: string
  distance: string
  activity: string
  level: string
  status: string
  avatar: string
  color: string
}

const DEFAULT_MISSIONS: Mission[] = [
  { id: 1, title: '10,000 Daily Steps Goal', zone: 'Downtown Loop', distance: '4.8 mi', minutes: 45, move: 150, kind: 'Walk', color: 'mint', description: 'Hit 10,000 steps today to keep your daily movement streak alive.' },
  { id: 2, title: 'Hydration Hero: Drink 2L Water', zone: 'Hydration Goal', distance: '0.0 mi', minutes: 5, move: 100, kind: 'Hydration', color: 'blue', description: 'Track and drink 2 Liters of fresh water throughout the day for optimal energy.' },
  { id: 3, title: 'City Park 5K Trail Run', zone: 'Central Park', distance: '3.1 mi', minutes: 28, move: 200, kind: 'Run', color: 'orange', description: 'Sprint or jog through the main park trail circuit.' },
  { id: 4, title: 'Morning 15-Min Mobility Stretch', zone: 'Home / Park', distance: '0.1 mi', minutes: 15, move: 80, kind: 'Walk', color: 'purple', description: 'Gentle full-body stretching session to improve posture and flexibility.' },
  { id: 5, title: 'Neighborhood Bike Circuit', zone: 'City East Bikeway', distance: '5.2 mi', minutes: 30, move: 160, kind: 'Bike', color: 'mint', description: 'Cycle through the bike path and log your cardiovascular movement.' },
]

const NEARBY_BUDDIES: Buddy[] = [
  { id: 101, name: 'Maya Chen', distance: '0.2 mi away', activity: '5K Trail Run', level: 'Advanced', status: 'Active now', avatar: 'MC', color: '#ffd447' },
  { id: 102, name: 'Jordan Lee', distance: '0.4 mi away', activity: '10k Steps Walk', level: 'Intermediate', status: 'Walking nearby', avatar: 'JL', color: '#8bd4f4' },
  { id: 103, name: 'Sam Rivera', distance: '0.6 mi away', activity: 'Morning Stretch', level: 'Beginner', status: 'Ready for workout', avatar: 'SR', color: '#ff9a61' },
  { id: 104, name: 'Priya Nair', distance: '0.8 mi away', activity: 'Bike Circuit', level: 'Advanced', status: 'On bike trail', avatar: 'PN', color: '#b7e88f' },
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

function PenguinMascot({ message = "Waddle & move! You've got this!" }: { message?: string }) {
  return (
    <div className="penguin-mascot-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.6rem 0.9rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg className="penguin-svg" width="38" height="42" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Penguin Body */}
        <ellipse cx="50" cy="65" rx="35" ry="40" fill="#0f172a" />
        <ellipse cx="50" cy="68" rx="24" ry="32" fill="#ffffff" />
        {/* Penguin Head */}
        <circle cx="50" cy="32" r="24" fill="#0f172a" />
        {/* Eyes */}
        <circle cx="42" cy="28" r="4" fill="#ffffff" />
        <circle cx="43" cy="28" r="2" fill="#000000" />
        <circle cx="58" cy="28" r="4" fill="#ffffff" />
        <circle cx="57" cy="28" r="2" fill="#000000" />
        {/* Beak */}
        <polygon points="50,32 44,38 56,38" fill="#f97316" />
        {/* Cheeks */}
        <circle cx="36" cy="34" r="3" fill="#f43f5e" opacity="0.6" />
        <circle cx="64" cy="34" r="3" fill="#f43f5e" opacity="0.6" />
        {/* Scarf */}
        <rect x="30" y="48" width="40" height="8" rx="4" fill="#38bdf8" />
        <rect x="58" y="52" width="10" height="20" rx="3" fill="#0284c7" />
        {/* Flippers */}
        <ellipse cx="14" cy="65" rx="7" ry="18" fill="#0f172a" transform="rotate(20 14 65)" />
        <ellipse cx="86" cy="65" rx="7" ry="18" fill="#0f172a" transform="rotate(-20 86 65)" />
        {/* Feet */}
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

function AreaMap({ missions, onSelect }: { missions: Mission[]; onSelect: (m: Mission) => void }) {
  const [filter, setFilter] = useState<'All' | 'Walk' | 'Run' | 'Hydration' | 'Bike'>('All')
  const filteredMissions = useMemo(() => {
    if (filter === 'All') return missions
    return missions.filter((m) => m.kind.toLowerCase() === filter.toLowerCase())
  }, [missions, filter])

  const mapCoordinates = [
    [175, 142],
    [510, 178],
    [340, 145],
    [230, 240],
    [420, 260],
  ]

  return (
    <div className="map-wrap">
      <div className="map-label">
        CITY WORKOUT MAP{' '}
        <span>
          <span className="live-dot" /> {filteredMissions.length} active routes nearby
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {(['All', 'Walk', 'Run', 'Hydration', 'Bike'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`pill ${filter === k ? 'lime' : 'neutral'}`}
            style={{ border: 'none', cursor: 'pointer', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            onClick={() => setFilter(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <svg className="campus-map" viewBox="0 0 760 360" role="img" aria-label="Illustrated city map with workout locations">
        <path className="road" d="M0 85 C150 40 200 130 330 84 S570 50 760 110 M0 285 C160 240 230 320 390 270 S620 230 760 300 M120 0 C150 90 105 180 160 360 M570 0 C520 100 600 210 550 360" />
        <path className="river" d="M660 0 C580 70 690 150 610 220 C550 274 650 320 610 380 L760 380 L760 0Z" />
        <g className="buildings">
          <rect x="70" y="58" width="92" height="55" rx="5" />
          <rect x="210" y="35" width="110" height="62" rx="5" />
          <rect x="360" y="62" width="100" height="54" rx="5" />
          <rect x="195" y="190" width="120" height="60" rx="5" />
          <rect x="365" y="210" width="95" height="58" rx="5" />
          <rect x="500" y="110" width="90" height="58" rx="5" />
        </g>
        <g className="labels">
          <text x="86" y="90">CENTRAL PARK</text>
          <text x="238" y="72">DOWNTOWN</text>
          <text x="383" y="94">CITY SQUARE</text>
          <text x="220" y="226">RIVERSIDE</text>
          <text x="385" y="245">FITNESS CLUB</text>
          <text x="514" y="144">BIKE HUB</text>
        </g>
        {filteredMissions.map((m, i) => {
          const coords = mapCoordinates[i % mapCoordinates.length]
          return (
            <g
              key={m.id}
              className="map-pin"
              onClick={() => onSelect(m)}
              transform={`translate(${coords[0]},${coords[1]})`}
              style={{ cursor: 'pointer' }}
            >
              <circle r="18" className="pin-pulse" />
              <circle r="18" />
              <circle r="6" />
              <text y="-28" textAnchor="middle">
                +{m.move} MOVE
              </text>
            </g>
          )
        })}
        <g className="you-pin" transform="translate(300,280)">
          <circle r="15" />
          <circle r="5" />
        </g>
        <text className="you-label" x="300" y="315">
          YOU ARE HERE
        </text>
      </svg>
      <div className="map-footer">
        <span>
          <MapPin size={14} /> Live GPS Workout Grid
        </span>
        <button type="button" className="text-button" onClick={() => filteredMissions[0] && onSelect(filteredMissions[0])}>
          Select route <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function MissionCard({ mission, onStart }: { mission: Mission; onStart: (m: Mission) => void }) {
  return (
    <article className={`mission-card ${mission.color}`}>
      <div className="mission-top">
        <Pill tone={mission.color}>{mission.kind}</Pill>
        <span className="move-value">
          <Zap size={14} fill="currentColor" /> +{mission.move} MOVE
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
  const steps = ['Start activity', 'Perform task', 'Verify goal', 'Claim MOVE']

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
          {mission.description} Complete the target at {mission.zone} to log your health points.
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
              <strong>Location: {mission.zone}</strong>
              <span>Target: {mission.distance} · {mission.minutes} min session</span>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="qr-panel">
            {mission.kind === 'Hydration' ? (
              <Droplets size={80} style={{ color: '#38bdf8' }} />
            ) : (
              <div className="qr-art">
                <QrCode size={92} />
                <div className="scan-line" />
              </div>
            )}
            <strong>Log your workout check-in</strong>
            <span>{mission.kind === 'Hydration' ? 'Logged 2L water consumed!' : 'Scan or log GPS route confirmation.'}</span>
          </div>
        )}
        {step === 2 && (
          <div className="verified">
            <div className="verified-icon">
              <ShieldCheck size={30} />
            </div>
            <strong>Activity Goal Verified</strong>
            <span>Great work! Complete now to claim your MOVE rewards.</span>
          </div>
        )}
        {step === 3 && (
          <div className="verified success">
            <div className="verified-icon">
              <Sparkles size={30} />
            </div>
            <strong>Goal Completed!</strong>
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
            'Start goal'
          ) : step === 1 ? (
            'Verify activity'
          ) : step === 2 ? (
            'Log progress'
          ) : (
            'Claim MOVE points'
          )}{' '}
          {!loading && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  )
}

function WorkoutBuddiesModal({
  onClose,
  onInvite,
}: {
  onClose: () => void
  onInvite: (buddy: Buddy) => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '540px' }}>
        <button type="button" className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <Users size={15} /> WORKOUT BUDDY FINDER
        </div>
        <h2>Nearby Fitness Buddies</h2>
        <p>Connect with movers in your area for 10k step walks, 5K runs, or gym workouts.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
          {NEARBY_BUDDIES.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.05)',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: b.color,
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                  }}
                >
                  {b.avatar}
                </div>
                <div>
                  <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{b.name}</strong>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    {b.distance} · {b.activity}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="outline-button"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => onInvite(b)}
              >
                <UserPlus size={14} /> Invite
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="outline-button full" onClick={onClose}>
          Close Buddy Finder
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
  const [buddyModalOpen, setBuddyModalOpen] = useState(false)
  const [inviteToast, setInviteToast] = useState('')
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
              title: m.title.includes('Loop') ? '10,000 Daily Steps Goal' : m.title,
              zone: m.zone,
              distance: `${(0.2 + (m.id * 0.15) % 0.8).toFixed(1)} mi`,
              minutes: m.minutes || 15,
              move: m.move_reward || 100,
              kind: m.kind || (idx % 3 === 0 ? 'Walk' : idx % 3 === 1 ? 'Run' : 'Bike'),
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

  const handleInviteBuddy = (buddy: Buddy) => {
    setInviteToast(`Workout invitation sent to ${buddy.name}!`)
    setBuddyModalOpen(false)
    setTimeout(() => setInviteToast(''), 3500)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav">
          {['Home', 'Missions', 'Fitness', 'Map', 'Leaderboard', 'Workout Buddies', 'Rewards'].map((t) =>
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
            ) : t === 'Workout Buddies' ? (
              <button key={t} type="button" className={activeTab === t ? 'nav-active' : ''} onClick={() => setBuddyModalOpen(true)}>
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
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow">EVERYDAY MOVEMENT & WORKOUT COMMUNITY</p>
            <h1>
              Keep moving, <span>{user ? user.name.split(' ')[0] : 'Alex'}.</span>
            </h1>
            <p className="subhead">Hit your 10k steps, drink 2L water, and train with nearby workout buddies.</p>
          </div>
          <PenguinMascot message="Remember to hit your 10k steps & drink 2L water today!" />
        </div>

        <section className="stats-grid">
          <StatCard icon={<Zap size={19} />} label="MOVE points" value={move.toLocaleString()} detail="+150 today" tone="lime" />
          <StatCard icon={<Flame size={19} />} label="Current streak" value={`${user?.streak ?? 7} days`} detail="2 days to badge" tone="orange" />
          <StatCard icon={<Activity size={19} />} label="Active minutes" value="86" detail="of 150 weekly" tone="blue" />
          <StatCard icon={<Trophy size={19} />} label="Global rank" value="#24" detail="↑ 6 places" tone="purple" />
        </section>

        <div className="dashboard-grid">
          <div className="content-col">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DAILY HIGHLIGHT</p>
                <h2>Featured Health Goal</h2>
              </div>
              <button type="button" className="text-button" onClick={() => start(apiMissions[0])}>
                View details <ArrowRight size={14} />
              </button>
            </div>

            <div className="recommendation">
              <div className="rec-copy">
                <Pill tone="lime">
                  <Sparkles size={12} /> Daily Must-Do
                </Pill>
                <h2>{apiMissions[0]?.title || '10,000 Daily Steps Goal'}</h2>
                <p>{apiMissions[0]?.description || 'Complete 10,000 steps today to boost cardiovascular energy and stack your streak.'}</p>
                <div className="rec-meta">
                  <span>
                    <ClockIcon /> {apiMissions[0]?.minutes || 45} min
                  </span>
                  <span>
                    <Zap size={14} /> +{apiMissions[0]?.move || 150} MOVE
                  </span>
                  <span>
                    <MapPin size={14} /> {apiMissions[0]?.distance || '4.8 mi'}
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
                <p className="eyebrow">DAILY MISSIONS & HEALTH GOALS</p>
                <h2>Pick your challenge</h2>
              </div>
              <button type="button" className="filter-button" onClick={() => setBuddyModalOpen(true)}>
                <Users size={15} /> Find Buddies <ChevronRight size={14} />
              </button>
            </div>

            <div className="mission-list">
              {apiMissions.slice(1).map((m) => (
                <MissionCard mission={m} onStart={start} key={m.id} />
              ))}
            </div>

            <div className="section-heading compact">
              <div>
                <p className="eyebrow">PROGRESS TRACKER</p>
                <h2>Weekly Movement Goal</h2>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-ring">
                <strong>57%</strong>
                <span>weekly goal</span>
              </div>
              <div>
                <h3>150 active minutes</h3>
                <p>You&apos;re 86 minutes in. Two more workouts gets you to your target.</p>
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
            <AreaMap missions={apiMissions} onSelect={start} />

            <div className="side-card squad-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(15, 23, 42, 0.6))', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="eyebrow" style={{ color: '#38bdf8' }}>WORKOUT BUDDIES NEARBY</p>
                <Users size={18} style={{ color: '#38bdf8' }} />
              </div>
              <h3 style={{ marginTop: '0.4rem' }}>Find a Workout Buddy</h3>
              <p>4 movers within 1 mile ready for runs, 10k walks, or gym sessions.</p>
              <button type="button" className="outline-button full" style={{ marginTop: '0.75rem' }} onClick={() => setBuddyModalOpen(true)}>
                <UserPlus size={15} /> Open Buddy Finder <ArrowRight size={15} />
              </button>
            </div>

            <div className="side-card leaderboard-card">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">GLOBAL MOVERS</p>
                  <h2>Top Movers</h2>
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
                Full leaderboard <ArrowRight size={15} />
              </Link>
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
            <strong>Goal complete!</strong>
            <small>+{selected?.move ?? 150} MOVE added to your account</small>
          </span>
        </div>
      )}

      {inviteToast && (
        <div className="toast" style={{ background: '#0284c7', color: '#fff' }}>
          <div>
            <HeartHandshake size={18} />
          </div>
          <span>
            <strong>Workout Buddy Invited!</strong>
            <small>{inviteToast}</small>
          </span>
        </div>
      )}

      {selected && (
        <MissionModal mission={selected} onClose={() => setSelected(null)} onComplete={finish} loading={loadingComplete} />
      )}

      {buddyModalOpen && (
        <WorkoutBuddiesModal onClose={() => setBuddyModalOpen(false)} onInvite={handleInviteBuddy} />
      )}

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
