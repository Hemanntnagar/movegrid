'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  Gift,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Swords,
  Users,
  X,
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

function PenguinMascot({ message = 'Pick a competition or register your company to host one!' }: { message?: string }) {
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

function toDatetimeLocalString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

      {competition.company_name && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 800,
            marginTop: '8px',
            marginBottom: '4px',
            border: '1px solid #bae6fd',
          }}
        >
          <Building2 size={13} /> Hosted by {competition.company_name}
        </div>
      )}

      <h3 style={{ marginTop: competition.company_name ? '4px' : '8px' }}>{competition.name}</h3>
      <p>{competition.description}</p>

      {competition.reward && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fef3c7',
            color: '#92400e',
            border: '1.5px dashed #f59e0b',
            padding: '9px 13px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 800,
            margin: '12px 0 6px',
          }}
        >
          <Gift size={16} style={{ color: '#d97706', flexShrink: 0 }} />
          <span>
            <strong>Prize / Reward:</strong> {competition.reward}
          </span>
        </div>
      )}

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
          <button className="outline-button" disabled style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
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

  // Create Competition Modal state
  const [showModal, setShowModal] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [competitionName, setCompetitionName] = useState('')
  const [description, setDescription] = useState('')
  const [reward, setReward] = useState('')
  const [eligibility, setEligibility] = useState('Open to all members')
  const [startDate, setStartDate] = useState(() => toDatetimeLocalString(new Date()))
  const [endDate, setEndDate] = useState(() => toDatetimeLocalString(new Date(Date.now() + 14 * 86400000)))
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

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

  async function handleCreateCompetition(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) {
      setCreateError('Company / Host Name is required')
      return
    }
    if (!competitionName.trim()) {
      setCreateError('Competition Name is required')
      return
    }
    if (!reward.trim()) {
      setCreateError('Reward / Prize is required')
      return
    }

    setSubmitting(true)
    setCreateError('')

    try {
      const payload = {
        company_name: companyName.trim(),
        name: competitionName.trim(),
        description: description.trim(),
        reward: reward.trim(),
        eligibility: eligibility.trim() || 'Open to all members',
        starts_at: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        ends_at: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
      }

      const created = await movegridApi.createCompetition(payload, token)
      setItems((prev) => [created, ...prev])
      setToast(`🏆 Competition "${created.name}" registered by ${created.company_name}!`)
      setShowModal(false)

      // Reset form fields
      setCompanyName('')
      setCompetitionName('')
      setDescription('')
      setReward('')
      setEligibility('Open to all members')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create competition')
    } finally {
      setSubmitting(false)
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
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Link className="text-button" href="/">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <p className="eyebrow">MOVEGRID COMPETITIONS</p>
            <h1>
              Join or Host a Cup, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">Browse live cups, or register your company to sponsor a custom competition with prizes.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="primary-button"
              style={{
                fontSize: '13px',
                padding: '12px 20px',
                borderRadius: '12px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
              }}
              onClick={() => {
                setShowModal(true)
                setCreateError('')
              }}
            >
              <Plus size={17} /> Register Company & Host Competition
            </button>
            <PenguinMascot message="Companies can host competitions & offer rewards to top movers!" />
          </div>
        </div>

        {toast && <p className="competition-toast" style={{ marginBottom: '1rem' }}>{toast}</p>}
        {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

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
              <span>Be the first company to register and host a competition!</span>
            </div>
          )}
        </section>
      </main>

      {/* Register Company & Add Competition Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal"
            style={{ width: 'min(540px, 95vw)', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close-button"
              onClick={() => setShowModal(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ background: '#ecf5be', color: '#657a17', padding: '6px', borderRadius: '10px' }}>
                <Building2 size={20} />
              </div>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>COMPANY SPONSORSHIP</p>
                <h2 style={{ fontSize: '22px', margin: 0, color: 'var(--ink)' }}>Register New Competition</h2>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Fill in your company details, reward prize, eligibility, and dates to launch a competition on MOVEGRID.
            </p>

            {createError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, marginBottom: '14px' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCompetition} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Company Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                  Company / Host Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nike Fitness, TechCorp, RedBull"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Competition Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                  Competition Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nike 10K Step Showdown"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Reward / Prize */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                  Reward / Prize <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. $500 Gift Voucher + Exclusive Nike Badges"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Eligibility */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                  Eligibility Criteria
                </label>
                <input
                  type="text"
                  placeholder="e.g. Open to all members, 500+ MOVE points, 3+ day streak"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
                {/* Preset quick buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {['Open to all members', '500+ MOVE points', '3+ day streak', '1000+ MOVE & 5-day streak'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEligibility(preset)}
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '4px 9px',
                        borderRadius: '999px',
                        border: '1px solid #cbd5e1',
                        background: eligibility === preset ? '#ecf5be' : '#f8fafc',
                        color: eligibility === preset ? '#4d5d0f' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start and End Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '2px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '2px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '5px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the rules, goal, and challenge details for participants..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '2px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '11px 18px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                  style={{ padding: '11px 20px', fontSize: '12px' }}
                >
                  {submitting ? <LoaderCircle className="spin" size={16} /> : <Swords size={16} />}
                  {submitting ? 'Publishing...' : 'Publish Competition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
