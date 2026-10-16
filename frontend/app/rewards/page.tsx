'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Gift,
  LoaderCircle,
  Package,
  QrCode,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trophy,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import {
  ApiRedeemResult,
  ApiReward,
  ApiRewardRedemption,
  ApiUser,
  clearToken,
  getStoredToken,
  movegridApi,
  notifyUserUpdated,
  peekMeCache,
  seedMeCache,
} from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'
import { MobileBottomNav } from '../../components/MobileBottomNav'

function PenguinMascot({ message = 'Treat yourself! You earned these MOVE rewards!' }: { message?: string }) {
  return (
    <div className="penguin-mascot-container reward-mascot">
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
        <div className="reward-mascot-label">Pebble the Mascot</div>
        <p className="reward-mascot-quote">&quot;{message}&quot;</p>
      </div>
    </div>
  )
}

function rewardTone(category: string) {
  const key = category.toLowerCase()
  if (key.includes('food') || key.includes('canteen') || key.includes('dining') || key.includes('smoothie')) return 'mint'
  if (key.includes('event')) return 'orange'
  if (key.includes('sport') || key.includes('gym')) return 'blue'
  if (key.includes('sponsor') || key.includes('merch') || key.includes('gear')) return 'purple'
  return 'mint'
}

function RewardIcon({ category }: { category: string }) {
  const key = category.toLowerCase()
  if (key.includes('food') || key.includes('canteen') || key.includes('dining') || key.includes('smoothie')) return <Utensils size={28} />
  if (key.includes('event')) return <Ticket size={28} />
  if (key.includes('sport') || key.includes('gym')) return <Trophy size={28} />
  if (key.includes('sponsor')) return <Gift size={28} />
  if (key.includes('merch') || key.includes('gear')) return <ShoppingBag size={28} />
  return <Package size={28} />
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isAuthFailure(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  return /unauthor|invalid authentication|not authenticated|token/i.test(message)
}

function RewardCard({
  reward,
  balance,
  onRedeem,
  busy,
}: {
  reward: ApiReward
  balance: number
  onRedeem: (reward: ApiReward) => void
  busy: boolean
}) {
  const available = reward.stock > 0
  const canAfford = balance >= reward.points_required
  const disabled = !available || !canAfford || busy

  return (
    <article className={`reward-store-card ${rewardTone(reward.category)} ${!available ? 'sold-out' : ''}`}>
      <div className="reward-store-visual">
        <RewardIcon category={reward.category} />
      </div>
      <div className="reward-store-body">
        <div className="reward-store-top">
          <span className="pill lime">{reward.category}</span>
          <span className="move-value">
            <Zap size={14} fill="currentColor" /> {reward.points_required.toLocaleString()} MOVE
          </span>
        </div>
        <h3>{reward.title}</h3>
        <p>{reward.description}</p>
        <div className="mission-meta">
          <span>
            <Package size={14} /> {available ? `${reward.stock} in stock` : 'Out of stock'}
          </span>
          {!canAfford && available && <span>Need {(reward.points_required - balance).toLocaleString()} more MOVE</span>}
        </div>
        <button className="primary-button full" disabled={disabled} onClick={() => onRedeem(reward)}>
          {!available ? 'Unavailable' : !canAfford ? 'Not enough MOVE' : 'Redeem reward'}
        </button>
      </div>
    </article>
  )
}

export default function RewardsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [rewards, setRewards] = useState<ApiReward[]>([])
  const [history, setHistory] = useState<ApiRewardRedemption[]>([])
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmReward, setConfirmReward] = useState<ApiReward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [success, setSuccess] = useState<ApiRedeemResult | null>(null)

  const load = useCallback(async (authToken: string, opts?: { forceMe?: boolean }) => {
    const [me, catalog, redemptions] = await Promise.all([
      movegridApi.me(authToken, { force: Boolean(opts?.forceMe) }),
      movegridApi.rewards(),
      movegridApi.rewardHistory(authToken),
    ])
    setUser(me)
    setRewards(catalog)
    setHistory(redemptions.items)
  }, [])

  useEffect(() => {
    const stored = getStoredToken()
    if (!stored) {
      setLoading(false)
      router.replace('/login')
      return
    }
    setToken(stored)
    const cached = peekMeCache(stored)
    if (cached) setUser(cached)

    let cancelled = false
    load(stored)
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Could not load rewards'
        setError(message)
        if (isAuthFailure(err)) {
          clearToken()
          setUser(null)
          router.replace('/login')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load, router])

  const filteredRewards = useMemo(() => {
    if (categoryFilter === 'All') return rewards
    return rewards.filter((r) => r.category.toLowerCase().includes(categoryFilter.toLowerCase()))
  }, [rewards, categoryFilter])

  async function confirmRedeem() {
    if (!token || !confirmReward || !user) return
    setRedeeming(true)
    setError('')
    try {
      const result = await movegridApi.redeemReward(token, confirmReward.id)
      const nextUser = { ...user, total_points: result.total_points }
      seedMeCache(token, nextUser)
      setUser(nextUser)
      notifyUserUpdated({ total_points: result.total_points })
      setConfirmReward(null)
      setSuccess(result)
      setRewards((prev) =>
        prev.map((item) =>
          item.id === result.reward_id ? { ...item, stock: result.stock_remaining } : item,
        ),
      )
      await load(token, { forceMe: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem reward')
      setConfirmReward(null)
      if (isAuthFailure(err)) {
        clearToken()
        setUser(null)
        router.replace('/login')
      }
    } finally {
      setRedeeming(false)
    }
  }

  function logout() {
    clearToken()
    router.push('/login')
  }

  function retryLoad() {
    const stored = getStoredToken()
    if (!stored) {
      router.replace('/login')
      return
    }
    setError('')
    setLoading(true)
    load(stored, { forceMe: true })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Could not load rewards'
        setError(message)
        if (isAuthFailure(err)) {
          clearToken()
          setUser(null)
          router.replace('/login')
        }
      })
      .finally(() => setLoading(false))
  }

  if (loading && !user) {
    return (
      <div className="app-shell fitness-loading">
        <LoaderCircle className="spin" size={28} />
        <p>Loading MOVE store…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell fitness-loading">
        <Gift size={28} />
        <p>{error || 'This page couldn’t load the reward store.'}</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="primary-button" onClick={retryLoad}>
            Try again
          </button>
          <button type="button" className="outline-button" onClick={() => router.push('/login')}>
            Sign in
          </button>
        </div>
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
            <button type="button" className="outline-button hide-on-mobile" onClick={logout}>
              Log out
            </button>
          </>
        }
      />

      <main className="main-content rewards-page">
        <div className="welcome page-hero" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link className="text-button hide-on-mobile" href="/">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <p className="eyebrow">MOVE REWARD STORE</p>
            <h1>
              Spend your MOVE, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">Trade your movement and fitness points for healthy drinks, gear, and passes.</p>
          </div>
          <div className="rewards-balance-badge" aria-live="polite">
            <Zap size={22} fill="currentColor" />
            <div>
              <strong>{user.total_points.toLocaleString()}</strong>
              <span>MOVE balance</span>
            </div>
          </div>
          <PenguinMascot message="Spend your hard-earned MOVE on awesome rewards!" />
        </div>

        {error && <p className="form-error">{error}</p>}

        <section className="section-heading compact rewards-catalog-heading">
          <div>
            <p className="eyebrow">REWARD CATALOG</p>
            <h2>Pick your perk</h2>
          </div>
          <div className="rewards-filter-row" role="tablist" aria-label="Reward categories">
            {['All', 'Food', 'Events', 'Sports', 'Merch'].map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={categoryFilter === cat}
                className={`pill ${categoryFilter === cat ? 'lime' : 'neutral'}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <div className="rewards-grid">
          {filteredRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              balance={user.total_points}
              onRedeem={setConfirmReward}
              busy={redeeming}
            />
          ))}
          {filteredRewards.length === 0 && (
            <div className="fitness-empty">
              <Gift size={22} />
              <strong>No rewards found in this category</strong>
              <span>Try selecting another category or check back later.</span>
            </div>
          )}
        </div>

        <section className="section-heading compact" style={{ marginTop: '2rem' }}>
          <div>
            <p className="eyebrow">RETIRED & REDEEMED</p>
            <h2>Your redemptions</h2>
          </div>
        </section>
        <div className="rewards-history">
          {history.length === 0 && (
            <div className="rewards-history-empty">
              <ShoppingBag size={18} />
              <span>No redemptions yet — your first swap will show up here.</span>
            </div>
          )}
          {history.map((item) => (
            <div className="rewards-history-row" key={item.id}>
              <div className="rewards-history-icon">
                <RewardIcon category={item.reward?.category ?? 'General'} />
              </div>
              <div>
                <strong>{item.reward?.title ?? `Reward #${item.reward_id}`}</strong>
                <span>
                  {formatWhen(item.redeemed_at)} · {item.status}
                </span>
              </div>
              <b>−{item.points_spent.toLocaleString()} MOVE</b>
            </div>
          ))}
        </div>
      </main>

      {confirmReward && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="close-button" onClick={() => setConfirmReward(null)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="modal-kicker">
              <Gift size={15} /> CONFIRM REDEMPTION
            </div>
            <h2>{confirmReward.title}</h2>
            <p>
              Spend {confirmReward.points_required.toLocaleString()} MOVE from your balance of{' '}
              {user.total_points.toLocaleString()}.
            </p>
            <div className="modal-panel">
              <Zap size={22} />
              <div>
                <strong>New balance preview</strong>
                <span>
                  {(user.total_points - confirmReward.points_required).toLocaleString()} MOVE after redeem
                </span>
              </div>
            </div>
            <button className="primary-button full" disabled={redeeming} onClick={confirmRedeem}>
              {redeeming ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
              {redeeming ? 'Redeeming…' : 'Confirm redeem'}
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="modal-backdrop">
          <div className="modal" style={{ textAlign: 'center' }}>
            <button className="close-button" onClick={() => setSuccess(null)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="modal-kicker" style={{ justifyContent: 'center' }}>
              <Sparkles size={15} /> VOUCHER UNLOCKED
            </div>
            <h2>{success.reward_title}</h2>
            <p>Show this digital voucher code at the partner store or venue.</p>
            <div className="qr-panel" style={{ margin: '1rem 0' }}>
              <div className="qr-art">
                <QrCode size={110} />
              </div>
              <strong>VOUCHER #{success.redemption_id}-MOVEGRID</strong>
              <span>Redeemed for {success.points_spent} MOVE</span>
            </div>
            <button className="primary-button full" onClick={() => setSuccess(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}
