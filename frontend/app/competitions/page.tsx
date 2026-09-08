'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  LoaderCircle,
  ShieldCheck,
  Swords,
  Users,
  Zap,
} from 'lucide-react'
import {
  ApiCompetition,
  ApiUser,
  clearToken,
  getStoredToken,
  movegridApi,
} from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'

function PenguinMascot({ message = 'Pick a competition and jump in!' }: { message?: string }) {
  return (
    <div
      className="penguin-mascot-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'rgba(255,255,255,0.06)',
        padding: '0.6rem 0.9rem',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.72rem',
            color: '#38bdf8',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          <span>🐧 Pebble the Mascot</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#e2e8f0', fontStyle: 'italic' }}>&quot;{message}&quot;</p>
      </div>
    </div>
  )
}

function formatWhen(iso: string | null) {
  if (!iso) return 'Open-ended'
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusTone(status: string) {
  if (status === 'live') return 'lime'
  if (status === 'upcoming') return 'blue'
  return 'orange'
}

function CompetitionCard({
  competition,
  busyId,
  onParticipate,
}: {
  competition: ApiCompetition
  busyId: number | null
  onParticipate: (id: number) => void
}) {
  const busy = busyId === competition.id
  const joined = competition.is_participating
  const canJoin = competition.eligible && !joined && competition.status !== 'ended'

  return (
    <article className={`competition-card ${competition.status}`}>
      <div className="competition-card-top">
        <span className={`pill ${statusTone(competition.status)}`}>{competition.status}</span>
        {typeof competition.participant_count === 'number' && (
          <span className="competition-meta-inline">
            <Users size={14} /> {competition.participant_count} joined
          </span>
        )}
      </div>

      <h3>{competition.name}</h3>
      <p>{competition.description}</p>

      <dl className="competition-facts">
        <div>
          <dt>
            <ShieldCheck size={14} /> Eligibility
          </dt>
          <dd>{competition.eligibility}</dd>
        </div>
        <div>
          <dt>
            <Calendar size={14} /> Starts
          </dt>
          <dd>{formatWhen(competition.starts_at)}</dd>
        </div>
        <div>
          <dt>
            <Clock size={14} /> Ends
          </dt>
          <dd>{formatWhen(competition.ends_at)}</dd>
        </div>
      </dl>

      {!competition.eligible && !joined && competition.status !== 'ended' && (
        <p className="competition-hint">You don&apos;t meet eligibility yet — keep moving to unlock this one.</p>
      )}

      <div className="competition-actions">
        {joined ? (
          <button className="outline-button" disabled>
            <Check size={15} /> Participating
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={!canJoin || busy}
            onClick={() => onParticipate(competition.id)}
          >
            {busy ? <LoaderCircle className="spin" size={15} /> : <Swords size={15} />}
            {busy ? 'Joining…' : 'Participate'}
          </button>
        )}
      </div>
    </article>
  )
}

export default function CompetitionsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [items, setItems] = useState<ApiCompetition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const load = useCallback(async (authToken: string) => {
    const [me, list] = await Promise.all([movegridApi.me(authToken), movegridApi.competitions(authToken)])
    setUser(me)
    setItems(list)
  }, [])

  useEffect(() => {
    const stored = getStoredToken()
    if (!stored) {
      router.replace('/login')
      return
    }
    setToken(stored)
    setLoading(true)
    load(stored)
      .then(() => setError(''))
      .catch((err) => {
        clearToken()
        setError(err instanceof Error ? err.message : 'Could not load competitions')
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [load, router])

  async function participate(id: number) {
    if (!token) return
    setBusyId(id)
    setToast('')
    try {
      const result = await movegridApi.participateCompetition(token, id)
      setItems((prev) => prev.map((item) => (item.id === id ? result.competition : item)))
      setToast(`You're in — ${result.competition.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join competition')
    } finally {
      setBusyId(null)
    }
  }

  function logout() {
    clearToken()
    router.push('/login')
  }

  if (loading || !user) {
    return (
      <div className="app-shell fitness-loading">
        <LoaderCircle className="spin" size={28} />
        <p>Loading competitions…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AppChrome
        rightSlot={
          <>
            <div className="move-chip">
              <Zap size={14} fill="currentColor" />
              {user.total_points.toLocaleString()} MOVE
            </div>
            <button className="outline-button" onClick={logout}>
              Log out
            </button>
          </>
        }
      />

      <main className="main-content competitions-page">
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link className="text-button" href="/">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <p className="eyebrow">COMPETITIONS</p>
            <h1>
              Join the next move-off, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">Check eligibility, date, and time — then tap Participate to get in.</p>
          </div>
          <PenguinMascot message="Find a cup that fits your streak and jump in!" />
        </div>

        {toast && <p className="competition-toast">{toast}</p>}
        {error && <p className="form-error">{error}</p>}

        <section className="competition-grid">
          {items.map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition}
              busyId={busyId}
              onParticipate={participate}
            />
          ))}
          {items.length === 0 && (
            <div className="fitness-empty">
              <Swords size={22} />
              <strong>No competitions yet</strong>
              <span>Check back soon for the next cup.</span>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
