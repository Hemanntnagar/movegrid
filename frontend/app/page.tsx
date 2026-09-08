'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Bell, Flame, Footprints, Gift, LayoutDashboard, Lock,
  Play, Target, Trophy, Unlock, Users, Zap
} from 'lucide-react'
import {
  ApiTodayFitness, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { AppChrome } from '../components/AppChrome'
import { DashboardPath } from '../components/DashboardPath'
import { useStepCounter } from '../hooks/useStepCounter'

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
  steps,
  stepGoal,
  stepPercent,
  stepActive,
  onStartCounting,
}: {
  unlocked: boolean
  secondsRemaining: number
  challengeTitle: string
  challengeMove: number
  steps: number
  stepGoal: number
  stepPercent: number
  stepActive: boolean
  onStartCounting: () => void
}) {
  const router = useRouter()

  return (
    <div className={`daily-challenge-notification ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="notification-badge">
        <Bell size={14} className="bell-ring" />
        <span>DAILY CHALLENGE</span>
      </div>

      <div className="notification-content">
        <div className="notification-text">
          <strong className="notification-title">{challengeTitle}</strong>
          <span className="notification-meta">
            <Footprints size={12} /> {steps.toLocaleString()} / {stepGoal.toLocaleString()} ({stepPercent}%)
            · <Zap size={12} fill="currentColor" style={{ color: '#eab308' }} /> +{challengeMove} MOVE
            · ⏱ {formatCountdown(secondsRemaining)}
          </span>
        </div>

        <div className="notification-progress-track">
          <div className="notification-progress-fill" style={{ width: `${stepPercent}%` }} />
        </div>
      </div>

      <div className="notification-actions">
        <button
          type="button"
          className="primary-button start-challenge-btn"
          onClick={stepActive || unlocked ? () => router.push('/challenges') : onStartCounting}
          title={stepActive ? 'Open challenge page' : 'Start counting steps for today\'s challenge'}
        >
          <Play size={13} fill="currentColor" />
          <span>{stepActive ? 'Continue' : 'Start'}</span>
        </button>
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

  // Live step counter from phone accelerometer
  const { steps, goal: stepGoal, percent: stepPercent, requestPermission, active: stepActive } = useStepCounter()

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
          steps={steps}
          stepGoal={stepGoal}
          stepPercent={stepPercent}
          stepActive={stepActive}
          onStartCounting={requestPermission}
        />

        <section className="stats-grid" style={{ marginTop: '1.25rem' }}>
          <StatCard icon={<Zap size={19} />} label="MOVE points" value={move.toLocaleString()} detail="+150 today" tone="lime" />
          <StatCard icon={<Flame size={19} />} label="Current streak" value={`${user?.streak ?? 7} days`} detail="2 days to badge" tone="orange" />
          <StatCard
            icon={<Footprints size={19} />}
            label="Steps today"
            value={steps.toLocaleString()}
            detail={`${stepPercent}% of ${stepGoal.toLocaleString()} goal`}
            tone="blue"
          />
          <Link href="/standings" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <StatCard icon={<Trophy size={19} />} label="Global rank" value={rankLabel} detail="↑ 6 places" tone="purple" />
          </Link>
        </section>

        <div className="home-quick-links">
          <Link href="/standings" className="outline-button">
            <Trophy size={15} /> Standings
          </Link>
          <Link href="/challenges" className="outline-button">
            <Target size={15} /> Challenges
          </Link>
          <Link href="/competitions" className="outline-button">
            Competitions
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
            ['Competitions', Trophy, '/competitions'],
            ['Rewards', Gift, '/rewards'],
          ] as const
        ).map(([label, Icon, path]) => (
          <Link className={label === 'Home' ? 'active' : ''} href={path} key={label}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </footer>
    </div>
  )
}
