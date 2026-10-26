'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bell, CheckCircle2, Crosshair, Flame, Footprints,
  Play, Sparkles, Trophy, Zap
} from 'lucide-react'
import {
  ApiMission,
  ApiTodayFitness,
  ApiUser,
  dropSessionIfUnauthorized,
  getStoredToken,
  movegridApi,
  notifyUserUpdated,
  peekMeCache,
} from '../lib/api'
import { loadLeaderboardMove, loadMissions } from '../lib/dashboardBootstrap'
import { AppChrome } from '../components/AppChrome'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { DashboardPath } from '../components/DashboardPath'
import { useStepCounter } from '../hooks/useStepCounter'
import { istDateKey } from '../lib/ist'
import { pickDailyStepMission, rankMovementDetail, streakBadgeDetail } from '../lib/missionUi'

function StatCard({
  icon,
  label,
  shortLabel,
  value,
  detail,
  tone,
  badgeSymbol,
}: {
  icon: React.ReactNode
  label: string
  shortLabel: string
  value: string
  detail: string
  tone: string
  badgeSymbol?: string
}) {
  return (
    <div className={`stat-card compact-stat-card ${tone}`}>
      {badgeSymbol && <span className="stat-badge-tag">{badgeSymbol}</span>}
      <div className="stat-icon">{icon}</div>
      <div className="stat-card-copy">
        <p>
          <span className="stat-label-full">{label}</span>
          <span className="stat-label-short">{shortLabel}</span>
        </p>
        <strong title={value}>{value}</strong>
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
  challengeState,
  secondsRemaining,
  challengeTitle,
  challengeMove,
  steps,
  stepGoal,
  stepPercent,
  onStartChallenge,
}: {
  challengeState: 'idle' | 'active' | 'completed' | 'expired'
  secondsRemaining: number
  challengeTitle: string
  challengeMove: number
  steps: number
  stepGoal: number
  stepPercent: number
  onStartChallenge: () => void
}) {
  const isCompleted = challengeState === 'completed' || stepPercent >= 100
  const isExpired = challengeState === 'expired' && !isCompleted
  const isActive = challengeState === 'active' && !isCompleted

  return (
    <div className={`daily-challenge-notification ${isCompleted ? 'unlocked' : isExpired ? 'expired' : isActive ? 'active' : 'locked'}`}>
      <div className="challenge-box-header">
        <div className="notification-badge">
          <Bell size={13} className={isActive ? 'bell-ring' : ''} />
          <span>
            {isCompleted ? 'COMPLETED' : isExpired ? 'EXPIRED' : isActive ? 'TRACKING LIVE' : 'DAILY QUEST'}
          </span>
        </div>
        <strong className="notification-title">{challengeTitle}</strong>
        <span className="notification-timer-chip">
          {isCompleted ? '✓ Done' : isExpired ? '⌛ Expired' : `⏱ ${formatCountdown(secondsRemaining)}`}
        </span>
      </div>

      <div className="challenge-box-body">
        <div className="notification-meta-pills">
          <span className="meta-pill">
            <Footprints size={12} /> {steps.toLocaleString()} / {stepGoal.toLocaleString()} ({stepPercent}%)
          </span>
          <span className="meta-pill reward">
            <Zap size={12} fill="currentColor" /> +{challengeMove} MOVE
          </span>
        </div>

        <div className="notification-actions">
          {isCompleted ? (
            <span className="challenge-status-chip success">
              <CheckCircle2 size={14} /> +{challengeMove} MOVE
            </span>
          ) : isExpired ? (
            <span className="challenge-status-chip expired">
              Expired
            </span>
          ) : isActive ? (
            <span className="challenge-status-chip active">
              <Sparkles size={14} className="spin-slow" /> Active
            </span>
          ) : (
            <button
              type="button"
              className="primary-button start-challenge-btn"
              onClick={onStartChallenge}
              title="Click to start continuous live tracking for today's challenge"
            >
              <Play size={12} fill="currentColor" />
              <span>Start Challenge</span>
            </button>
          )}
        </div>
      </div>

      <div className="notification-progress-track">
        <div
          className={`notification-progress-fill ${isCompleted ? 'complete' : ''}`}
          style={{ width: `${Math.min(100, stepPercent)}%` }}
        />
      </div>
    </div>
  )
}

export default function Page() {
  const [move, setMove] = useState(0)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [fitness, setFitness] = useState<ApiTodayFitness | null>(null)
  const [dailyMission, setDailyMission] = useState<ApiMission | null>(null)
  const [tick, setTick] = useState(0)
  const [rankLabel, setRankLabel] = useState('—')
  const [rankDelta, setRankDelta] = useState<number | null>(null)
  const [challengeState, setChallengeState] = useState<'idle' | 'active' | 'completed' | 'expired'>('idle')
  const [toast, setToast] = useState<string>('')

  const { steps, goal: stepGoal, percent: stepPercent, startTracking, active: stepActive, pause: stopTracking } = useStepCounter()

  const token = getStoredToken()

  const challengeTitle = dailyMission?.title ?? '10,000 Daily Steps Goal'
  const challengeMove = dailyMission?.move_reward ?? 150
  const dailyMissionId = dailyMission?.id

  const load = useCallback(async (authToken: string) => {
    const cached = peekMeCache(authToken)
    if (cached) {
      setUser(cached)
      setMove(cached.total_points ?? 0)
    }
    const [me, board, missions] = await Promise.all([
      movegridApi.me(authToken),
      loadLeaderboardMove(authToken),
      loadMissions(),
    ])
    setUser(me)
    setMove(me.total_points ?? 0)
    setDailyMission(pickDailyStepMission(missions))
    if (board?.me?.rank) setRankLabel(`#${board.me.rank}`)
    else setRankLabel('—')
    setRankDelta(board?.me?.movement ?? null)
  }, [])

  useEffect(() => {
    if (!token) return
    load(token).catch((err) => dropSessionIfUnauthorized(err, token))
  }, [token, load])

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const today = istDateKey()
    const savedState = localStorage.getItem(`movegrid_challenge_state_${today}`) as any
    if (savedState) {
      setChallengeState(savedState)
    }
  }, [])

  useEffect(() => {
    if (challengeState === 'active' && !stepActive) {
      startTracking()
    } else if ((challengeState === 'completed' || challengeState === 'expired') && stepActive) {
      stopTracking()
    }
  }, [challengeState, stepActive, startTracking, stopTracking])

  useEffect(() => {
    if (steps >= stepGoal && challengeState !== 'completed') {
      const today = istDateKey()
      setChallengeState('completed')
      localStorage.setItem(`movegrid_challenge_state_${today}`, 'completed')

      const authToken = getStoredToken()

      if (!authToken || !dailyMissionId) {
        setToast('🎉 Daily step goal reached! Sign in to sync MOVE with the server.')
        return
      }

      movegridApi.syncSteps(authToken, steps).catch(() => {})

      movegridApi
        .completeMission(authToken, dailyMissionId)
        .then((res) => {
          const body = res as {
            total_points?: number
            move_points?: number
            move_awarded?: number
            points_awarded?: number
          }
          const total = body.total_points ?? body.move_points
          const awarded = body.points_awarded ?? body.move_awarded ?? challengeMove
          if (total != null) {
            setMove(total)
            notifyUserUpdated({ total_points: total })
          } else setMove((prev) => prev + awarded)
          setToast(`🎉 Daily Challenge Completed! +${awarded} MOVE points auto-fetched & awarded!`)
        })
        .catch(() => {
          setMove((prev) => prev + challengeMove)
          setToast(`🎉 Daily Challenge Completed! +${challengeMove} MOVE points awarded!`)
        })
    }
  }, [steps, stepGoal, challengeState, dailyMissionId, challengeMove, token])

  const secondsRemaining = useMemo(() => {
    if (fitness?.expires_at) {
      return Math.max(0, Math.floor((new Date(fitness.expires_at).getTime() - Date.now()) / 1000))
    }
    const end = new Date()
    end.setHours(24, 0, 0, 0)
    return Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000))
  }, [fitness?.expires_at, tick])

  useEffect(() => {
    if (secondsRemaining === 0 && challengeState === 'active') {
      const today = istDateKey()
      setChallengeState('expired')
      localStorage.setItem(`movegrid_challenge_state_${today}`, 'expired')
    }
  }, [secondsRemaining, challengeState])

  const handleStartChallenge = useCallback(() => {
    const today = istDateKey()
    setChallengeState('active')
    localStorage.setItem(`movegrid_challenge_state_${today}`, 'active')
    startTracking()
    const token = getStoredToken()
    if (token && dailyMissionId) {
      movegridApi.syncSteps(token, steps).catch(() => {})
      movegridApi.startMission(dailyMissionId, steps, token).catch(() => {})
    }
  }, [startTracking, steps, dailyMissionId])

  return (
    <div className="app-shell">
      <AppChrome />

      <main className="main-content dashboard-with-trail">
        <div className="top-daily-challenge-banner">
          <DailyChallengeBar
            challengeState={challengeState}
            secondsRemaining={secondsRemaining}
            challengeTitle={challengeTitle}
            challengeMove={challengeMove}
            steps={steps}
            stepGoal={stepGoal}
            stepPercent={stepPercent}
            onStartChallenge={handleStartChallenge}
          />
        </div>

        <div className="welcome trail-welcome page-hero">
          <div>
            <div className="cartoon-speech-bubble">
              <Sparkles size={13} /> POWER UP YOUR DAY! 🚀
            </div>
            <p className="eyebrow">MOVEGRID · DAILY QUEST</p>
            <h1>
              Keep moving, <span className="dashboard-greeting-name">{user ? user.name.split(' ')[0] : 'Mover'}!</span> 💪
            </h1>
          </div>
          <div className="move-chip">
            <Zap size={15} fill="currentColor" />
            {move.toLocaleString()} MOVE ⚡
          </div>
        </div>

        <div className="dashboard-grid-layout">
          <aside className="dashboard-sidebar-left">
            <div className="stats-vertical-stack dashboard-stat-row">
              <StatCard
                icon={<Zap size={16} />}
                label="MOVE points"
                shortLabel="MOVE"
                value={`${move.toLocaleString()}`}
                detail={
                  fitness?.progress.points_earned
                    ? `+${fitness.progress.points_earned} today`
                    : 'Finish today’s levels'
                }
                tone="lime"
                badgeSymbol="⚡"
              />
              <StatCard
                icon={<Flame size={16} />}
                label="Current streak"
                shortLabel="Streak"
                value={String(user?.streak ?? 0)}
                detail={streakBadgeDetail(user?.streak ?? 0)}
                tone="orange"
                badgeSymbol="🔥"
              />
              <StatCard
                icon={<Footprints size={16} />}
                label="Steps today"
                shortLabel="Steps"
                value={steps.toLocaleString()}
                detail={`${stepPercent}%`}
                tone="blue"
                badgeSymbol="👟"
              />
              <Link className="dashboard-stat-link" href="/standings">
                <StatCard
                  icon={<Trophy size={16} />}
                  label="Global rank"
                  shortLabel="Rank"
                  value={rankLabel}
                  detail={rankMovementDetail(rankDelta)}
                  tone="purple"
                  badgeSymbol="🏆"
                />
              </Link>
            </div>
          </aside>

          <div className="dashboard-main-content">
            <Link href="/territory" className="grid-claim-card">
              <div className="grid-claim-card-copy">
                <span className="grid-claim-badge">NEW GAME</span>
                <h2>Grid Claim</h2>
                <p>
                  Walk a snake trail on the live map. Close a circle, square, or any shape and that area is yours. If
                  another mover closes over your turf, they take the overlap.
                </p>
                <span className="grid-claim-cta">
                  <Crosshair size={14} /> Play live turf
                </span>
              </div>
              <div className="grid-claim-card-art" aria-hidden>
                <span className="grid-claim-tile you" />
                <span className="grid-claim-tile rival" />
                <span className="grid-claim-tile you" />
                <span className="grid-claim-tile steal" />
                <span className="grid-claim-tile you" />
                <span className="grid-claim-tile rival" />
              </div>
            </Link>
            <DashboardPath onPointsChange={setMove} onFitnessChange={setFitness} />
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast" onClick={() => setToast('')} style={{ cursor: 'pointer' }}>
          <div>
            <Sparkles size={16} />
          </div>
          <div>
            <strong>{toast}</strong>
            <small>Tap anywhere to dismiss</small>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}
