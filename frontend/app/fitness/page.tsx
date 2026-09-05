'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  Bolt,
  Check,
  Clock3,
  Flame,
  Info,
  LoaderCircle,
  Sparkles,
  Timer,
  X,
  Zap,
} from 'lucide-react'
import {
  ApiDailyAssignment,
  ApiTodayFitness,
  ApiUser,
  clearToken,
  getStoredToken,
  movegridApi,
} from '../../lib/api'

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

function PenguinMascot({ message = "Great form! Keep waddling toward your goals!" }: { message?: string }) {
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

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function taskTitle(assignment: ApiDailyAssignment) {
  const exercise = assignment.exercise
  if (exercise.target_reps > 0 && exercise.duration_minutes === 0) {
    if (exercise.name.toLowerCase().includes('plank') || exercise.name.toLowerCase().includes('hold')) {
      return `${exercise.target_reps} Second ${exercise.name}`
    }
    return `${exercise.target_reps} ${exercise.name}`
  }
  if (exercise.duration_minutes > 0) {
    return `${exercise.duration_minutes} Minute ${exercise.name}`
  }
  return exercise.name
}

function ExerciseGuideModal({
  assignment,
  onClose,
  onComplete,
  completing,
}: {
  assignment: ApiDailyAssignment
  onClose: () => void
  onComplete: (id: number) => void
  completing: boolean
}) {
  const exercise = assignment.exercise
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <Activity size={15} /> EXERCISE GUIDE
        </div>
        <h2>{taskTitle(assignment)}</h2>
        <p>{exercise.description}</p>
        <div className="modal-panel" style={{ flexDirection: 'column', gap: '0.6rem', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ opacity: 0.7 }}>Category:</span>
            <strong>{exercise.category}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ opacity: 0.7 }}>Difficulty:</span>
            <strong>{exercise.difficulty}</strong>
          </div>
          {exercise.target_reps > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ opacity: 0.7 }}>Target Reps / Seconds:</span>
              <strong>{exercise.target_reps}</strong>
            </div>
          )}
          {exercise.instructions && (
            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Technique Instructions:</span>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.4' }}>{exercise.instructions}</p>
            </div>
          )}
        </div>
        {assignment.status === 'ASSIGNED' ? (
          <button
            className="primary-button full"
            disabled={completing}
            onClick={() => {
              onComplete(assignment.id)
              onClose()
            }}
          >
            {completing ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
            {completing ? 'Logging…' : 'Complete & Claim MOVE'}
          </button>
        ) : (
          <button className="outline-button full" onClick={onClose}>
            Close guide
          </button>
        )}
      </div>
    </div>
  )
}

function AssignmentCard({
  assignment,
  secondsRemaining,
  onComplete,
  onInspect,
  completing,
  justCompleted,
}: {
  assignment: ApiDailyAssignment
  secondsRemaining: number
  onComplete: (id: number) => void
  onInspect: (assignment: ApiDailyAssignment) => void
  completing: boolean
  justCompleted: boolean
}) {
  const done = assignment.status === 'COMPLETED'
  const expired = assignment.status === 'EXPIRED'

  return (
    <article className={`fitness-card ${done ? 'done' : ''} ${expired ? 'expired' : ''} ${justCompleted ? 'pop' : ''}`}>
      <div className="fitness-card-top">
        <span className="pill lime">{assignment.exercise.category}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="icon-button"
            onClick={() => onInspect(assignment)}
            title="View Exercise Guide"
            style={{ width: '26px', height: '26px' }}
          >
            <Info size={14} />
          </button>
          <span className="move-value">
            <Zap size={14} fill="currentColor" /> +{assignment.points} MOVE
          </span>
        </div>
      </div>
      <h3>{taskTitle(assignment)}</h3>
      <p>{assignment.exercise.description}</p>
      <div className="mission-meta">
        <span>
          <Activity size={14} /> {assignment.exercise.difficulty}
        </span>
        {!expired && !done && (
          <span>
            <Timer size={14} /> Expires in {formatCountdown(secondsRemaining)}
          </span>
        )}
        {done && assignment.completed_at && (
          <span>
            <Check size={14} /> Completed
          </span>
        )}
        {expired && (
          <span>
            <Clock3 size={14} /> Expired
          </span>
        )}
      </div>
      {assignment.status === 'ASSIGNED' && (
        <button className="primary-button full" disabled={completing} onClick={() => onComplete(assignment.id)}>
          {completing ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
          {completing ? 'Logging…' : 'Mark complete'}
        </button>
      )}
      {done && (
        <div className="fitness-done-badge">
          <Check size={16} /> Nice work · +{assignment.points} MOVE
        </div>
      )}
    </article>
  )
}

export default function FitnessPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [today, setToday] = useState<ApiTodayFitness | null>(null)
  const [historyExpired, setHistoryExpired] = useState<ApiDailyAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [justCompletedId, setJustCompletedId] = useState<number | null>(null)
  const [inspectAssignment, setInspectAssignment] = useState<ApiDailyAssignment | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async (authToken: string) => {
    const [me, fitness, history] = await Promise.all([
      movegridApi.me(authToken),
      movegridApi.todayFitness(authToken),
      movegridApi.fitnessHistory(authToken),
    ])
    setUser(me)
    setToday(fitness)
    setHistoryExpired(history.expired.slice(0, 6))
  }, [])

  useEffect(() => {
    const stored = getStoredToken()
    if (!stored) {
      router.replace('/login')
      return
    }
    setToken(stored)
    load(stored)
      .catch((err) => {
        clearToken()
        setError(err instanceof Error ? err.message : 'Could not load fitness')
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [load, router])

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const secondsRemaining = useMemo(() => {
    if (!today?.expires_at) return 0
    const expires = new Date(today.expires_at).getTime()
    return Math.max(0, Math.floor((expires - Date.now()) / 1000))
  }, [today?.expires_at, tick])

  async function handleComplete(assignmentId: number) {
    if (!token) return
    setCompletingId(assignmentId)
    setError('')
    try {
      const result = await movegridApi.completeFitness(token, assignmentId)
      setJustCompletedId(assignmentId)
      setToast(`+${result.points_awarded} MOVE · ${result.exercise_name ?? 'Exercise'} done`)
      await load(token)
      window.setTimeout(() => {
        setToast('')
        setJustCompletedId(null)
      }, 2800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete assignment')
    } finally {
      setCompletingId(null)
    }
  }

  function logout() {
    clearToken()
    router.push('/login')
  }

  if (loading || !today || !user) {
    return (
      <div className="app-shell fitness-loading">
        <LoaderCircle className="spin" size={28} />
        <p>Loading today&apos;s fitness…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/fitness" className="nav-active">
            Fitness
          </Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/rewards">Rewards</Link>
        </nav>
        <div className="top-actions">
          <div className="move-chip">
            <Zap size={14} fill="currentColor" />
            {user.total_points.toLocaleString()} MOVE
          </div>
          <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
          <button className="outline-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="main-content fitness-page">
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link className="text-button" href="/">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <p className="eyebrow">TODAY&apos;S FITNESS</p>
            <h1>
              Your daily workouts, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">
              Personalized for {today.fitness_level} · each task expires in 24 hours.
            </p>
          </div>
          <PenguinMascot message="Finish today's exercises before the timer expires!" />
        </div>

        <section className="fitness-progress-card">
          <div>
            <p className="eyebrow">DAILY COMPLETION</p>
            <h2>
              {today.progress.completed}/{today.progress.total} complete
            </h2>
            <p>
              {today.progress.points_earned} MOVE earned · {today.progress.points_available} MOVE still available
            </p>
          </div>
          <div className="fitness-progress-meter" aria-label="Daily fitness progress">
            <div className="fitness-progress-ring">
              <strong>{today.progress.percent}%</strong>
            </div>
            <div className="fitness-progress-bar">
              <span style={{ width: `${today.progress.percent}%` }} />
            </div>
          </div>
        </section>

        {error && <p className="form-error">{error}</p>}

        <section className="section-heading compact">
          <div>
            <p className="eyebrow">TODAY&apos;S TASKS</p>
            <h2>Finish before they expire</h2>
          </div>
        </section>
        <div className="fitness-grid">
          {today.assigned.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              secondsRemaining={
                assignment.status === 'ASSIGNED'
                  ? Math.max(0, Math.floor((new Date(assignment.expires_at).getTime() - Date.now()) / 1000))
                  : 0
              }
              onComplete={handleComplete}
              onInspect={setInspectAssignment}
              completing={completingId === assignment.id}
              justCompleted={justCompletedId === assignment.id}
            />
          ))}
          {today.assigned.length === 0 && (
            <div className="fitness-empty">
              <Check size={22} />
              <strong>All today&apos;s tasks are done</strong>
              <span>Come back when the next 24-hour window opens.</span>
            </div>
          )}
        </div>

        {today.completed.length > 0 && (
          <>
            <section className="section-heading compact">
              <div>
                <p className="eyebrow">COMPLETED</p>
                <h2>Locked in</h2>
              </div>
            </section>
            <div className="fitness-grid muted">
              {today.completed.map((assignment) => (
                <AssignmentCard
                  key={`done-${assignment.id}`}
                  assignment={assignment}
                  secondsRemaining={0}
                  onComplete={handleComplete}
                  onInspect={setInspectAssignment}
                  completing={false}
                  justCompleted={false}
                />
              ))}
            </div>
          </>
        )}

        {historyExpired.length > 0 && (
          <>
            <section className="section-heading compact">
              <div>
                <p className="eyebrow">EXPIRED</p>
                <h2>Missed windows</h2>
              </div>
            </section>
            <div className="fitness-grid muted">
              {historyExpired.map((assignment) => (
                <AssignmentCard
                  key={`expired-${assignment.id}`}
                  assignment={assignment}
                  secondsRemaining={0}
                  onComplete={handleComplete}
                  onInspect={setInspectAssignment}
                  completing={false}
                  justCompleted={false}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {inspectAssignment && (
        <ExerciseGuideModal
          assignment={inspectAssignment}
          onClose={() => setInspectAssignment(null)}
          onComplete={handleComplete}
          completing={completingId === inspectAssignment.id}
        />
      )}

      {toast && (
        <div className="toast">
          <div>
            <Check size={18} />
          </div>
          <span>
            <strong>Exercise complete!</strong>
            <small>{toast}</small>
          </span>
        </div>
      )}
    </div>
  )
}
