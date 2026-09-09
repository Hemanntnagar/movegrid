'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell, Flame, Footprints, Gift, LayoutDashboard,
  Sparkles, Trophy, Zap
} from 'lucide-react'
import {
  ApiTodayFitness, ApiUser, clearToken, getStoredToken, movegridApi
} from '../lib/api'
import { AppChrome } from '../components/AppChrome'
import { DashboardPath } from '../components/DashboardPath'
import { useStepCounter } from '../hooks/useStepCounter'

function StatCard({ icon, label, value, detail, tone, badgeSymbol }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string; badgeSymbol?: string }) {
  return (
    <div className={`stat-card compact-stat-card ${tone}`}>
      {badgeSymbol && <span className="stat-badge-tag">{badgeSymbol}</span>}
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

export default function Page() {
  const pathname = usePathname()
  const [move, setMove] = useState(2480)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [, setFitness] = useState<ApiTodayFitness | null>(null)
  const [rankLabel, setRankLabel] = useState('#24')
  const [toast, setToast] = useState<string>('')

  // Live step counter from phone accelerometer
  const { steps, percent: stepPercent } = useStepCounter()

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
          <aside className="dashboard-sidebar-left">
            <div className="stats-vertical-stack">
              <StatCard icon={<Zap size={14} />} label="MOVE points" value={`${move.toLocaleString()}`} detail="+150 today!" tone="lime" badgeSymbol="⚡" />
              <StatCard icon={<Flame size={14} />} label="Current streak" value={`${user?.streak ?? 7} days`} detail="2 days to badge" tone="orange" badgeSymbol="🔥" />
              <StatCard
                icon={<Footprints size={14} />}
                label="Steps today"
                value={steps.toLocaleString()}
                detail={`${stepPercent}% of goal`}
                tone="blue"
                badgeSymbol="👟"
              />
              <Link href="/standings" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <StatCard icon={<Trophy size={14} />} label="Global rank" value={rankLabel} detail="↑ 6 places" tone="purple" badgeSymbol="🏆" />
              </Link>
            </div>
          </aside>

          <div className="dashboard-main-content">
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

      <footer className="centered-nav-bar">
        {(
          [
            ['Home', LayoutDashboard, '/'],
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
