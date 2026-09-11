'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  Footprints,
  Gift,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { ApiUser, clearToken, getStoredToken, movegridApi, notifyUserUpdated } from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'
import { useStepCounter } from '../../hooks/useStepCounter'
import { apiMissionToUi, type UiMission } from '../../lib/missionUi'

type Mission = UiMission

function Pill({ children, tone = 'lime' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

function ClockIcon() {
  return <span className="clock-icon">◷</span>
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

// ─── 24-Hour Daily Gyro Challenge Widget ────────────────────────────────────

function DailyGyroChallengeWidget() {
  const { steps, goal, percent, active, startTracking, addSteps } = useStepCounter()
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const endOfDay = new Date()
      endOfDay.setHours(24, 0, 0, 0)
      const diff = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000))
      setSecondsRemaining(diff)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="challenges-daily-banner">
      <div className="daily-banner-header">
        <div className="daily-banner-badge">
          <ClockIcon /> 24-HOUR DAILY QUEST
        </div>
        <span className="daily-timer-chip">
          ⏱ Resets in {formatCountdown(secondsRemaining)}
        </span>
      </div>

      <div className="daily-banner-body">
        <div>
          <h2>10,000 Daily Steps Challenge</h2>
          <p className="daily-banner-sub">
            Powered by your phone&apos;s gyroscope & accelerometer motion sensors. Keep moving to complete the 24-hour goal!
          </p>
        </div>

        <div className="daily-banner-reward">
          <Zap size={16} fill="currentColor" /> +150 MOVE
        </div>
      </div>

      <div className="daily-banner-progress">
        <div className="progress-labels">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Footprints size={14} /> <strong>{steps.toLocaleString()}</strong> / {goal.toLocaleString()} steps ({percent}%)
          </span>
          <span className={`gyro-status-chip ${active ? 'active' : ''}`}>
            <Sparkles size={12} className={active ? 'spin-slow' : ''} />
            {active ? 'Gyro & Motion Sensors Active' : 'Gyro Sensors Ready'}
          </span>
        </div>
        <div className="progress-track-bar">
          <div className="progress-fill-bar" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="daily-banner-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => startTracking()}
        >
          <Play size={14} fill="currentColor" /> {active ? 'Sensors Tracking Live' : 'Start 24H Gyro Challenge'}
        </button>
        <button
          type="button"
          className="outline-button"
          onClick={() => addSteps(100)}
          title="Simulate step motion (useful for testing on desktop)"
        >
          +100 Steps (Test Motion)
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
        <Play size={15} fill="currentColor" /> Start challenge
      </button>
    </article>
  )
}

function StepRing({ percent, steps, goal }: { percent: number; steps: number; goal: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dash = (percent / 100) * circumference
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="136" height="136" viewBox="0 0 136 136" style={{ overflow: 'visible' }}>
        <circle cx="68" cy="68" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="68"
          cy="68"
          r={radius}
          fill="none"
          stroke="#a3e635"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset="0"
          transform="rotate(-90 68 68)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
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
  const steps = ['Start activity', 'Perform task', 'Confirm', 'Claim MOVE']
  const isWalkMission = mission.kind === 'Walk' || mission.kind === 'Climb'

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button type="button" className="close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <Target size={15} /> CHALLENGE BRIEF
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
                <strong>Hydration check-in</strong>
                <span>Log 2L water consumed when you&apos;re done.</span>
              </div>
            ) : (
              <div className="qr-panel">
                <Activity size={72} style={{ color: '#a3e635' }} />
                <strong>Activity in progress</strong>
                <span>
                  Complete your session at {mission.zone} — about {mission.minutes} min.
                </span>
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
              'Start challenge'
            ) : step === 1 ? (
              'Mark activity done'
            ) : step === 2 ? (
              'Continue'
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
  const pathname = usePathname()
  const [selected, setSelected] = useState<Mission | null>(null)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [apiMissions, setApiMissions] = useState<Mission[]>([])
  const [missionsLoading, setMissionsLoading] = useState(true)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [complete, setComplete] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
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
        setApiMissions(items.map((m, idx) => apiMissionToUi(m, idx)))
      })
      .catch(() => setApiMissions([]))
      .finally(() => setMissionsLoading(false))
  }, [token])

  const start = (m: Mission) => setSelected(m)

  const finish = async () => {
    if (!selected) return
    if (!token) {
      setCompleteError('Sign in to claim MOVE points on your account.')
      return
    }

    setLoadingComplete(true)
    setCompleteError(null)
    try {
      const result = await movegridApi.completeMission(token, selected.id)
      const awarded = result.move_awarded ?? selected.move
      setLastMove(awarded)
      notifyUserUpdated({ total_points: result.move_points })
      const fresh = await movegridApi.me(token)
      setUser(fresh)
      setSelected(null)
      setComplete(true)
      setTimeout(() => setComplete(false), 3500)
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not award MOVE points. Try again.')
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
            <h1>Pick your challenge{user ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
            <p className="subhead">Explore active fitness challenges and health goals — finish them to stack MOVE points.</p>
          </div>
        </div>

        {/* 24-Hour Daily Gyro Challenge Banner */}
        <DailyGyroChallengeWidget />

        <div className="section-heading compact">
          <div>
            <p className="eyebrow">ALL CHALLENGES</p>
            <h2>Choose a goal</h2>
          </div>
        </div>

        <div className="mission-list">
          {missionsLoading ? (
            <p className="subhead" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LoaderCircle size={18} className="spin" /> Loading challenges…
            </p>
          ) : apiMissions.length === 0 ? (
            <p className="subhead">No active challenges right now. Check back soon.</p>
          ) : (
            apiMissions.map((m) => <MissionCard mission={m} onStart={start} key={m.id} />)
          )}
        </div>
      </main>

      {complete && (
        <div className="toast">
          <div>
            <Check size={18} />
          </div>
          <span>
            <strong>Challenge complete!</strong>
            <small>+{lastMove} MOVE added to your account</small>
          </span>
        </div>
      )}

      {completeError && (
        <div className="toast error">
          <span>{completeError}</span>
          <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setCompleteError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {selected && (
        <MissionModal
          mission={selected}
          onClose={() => {
            setSelected(null)
            setCompleteError(null)
          }}
          onComplete={finish}
          loading={loadingComplete}
        />
      )}

      <footer className="centered-nav-bar">
        {(
          [
            ['Home', LayoutDashboard, '/'],
            ['Challenges', Target, '/challenges'],
            ['Competitions', Trophy, '/competitions'],
            ['Rewards', Gift, '/rewards'],
          ] as const
        ).map(([label, Icon, path]) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
          return (
            <Link className={active ? 'active' : ''} href={path} key={label}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </footer>
    </div>
  )
}
