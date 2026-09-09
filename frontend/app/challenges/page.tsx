'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  Footprints,
  LoaderCircle,
  MapPin,
  Pause,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { ApiUser, clearToken, getStoredToken, movegridApi } from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'
import { useStepCounter } from '../../hooks/useStepCounter'

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

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 1,
    title: '10,000 Daily Steps Goal',
    zone: 'Downtown Loop',
    distance: '4.8 mi',
    minutes: 45,
    move: 150,
    kind: 'Walk',
    color: 'mint',
    description: 'Hit 10,000 steps today to keep your daily movement streak alive.',
  },
  {
    id: 2,
    title: 'Hydration Hero: Drink 2L Water',
    zone: 'Hydration Goal',
    distance: '0.0 mi',
    minutes: 5,
    move: 100,
    kind: 'Hydration',
    color: 'blue',
    description: 'Track and drink 2 Liters of fresh water throughout the day for optimal energy.',
  },
  {
    id: 3,
    title: 'City Park 5K Trail Run',
    zone: 'Central Park',
    distance: '3.1 mi',
    minutes: 28,
    move: 200,
    kind: 'Run',
    color: 'orange',
    description: 'Sprint or jog through the main park trail circuit.',
  },
  {
    id: 4,
    title: 'Morning 15-Min Mobility Stretch',
    zone: 'Home / Park',
    distance: '0.1 mi',
    minutes: 15,
    move: 80,
    kind: 'Walk',
    color: 'purple',
    description: 'Gentle full-body stretching session to improve posture and flexibility.',
  },
  {
    id: 5,
    title: 'Neighborhood Bike Circuit',
    zone: 'City East Bikeway',
    distance: '5.2 mi',
    minutes: 30,
    move: 160,
    kind: 'Bike',
    color: 'mint',
    description: 'Cycle through the bike path and log your cardiovascular movement.',
  },
]

function Pill({ children, tone = 'lime' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>
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


// ─── Circular step progress ring ─────────────────────────────────────────────

function StepRing({ percent, steps, goal }: { percent: number; steps: number; goal: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dash = (percent / 100) * circumference
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="136" height="136" viewBox="0 0 136 136" style={{ overflow: 'visible' }}>
        {/* track */}
        <circle
          cx="68" cy="68" r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"
        />
        {/* progress arc */}
        <circle
          cx="68" cy="68" r={radius}
          fill="none"
          stroke="#a3e635"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset="0"
          transform="rotate(-90 68 68)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        {/* centre label */}
        <text x="68" y="62" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700">
          {steps.toLocaleString()}
        </text>
        <text x="68" y="80" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11">
          steps
        </text>
      </svg>
      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>
        {goal.toLocaleString()} goal · {percent}% done
      </span>
    </div>
  )
}

// ─── Live step panel (shown at mission step 1 for Walk missions) ─────────────

function LiveStepPanel() {
  const { steps, goal, percent, active, startTracking } = useStepCounter()

  useEffect(() => {
    if (!active) {
      startTracking()
    }
  }, [active, startTracking])

  return (
    <div className="qr-panel" style={{ gap: '1rem' }}>
      <StepRing percent={percent} steps={steps} goal={goal} />

      <span className="challenge-status-chip active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Sparkles size={14} className="spin-slow" /> {active ? 'Tracking Live' : 'Challenge Active'}
      </span>

      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
        {active ? 'Step tracking active from phone sensors...' : 'Walk to complete your step goal'}
      </span>
    </div>
  )
}

// ─── Mission modal ────────────────────────────────────────────────────────────

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

  // For Walk missions, step 1 shows the live sensor panel.
  const isWalkMission = mission.kind === 'Walk' || mission.kind === 'Climb'

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
              <span>
                Target: {mission.distance} · {mission.minutes} min session
              </span>
            </div>
          </div>
        )}
        {step === 1 && (
          <>
            {isWalkMission ? (
              <LiveStepPanel />
            ) : mission.kind === 'Hydration' ? (
              <div className="qr-panel">
                <Droplets size={80} style={{ color: '#38bdf8' }} />
                <strong>Log your workout check-in</strong>
                <span>Logged 2L water consumed!</span>
              </div>
            ) : (
              <div className="qr-panel">
                <div className="qr-art">
                  <QrCode size={92} />
                  <div className="scan-line" />
                </div>
                <strong>Log your workout check-in</strong>
                <span>Scan or log GPS route confirmation.</span>
              </div>
            )}
          </>
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
        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', width: '100%' }}>
          {step > 0 && (
            <button
              type="button"
              className="outline-button"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            disabled={loading}
            onClick={() => {
              if (step === 0) {
                const token = getStoredToken()
                if (token) {
                  movegridApi.startMission(mission.id, 150, token).catch(() => {})
                }
              }
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
    </div>
  )
}


export default function ChallengesPage() {
  const [selected, setSelected] = useState<Mission | null>(null)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [apiMissions, setApiMissions] = useState<Mission[]>(DEFAULT_MISSIONS)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [complete, setComplete] = useState(false)
  const [lastMove, setLastMove] = useState(150)

  const token = getStoredToken()

  useEffect(() => {
    if (token) {
      movegridApi
        .me(token)
        .then(setUser)
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
              distance: `${(0.2 + ((m.id * 0.15) % 0.8)).toFixed(1)} mi`,
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
      setLastMove(selected.move)
      setSelected(null)
      setComplete(true)
      setTimeout(() => setComplete(false), 3500)
    } finally {
      setLoadingComplete(false)
    }
  }

  return (
    <div className="app-shell">
      <AppChrome
        rightSlot={
          <Link href="/" className="outline-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={15} /> Back
          </Link>
        }
      />

      <main className="main-content">
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow">CHALLENGES</p>
            <h1>
              Pick your challenge{user ? `, ${user.name.split(' ')[0]}` : ''}.
            </h1>
            <p className="subhead">Daily missions and health goals — finish them to stack MOVE.</p>
          </div>
        </div>

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
            <p>
              {apiMissions[0]?.description ||
                'Complete 10,000 steps today to boost cardiovascular energy and stack your streak.'}
            </p>
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
            <p className="eyebrow">ALL CHALLENGES</p>
            <h2>Choose a goal</h2>
          </div>
        </div>

        <div className="mission-list">
          {apiMissions.map((m) => (
            <MissionCard mission={m} onStart={start} key={m.id} />
          ))}
        </div>
      </main>

      {complete && (
        <div className="toast">
          <div>
            <Check size={18} />
          </div>
          <span>
            <strong>Goal complete!</strong>
            <small>+{lastMove} MOVE added to your account</small>
          </span>
        </div>
      )}

      {selected && (
        <MissionModal mission={selected} onClose={() => setSelected(null)} onComplete={finish} loading={loadingComplete} />
      )}
    </div>
  )
}
