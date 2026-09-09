'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, CheckCircle2, Flame, Footprints, Gift, LayoutDashboard,
  Play, Sparkles, Target, Trophy, Zap
} from 'lucide-react'
import {
  ApiTodayFitness, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { AppChrome } from '../components/AppChrome'
import { DashboardPath } from '../components/DashboardPath'
import { useStepCounter } from '../hooks/useStepCounter'
import { istDateKey } from '../lib/ist'

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
      <div className="notification-badge">
        <Bell size={14} className={isActive ? 'bell-ring' : ''} />
        <span>
          {isCompleted ? 'CHALLENGE COMPLETED' : isExpired ? 'CHALLENGE EXPIRED' : isActive ? 'CHALLENGE ACTIVE' : 'DAILY CHALLENGE'}
        </span>
      </div>

      <div className="notification-content">
        <div className="notification-text">
          <strong className="notification-title">{challengeTitle}</strong>
          <span className="notification-meta">
            <Footprints size={12} /> {steps.toLocaleString()} / {stepGoal.toLocaleString()} ({stepPercent}%)
            · <Zap size={12} fill="currentColor" style={{ color: '#eab308' }} /> +{challengeMove} MOVE
            · {isCompleted ? '✓ Completed' : isExpired ? '⌛ Expired' : `⏱ ${formatCountdown(secondsRemaining)}`}
          </span>
        </div>

        <div className="notification-progress-track">
          <div
            className={`notification-progress-fill ${isCompleted ? 'complete' : ''}`}
            style={{ width: `${Math.min(100, stepPercent)}%` }}
          />
        </div>
      </div>

      <div className="notification-actions">
        {isCompleted ? (
          <span className="challenge-status-chip success">
            <CheckCircle2 size={14} /> Completed (+{challengeMove})
          </span>
        ) : isExpired ? (
          <span className="challenge-status-chip expired">
            Expired
          </span>
        ) : isActive ? (
          <span className="challenge-status-chip active">
            <Sparkles size={14} className="spin-slow" /> Tracking Live…
          </span>
        ) : (
          <button
            type="button"
            className="primary-button start-challenge-btn"
            onClick={onStartChallenge}
            title="Click to start continuous live tracking for today's challenge"
          >
            <Play size={13} fill="currentColor" />
            <span>Start Challenge</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  const [move, setMove] = useState(2480)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [fitness, setFitness] = useState<ApiTodayFitness | null>(null)
  const [tick, setTick] = useState(0)
  const [rankLabel, setRankLabel] = useState('#24')
  const [challengeState, setChallengeState] = useState<'idle' | 'active' | 'completed' | 'expired'>('idle')
  const [toast, setToast] = useState<string>('')

  // Live step counter from phone accelerometer
  const { steps, goal: stepGoal, percent: stepPercent, requestPermission, active: stepActive, addSteps } = useStepCounter()

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

  // Check saved challenge state for today
  useEffect(() => {
    const today = istDateKey()
    const savedState = localStorage.getItem(`movegrid_challenge_state_${today}`) as any
    if (savedState) {
      setChallengeState(savedState)
    }
  }, [])

  // Continuous step tracking simulation when challenge is ACTIVE
  useEffect(() => {
    if (challengeState !== 'active') return
    const interval = setInterval(() => {
      addSteps(Math.floor(Math.random() * 15) + 25)
    }, 800)
    return () => clearInterval(interval)
  }, [challengeState, addSteps])

  // Auto-fetch completion when step goal is reached!
  useEffect(() => {
    if (steps >= stepGoal && challengeState !== 'completed') {
      const today = istDateKey()
      setChallengeState('completed')
      localStorage.setItem(`movegrid_challenge_state_${today}`, 'completed')

      // Auto-fetch completion rewards
      movegridApi.completeMission(1)
        .then((res: any) => {
          if (res.total_points) setMove(res.total_points)
          else setMove((prev) => prev + 150)
          setToast('🎉 Daily Challenge Completed! +150 MOVE points auto-fetched & awarded!')
        })
        .catch(() => {
          setMove((prev) => prev + 150)
          setToast('🎉 Daily Challenge Completed! +150 MOVE points awarded!')
        })
    }
  }, [steps, stepGoal, challengeState])

  const secondsRemaining = useMemo(() => {
    void tick
    if (fitness?.expires_at) {
      return Math.max(0, Math.floor((new Date(fitness.expires_at).getTime() - Date.now()) / 1000))
    }
    const end = new Date()
    end.setHours(24, 0, 0, 0)
    return Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000))
  }, [fitness?.expires_at, tick])

  // Auto-expire when timer hits zero
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
    requestPermission()
    const currentSteps = steps === 0 ? 150 : steps
    if (steps === 0) addSteps(150) // initial boost on start
    const token = getStoredToken()
    if (token) {
      movegridApi.syncSteps(token, currentSteps).catch(() => {})
      movegridApi.startMission(1, currentSteps, token).catch(() => {})
    }
  }, [requestPermission, addSteps, steps])

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
        {/* Top Floating Notification Pop-up for Daily Challenge */}
        <div className="top-daily-challenge-banner">
          <DailyChallengeBar
            challengeState={challengeState}
            secondsRemaining={secondsRemaining}
            challengeTitle="10,000 Daily Steps Goal"
            challengeMove={150}
            steps={steps}
            stepGoal={stepGoal}
            stepPercent={stepPercent}
            onStartChallenge={handleStartChallenge}
          />
        </div>

        <div className="welcome trail-welcome">
          <div>
            <div className="cartoon-speech-bubble">
              <Sparkles size={13} /> POWER UP YOUR DAY! 🚀
            </div>
            <p className="eyebrow">MOVEGRID · DAILY QUEST</p>
            <h1>
              Keep moving, <span>{user ? user.name.split(' ')[0] : 'Alex'}! 💪</span>
            </h1>
            <p className="subhead">Tap today&apos;s level · finish before the 24-hour IST window ends!</p>
          </div>
          <div className="move-chip">
            <Zap size={15} fill="currentColor" />
            {move.toLocaleString()} MOVE ⚡
          </div>
        </div>

        <div className="dashboard-grid-layout">
          <div className="dashboard-main-content">
            <DashboardPath onPointsChange={setMove} onFitnessChange={setFitness} />
          </div>

          <aside className="dashboard-sidebar-right">
            <div className="stats-vertical-stack">
              <StatCard icon={<Zap size={16} />} label="MOVE points ⚡" value={`${move.toLocaleString()}`} detail="+150 today!" tone="lime" />
              <StatCard icon={<Flame size={16} />} label="Current streak 🔥" value={`${user?.streak ?? 7} days`} detail="2 days to badge" tone="orange" />
              <StatCard
                icon={<Footprints size={16} />}
                label="Steps today 👟"
                value={steps.toLocaleString()}
                detail={`${stepPercent}% of ${stepGoal.toLocaleString()} goal`}
                tone="blue"
              />
              <Link href="/standings" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <StatCard icon={<Trophy size={16} />} label="Global rank 🏆" value={rankLabel} detail="↑ 6 places" tone="purple" />
              </Link>
            </div>
          </aside>
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

      <footer className="centered-nav-bar">
        {(
          [
            ['Home', LayoutDashboard, '/'],
            ['Challenges', Target, '/challenges'],
            ['Competitions', Trophy, '/competitions'],
            ['Rewards', Gift, '/rewards'],
          ] as const
        ).map(([label, Icon, path]) => (
          <Link className={label === 'Home' ? 'active' : ''} href={path} key={label}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </footer>
    </div>
  )
}
