'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowRight, Bell, Flame, Gift, LayoutDashboard, Lock,
  Target, Trophy, Unlock, Users, Zap
} from 'lucide-react'
import {
  ApiTodayFitness, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { AppChrome } from '../components/AppChrome'
import { DashboardPath } from '../components/DashboardPath'

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

export default function Page() {
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
    </div>
  )
}
