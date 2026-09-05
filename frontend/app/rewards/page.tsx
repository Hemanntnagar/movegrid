'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bolt,
  Check,
  Gift,
  LoaderCircle,
  Package,
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

function rewardTone(category: string) {
  const key = category.toLowerCase()
  if (key.includes('food') || key.includes('canteen')) return 'mint'
  if (key.includes('event')) return 'orange'
  if (key.includes('sport')) return 'blue'
  if (key.includes('sponsor')) return 'purple'
  return 'mint'
}

function RewardIcon({ category }: { category: string }) {
  const key = category.toLowerCase()
  if (key.includes('food') || key.includes('canteen')) return <Utensils size={28} />
  if (key.includes('event')) return <Ticket size={28} />
  if (key.includes('sport')) return <Trophy size={28} />
  if (key.includes('sponsor')) return <Gift size={28} />
  if (key.includes('merch')) return <ShoppingBag size={28} />
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
          {!available ? 'Unavailable' : !canAfford ? 'Not enough MOVE' : 'Redeem'}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmReward, setConfirmReward] = useState<ApiReward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [success, setSuccess] = useState<ApiRedeemResult | null>(null)

  const load = useCallback(async (authToken: string) => {
    const [me, catalog, redemptions] = await Promise.all([
      movegridApi.me(authToken),
      movegridApi.rewards(),
      movegridApi.rewardHistory(authToken),
    ])
    setUser(me)
    setRewards(catalog)
    setHistory(redemptions)
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
        setError(err instanceof Error ? err.message : 'Could not load rewards')
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [load, router])

  async function confirmRedeem() {
    if (!token || !confirmReward) return
    setRedeeming(true)
    setError('')
    try {
      const result = await movegridApi.redeemReward(token, confirmReward.id)
      setConfirmReward(null)
      setSuccess(result)
      await load(token)
      window.setTimeout(() => setSuccess(null), 3200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem reward')
      setConfirmReward(null)
    } finally {
      setRedeeming(false)
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
        <p>Loading MOVE store…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/fitness">Fitness</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/rewards" className="nav-active">
            Rewards
          </Link>
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

      <main className="main-content rewards-page">
        <div className="welcome">
          <div>
            <Link className="text-button" href="/">
              <ArrowLeft size={14} /> Back to campus
            </Link>
            <p className="eyebrow">MOVE STORE</p>
            <h1>
              Spend your MOVE, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p className="subhead">Campus rewards only — no real payment. Earn MOVE from fitness, spend it here.</p>
          </div>
          <div className="rewards-balance-badge">
            <Zap size={22} fill="currentColor" />
            <div>
              <strong>{user.total_points.toLocaleString()}</strong>
              <span>Current MOVE balance</span>
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <section className="section-heading compact">
          <div>
            <p className="eyebrow">CATALOG</p>
            <h2>Pick a reward</h2>
          </div>
        </section>
        <div className="rewards-grid">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              balance={user.total_points}
              onRedeem={setConfirmReward}
              busy={redeeming}
            />
          ))}
          {rewards.length === 0 && (
            <div className="fitness-empty">
              <Gift size={22} />
              <strong>No rewards listed yet</strong>
              <span>Check back after the next campus drop.</span>
            </div>
          )}
        </div>

        <section className="section-heading compact">
          <div>
            <p className="eyebrow">HISTORY</p>
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
                <span>{formatWhen(item.redeemed_at)} · {item.status}</span>
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
              {user.total_points.toLocaleString()}. This is an internal campus reward — no payment is charged.
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
        <div className="toast rewards-success-toast">
          <div>
            <Check size={18} />
          </div>
          <span>
            <strong>Redeemed!</strong>
            <small>
              {success.reward_title} · −{success.points_spent} MOVE · balance {success.total_points.toLocaleString()}
            </small>
          </span>
        </div>
      )}
    </div>
  )
}
