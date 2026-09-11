'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Camera,
  Check,
  Clock3,
  Info,
  LoaderCircle,
  Lock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  X,
  Zap,
} from 'lucide-react'
const PostureCamera = dynamic(
  () => import('./PostureCamera').then((mod) => mod.PostureCamera),
  { ssr: false, loading: () => null },
)
import {
  ApiDailyAssignment,
  ApiTodayFitness,
  getStoredToken,
  movegridApi,
  notifyUserUpdated,
} from '../lib/api'
import { PenguinPathMap, PathLevel } from './PenguinPathMap'
import {
  daysInIstMonth,
  formatCountdown,
  getIstParts,
  istDateKey,
  istDateKeyFromIso,
  istMonthKey,
  monthLabelIst,
} from '../lib/ist'
import {
  DayLevelStatus,
  getMonthProgress,
  markDayCompleted,
  markDayMissed,
  mergeHistoryIntoProgress,
} from '../lib/monthProgress'

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

function ActiveExerciseModal({
  assignment,
  onClose,
  onComplete,
  completing,
}: {
  assignment: ApiDailyAssignment
  onClose: () => void
  onComplete: (id: number) => Promise<void>
  completing: boolean
}) {
  const exercise = assignment.exercise
  const targetReps = exercise.target_reps || (exercise.duration_minutes ? exercise.duration_minutes * 10 : 10)
  const [repsDone, setRepsDone] = useState(0)
  const [formScore, setFormScore] = useState(90)
  const [isPostureCorrect, setIsPostureCorrect] = useState(true)
  const [goalCompleted, setGoalCompleted] = useState(false)

  const isFinished = repsDone >= targetReps || goalCompleted

  const handleGoalComplete = useCallback(() => {
    setGoalCompleted(true)
    // Auto-complete after 1.8 seconds of celebration
    setTimeout(() => {
      onComplete(assignment.id).then(() => onClose()).catch(() => {})
    }, 1800)
  }, [assignment.id, onComplete, onClose])

  return (
    <div className="modal-backdrop active-exercise-backdrop" onClick={onClose}>
      <div className="modal active-exercise-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="modal-kicker">
          <Camera size={15} /> LIVE POSTURE CAMERA SESSION
        </div>

        <div className="exercise-header-badge">
          <span className="pill lime">{exercise.category}</span>
          <span className="move-value">
            <Zap size={13} fill="currentColor" /> +{assignment.points} MOVE
          </span>
        </div>

        <h2 style={{ marginTop: '6px', marginBottom: '2px' }}>{taskTitle(assignment)}</h2>
        <p style={{ fontSize: '0.85rem', color: '#183d59', opacity: 0.85, marginBottom: '12px' }}>
          {exercise.description}
        </p>

        {/* Live Camera & Posture Recording Stream */}
        <div className="exercise-runner-box posture-runner-box">
          <PostureCamera
            enabled
            exerciseName={exercise.name}
            targetReps={targetReps}
            onRepsChange={(reps) => setRepsDone(reps)}
            onPostureUpdate={(score, isCorrect) => {
              setFormScore(score)
              setIsPostureCorrect(isCorrect)
            }}
            onGoalComplete={handleGoalComplete}
          />
        </div>

        {exercise.instructions && (
          <div className="exercise-technique-card">
            <strong>
              <Activity size={13} /> Form & Technique Guide:
            </strong>
            <p>{exercise.instructions}</p>
          </div>
        )}

        <button
          type="button"
          className={`primary-button full complete-exercise-claim-btn ${isFinished ? 'pulse-gold' : ''}`}
          disabled={completing}
          onClick={async () => {
            await onComplete(assignment.id)
            onClose()
          }}
        >
          {completing ? (
            <>
              <LoaderCircle size={16} className="spin" />
              <span>Logging Exercise & Awarding Rewards...</span>
            </>
          ) : isFinished ? (
            <>
              <Sparkles size={16} />
              <span>Goal Reached! Claim +{assignment.points} MOVE</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Complete & Claim +{assignment.points} MOVE</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ExerciseGuideModal({
  assignment,
  onClose,
  onComplete,
  completing,
  onStartExercise,
}: {
  assignment: ApiDailyAssignment
  onClose: () => void
  onComplete: (id: number) => void
  completing: boolean
  onStartExercise: (assignment: ApiDailyAssignment) => void
}) {
  const exercise = assignment.exercise
  return (
    <div className="modal-backdrop" style={{ zIndex: 40 }}>
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
          {exercise.instructions && (
            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(24,61,89,0.12)' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Technique:</span>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.4' }}>{exercise.instructions}</p>
            </div>
          )}
        </div>
        {assignment.status === 'ASSIGNED' ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              className="primary-button"
              style={{ flex: 1.4 }}
              onClick={() => {
                onClose()
                onStartExercise(assignment)
              }}
            >
              <Play size={15} fill="currentColor" /> Start Exercise
            </button>
            <button
              className="outline-button"
              style={{ flex: 1 }}
              disabled={completing}
              onClick={() => {
                onComplete(assignment.id)
                onClose()
              }}
            >
              {completing ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
              Done
            </button>
          </div>
        ) : (
          <button className="outline-button full" onClick={onClose}>
            Close guide
          </button>
        )}
      </div>
    </div>
  )
}

function DayLevelModal({
  day,
  monthLabel,
  today,
  secondsRemaining,
  onClose,
  onComplete,
  completingId,
  justCompletedId,
  onInspect,
  levelClosed,
  onStartExercise,
}: {
  day: number
  monthLabel: string
  today: ApiTodayFitness
  secondsRemaining: number
  onClose: () => void
  onComplete: (id: number) => void
  completingId: number | null
  justCompletedId: number | null
  onInspect: (assignment: ApiDailyAssignment) => void
  levelClosed: boolean
  onStartExercise: (assignment: ApiDailyAssignment) => void
}) {
  const allDone = today.progress.total > 0 && today.progress.completed >= today.progress.total
  const firstAssigned = today.assignments.find((a) => a.status === 'ASSIGNED')

  return (
    <div className="modal-backdrop day-level-backdrop" onClick={onClose}>
      <div
        className={`modal day-level-modal ${levelClosed || allDone ? 'level-closed' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-kicker">
          <Zap size={15} /> LEVEL {day} · {monthLabel.toUpperCase()}
        </div>
        <h2>{allDone || levelClosed ? 'Level complete!' : `Day ${day} exercises`}</h2>
        <p>
          {allDone || levelClosed
            ? 'This level is closed. Come back tomorrow for the next date.'
            : `Finish before the 24-hour IST timer ends · ${today.fitness_level}`}
        </p>

        {!allDone && !levelClosed && firstAssigned && (
          <div className="day-level-header-actions">
            <button
              type="button"
              className="primary-button start-level-workout-btn"
              onClick={() => onStartExercise(firstAssigned)}
            >
              <Play size={16} fill="currentColor" />
              <span>Start Exercise</span>
            </button>
          </div>
        )}

        {!allDone && !levelClosed && (
          <div className="day-level-timer">
            <Timer size={16} />
            Expires in {formatCountdown(secondsRemaining)} IST
          </div>
        )}

        <div className="day-level-progress">
          <strong>
            {today.progress.completed}/{today.progress.total} done
          </strong>
          <div className="fitness-progress-bar">
            <span style={{ width: `${today.progress.percent}%` }} />
          </div>
        </div>

        {(allDone || levelClosed) && (
          <div className="day-level-closed-banner">
            <Check size={18} /> Level closed · +{today.progress.points_earned} MOVE
          </div>
        )}

        <div className="day-level-list">
          {today.assignments.map((assignment) => {
            const done = assignment.status === 'COMPLETED'
            const expired = assignment.status === 'EXPIRED'
            return (
              <article
                key={assignment.id}
                className={`day-exercise-row ${done ? 'done' : ''} ${expired ? 'expired' : ''} ${justCompletedId === assignment.id ? 'pop' : ''}`}
              >
                <div>
                  <div className="day-exercise-top">
                    <span className="pill lime">{assignment.exercise.category}</span>
                    <span className="move-value">
                      <Zap size={12} fill="currentColor" /> +{assignment.points}
                    </span>
                  </div>
                  <h3>{taskTitle(assignment)}</h3>
                  <p>{assignment.exercise.description}</p>
                </div>
                <div className="day-exercise-actions">
                  <button type="button" className="icon-button" onClick={() => onInspect(assignment)} title="View guide">
                    <Info size={16} />
                  </button>
                  {assignment.status === 'ASSIGNED' && !levelClosed && (
                    <button
                      type="button"
                      className="primary-button start-exercise-row-btn"
                      onClick={() => onStartExercise(assignment)}
                    >
                      <Play size={14} fill="currentColor" />
                      Start Exercise
                    </button>
                  )}
                  {done && (
                    <span className="day-exercise-status ok">
                      <Check size={14} /> Done
                    </span>
                  )}
                  {expired && (
                    <span className="day-exercise-status miss">
                      <Clock3 size={14} /> Expired
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LockedDayModal({
  day,
  reason,
  onClose,
}: {
  day: number
  reason: 'locked' | 'missed' | 'closed' | 'completed'
  onClose: () => void
}) {
  const copy = {
    locked: {
      title: `Level ${day} is locked`,
      body: 'Pebble has not reached this date yet. Come back on that IST day.',
    },
    missed: {
      title: `Level ${day} expired`,
      body: 'The 24-hour IST window for this day has passed.',
    },
    closed: {
      title: `Level ${day} is closed`,
      body: 'You already finished this day’s exercises.',
    },
    completed: {
      title: `Level ${day} cleared`,
      body: 'This date is already complete on your monthly path.',
    },
  }[reason]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-kicker" style={{ justifyContent: 'center' }}>
          <Lock size={15} /> PATH GATE
        </div>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <button className="primary-button full" onClick={onClose}>
          Back to map
        </button>
      </div>
    </div>
  )
}

type DashboardPathProps = {
  onPointsChange?: (points: number) => void
  onFitnessChange?: (fitness: ApiTodayFitness | null) => void
}

export function DashboardPath({ onPointsChange, onFitnessChange }: DashboardPathProps) {
  const [today, setToday] = useState<ApiTodayFitness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [justCompletedId, setJustCompletedId] = useState<number | null>(null)
  const [inspectAssignment, setInspectAssignment] = useState<ApiDailyAssignment | null>(null)
  const [activeExerciseAssignment, setActiveExerciseAssignment] = useState<ApiDailyAssignment | null>(null)
  const [tick, setTick] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [gateDay, setGateDay] = useState<{ day: number; reason: 'locked' | 'missed' | 'closed' | 'completed' } | null>(
    null,
  )
  const [monthProgress, setMonthProgress] = useState(() => getMonthProgress())
  const [autoCloseArmed, setAutoCloseArmed] = useState(false)

  const handleStartExercise = useCallback((assignment: ApiDailyAssignment) => {
    setSelectedDay(null)
    setInspectAssignment(null)
    setActiveExerciseAssignment(assignment)
  }, [])

  const istToday = getIstParts()
  const todayDay = istToday.day
  const dayCount = daysInIstMonth()
  const monthLabel = monthLabelIst()
  const monthKey = istMonthKey()

  const load = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }
    const [fitness, history] = await Promise.all([
      movegridApi.todayFitness(token),
      movegridApi.fitnessHistory(token),
    ])
    setToday(fitness)
    onFitnessChange?.(fitness)
    onPointsChange?.(fitness.total_points)

    const completedDays = new Set<number>()
    const missedDays = new Set<number>()
    const byDay = new Map<string, ApiDailyAssignment[]>()

    for (const item of history.items) {
      const key = istDateKeyFromIso(item.assigned_at)
      if (!key || !key.startsWith(monthKey)) continue
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(item)
    }

    for (const [key, items] of byDay) {
      const dayNum = Number(key.slice(-2))
      if (dayNum === todayDay) continue
      const allComplete = items.length > 0 && items.every((i) => i.status === 'COMPLETED')
      const anyExpired = items.some((i) => i.status === 'EXPIRED')
      if (allComplete) completedDays.add(dayNum)
      else if (anyExpired || key < istDateKey()) missedDays.add(dayNum)
    }

    for (let d = 1; d < todayDay; d += 1) {
      if (!completedDays.has(d)) missedDays.add(d)
    }

    if (fitness.progress.total > 0 && fitness.progress.completed >= fitness.progress.total) {
      completedDays.add(todayDay)
      markDayCompleted(todayDay, monthKey)
    }

    setMonthProgress(
      mergeHistoryIntoProgress([...completedDays], [...missedDays].filter((d) => !completedDays.has(d)), monthKey),
    )
  }, [monthKey, todayDay, onFitnessChange, onPointsChange])

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load path'))
      .finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const secondsRemaining = useMemo(() => {
    void tick
    if (!today?.expires_at) return 0
    return Math.max(0, Math.floor((new Date(today.expires_at).getTime() - Date.now()) / 1000))
  }, [today?.expires_at, tick])

  const levels: PathLevel[] = useMemo(() => {
    const completed = new Set(monthProgress.completedDays)
    const missed = new Set(monthProgress.missedDays)
    const list: PathLevel[] = []
    for (let day = 1; day <= dayCount; day += 1) {
      let status: DayLevelStatus = 'locked'
      if (day === todayDay) status = completed.has(day) ? 'completed' : 'active'
      else if (day < todayDay) status = completed.has(day) ? 'completed' : missed.has(day) ? 'missed' : 'closed'
      list.push({ day, status })
    }
    return list
  }, [dayCount, monthProgress, todayDay])

  const todayLevelClosed =
    Boolean(today && today.progress.total > 0 && today.progress.completed >= today.progress.total) ||
    monthProgress.completedDays.includes(todayDay)

  useEffect(() => {
    if (!today || selectedDay !== todayDay) {
      setAutoCloseArmed(false)
      return
    }
    if (today.progress.total > 0 && today.progress.completed >= today.progress.total) {
      setAutoCloseArmed(true)
    }
  }, [today, selectedDay, todayDay])

  useEffect(() => {
    if (!autoCloseArmed || selectedDay !== todayDay) return
    const id = window.setTimeout(() => {
      setSelectedDay(null)
      setAutoCloseArmed(false)
      setToast('Level closed · see you tomorrow')
      window.setTimeout(() => setToast(''), 2800)
    }, 1600)
    return () => window.clearTimeout(id)
  }, [autoCloseArmed, selectedDay, todayDay])

  async function handleComplete(assignmentId: number) {
    const token = getStoredToken()
    if (!token) return
    setCompletingId(assignmentId)
    setError('')
    try {
      const result = await movegridApi.completeFitness(token, assignmentId)
      notifyUserUpdated({ total_points: result.total_points })
      setJustCompletedId(assignmentId)
      setToast(`+${result.points_awarded} MOVE · ${result.exercise_name ?? 'Exercise'} done`)
      await load()
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

  function handleSelectDay(day: number) {
    const level = levels.find((item) => item.day === day)
    if (!level) return
    if (day === todayDay) {
      if (secondsRemaining <= 0 && today && today.progress.completed < today.progress.total) {
        setMonthProgress(markDayMissed(todayDay, monthKey))
        setGateDay({ day, reason: 'missed' })
        return
      }
      setSelectedDay(day)
      return
    }
    if (level.status === 'locked') setGateDay({ day, reason: 'locked' })
    else if (level.status === 'missed') setGateDay({ day, reason: 'missed' })
    else if (level.status === 'completed') setGateDay({ day, reason: 'completed' })
    else setGateDay({ day, reason: 'closed' })
  }

  if (loading) {
    return (
      <div className="trail-map-loading">
        <LoaderCircle className="spin" size={24} />
        <span>Loading trail…</span>
      </div>
    )
  }

  if (!getStoredToken()) {
    return (
      <div className="trail-map-guest">
        <p>Sign in to walk Pebble’s monthly trail and unlock today’s exercises.</p>
      </div>
    )
  }

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      <PenguinPathMap levels={levels} todayDay={todayDay} onSelectDay={handleSelectDay} />

      {selectedDay === todayDay && today && (
        <DayLevelModal
          day={todayDay}
          monthLabel={monthLabel}
          today={today}
          secondsRemaining={secondsRemaining}
          onClose={() => setSelectedDay(null)}
          onComplete={handleComplete}
          completingId={completingId}
          justCompletedId={justCompletedId}
          onInspect={setInspectAssignment}
          levelClosed={todayLevelClosed && today.progress.completed >= today.progress.total}
          onStartExercise={handleStartExercise}
        />
      )}

      {gateDay && <LockedDayModal day={gateDay.day} reason={gateDay.reason} onClose={() => setGateDay(null)} />}

      {inspectAssignment && (
        <ExerciseGuideModal
          assignment={inspectAssignment}
          onClose={() => setInspectAssignment(null)}
          onComplete={handleComplete}
          completing={completingId === inspectAssignment.id}
          onStartExercise={handleStartExercise}
        />
      )}

      {activeExerciseAssignment && (
        <ActiveExerciseModal
          assignment={activeExerciseAssignment}
          onClose={() => setActiveExerciseAssignment(null)}
          onComplete={handleComplete}
          completing={completingId === activeExerciseAssignment.id}
        />
      )}

      {toast && (
        <div className="toast">
          <div>
            <Check size={18} />
          </div>
          <span>
            <strong>Path update</strong>
            <small>{toast}</small>
          </span>
        </div>
      )}
    </>
  )
}
