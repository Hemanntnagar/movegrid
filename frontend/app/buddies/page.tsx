'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  MessageSquare,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { ApiBuddy, ApiBuddyInvite, ApiNearbyUser } from '../../lib/api'
import { getStoredToken, movegridApi } from '../../lib/api'
import { NearbyLiveMap } from '../../components/NearbyLiveMap'
import { AppChrome } from '../../components/AppChrome'

type NearbyBuddy = {
  id: number
  name: string
  distance: string
  activity: string
  level: string
  status: string
  avatar: string
  color: string
}

const DEFAULT_INVITE_MESSAGE = "Heyy!! Let's burn some calories."

function avatarColor(avatar: string, fallback = '#8bd4f4') {
  if (avatar.startsWith('initials:')) {
    const parts = avatar.split(':')
    if (parts[2]) return parts[2]
  }
  return fallback
}

function buddyFromNearby(person: ApiNearbyUser): NearbyBuddy {
  const color = avatarColor(person.avatar)
  const level =
    person.total_points >= 2000 ? 'Advanced' : person.total_points >= 1000 ? 'Intermediate' : 'Beginner'
  return {
    id: person.id,
    name: person.name,
    distance: person.distance_label === 'you' ? 'At your location' : person.distance_label,
    activity: `${person.total_points.toLocaleString()} MOVE · ${person.streak}-day streak`,
    level,
    status: 'Active nearby',
    avatar: person.initials,
    color,
  }
}

function connectedBuddyRow(buddy: ApiBuddy): NearbyBuddy {
  return {
    id: buddy.id,
    name: buddy.name,
    distance: 'Connected buddy',
    activity: `${buddy.total_points.toLocaleString()} MOVE · ${buddy.streak}-day streak`,
    level: buddy.fitness_level,
    status: 'Workout partner',
    avatar: buddy.initials,
    color: avatarColor(buddy.avatar),
  }
}

export default function BuddiesPage() {
  const token = getStoredToken()
  const [nearby, setNearby] = useState<NearbyBuddy[]>([])
  const [connected, setConnected] = useState<ApiBuddy[]>([])
  const [incoming, setIncoming] = useState<ApiBuddyInvite[]>([])
  const [pendingOutgoing, setPendingOutgoing] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(Boolean(token))
  const [actingId, setActingId] = useState<number | null>(null)
  const [inviteToast, setInviteToast] = useState('')
  const [inviteTarget, setInviteTarget] = useState<NearbyBuddy | null>(null)
  const [inviteMessage, setInviteMessage] = useState(DEFAULT_INVITE_MESSAGE)
  const [sendingInvite, setSendingInvite] = useState(false)

  const connectedIds = useMemo(() => new Set(connected.map((b) => b.id)), [connected])

  const refreshBuddies = useCallback(async () => {
    if (!token) {
      setConnected([])
      setIncoming([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [buddies, invites] = await Promise.all([
        movegridApi.listBuddies(token),
        movegridApi.buddyInvitesIncoming(token),
      ])
      setConnected(buddies)
      setIncoming(invites)
    } catch {
      setInviteToast('Could not load buddies. Try logging in again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refreshBuddies()
  }, [refreshBuddies])

  const handleNearbyUpdate = useCallback((payload: { nearby: ApiNearbyUser[]; me: ApiNearbyUser | null }) => {
    setNearby(payload.nearby.map(buddyFromNearby))
  }, [])

  const openInvite = (buddy: NearbyBuddy) => {
    setInviteTarget(buddy)
    setInviteMessage(DEFAULT_INVITE_MESSAGE)
  }

  const closeInvite = () => {
    setInviteTarget(null)
  }

  const sendInvite = async () => {
    if (!inviteTarget || !token) return
    const message = inviteMessage.trim() || DEFAULT_INVITE_MESSAGE
    setSendingInvite(true)
    try {
      const result = await movegridApi.sendBuddyInvite(token, inviteTarget.id, message)
      if (result.status === 'accepted') {
        setInviteToast(`You and ${inviteTarget.name} are connected!`)
        await refreshBuddies()
      } else {
        setPendingOutgoing((prev) => new Set(prev).add(inviteTarget.id))
        setInviteToast(`Invitation sent to ${inviteTarget.name}`)
      }
      setInviteTarget(null)
      window.setTimeout(() => setInviteToast(''), 4000)
    } catch (err) {
      setInviteToast(err instanceof Error ? err.message : 'Could not send invite')
      window.setTimeout(() => setInviteToast(''), 4000)
    } finally {
      setSendingInvite(false)
    }
  }

  const acceptInvite = async (invite: ApiBuddyInvite) => {
    if (!token) return
    setActingId(invite.id)
    try {
      await movegridApi.acceptBuddyInvite(token, invite.id)
      setInviteToast(`Connected with ${invite.from_user.name}!`)
      await refreshBuddies()
      window.setTimeout(() => setInviteToast(''), 4000)
    } catch (err) {
      setInviteToast(err instanceof Error ? err.message : 'Could not accept invite')
    } finally {
      setActingId(null)
    }
  }

  const declineInvite = async (invite: ApiBuddyInvite) => {
    if (!token) return
    setActingId(invite.id)
    try {
      await movegridApi.declineBuddyInvite(token, invite.id)
      await refreshBuddies()
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="app-shell">
      <AppChrome
        rightSlot={
          <Link href="/" className="outline-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={15} /> Back
          </Link>
        }
      />

      <main className="main-content map-page-main">
        <div className="welcome map-welcome">
          <div>
            <p className="eyebrow">
              <Users size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> BUDDIES
            </p>
            <h1>
              Find movers <span>near you.</span>
            </h1>
            <p className="subhead">Invite nearby movers — when they accept, you&apos;re connected workout buddies.</p>
          </div>
        </div>

        <div className="buddies-layout">
          <NearbyLiveMap token={token} variant="page" onNearbyUpdate={handleNearbyUpdate} />

          <section className="side-card buddies-panel">
            {loading ? (
              <p className="subhead" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LoaderCircle size={16} className="spin" /> Loading buddies…
              </p>
            ) : null}

            {incoming.length > 0 && (
              <>
                <div className="section-heading compact" style={{ marginTop: 0 }}>
                  <div>
                    <p className="eyebrow">INCOMING</p>
                    <h2>Buddy invites</h2>
                  </div>
                </div>
                <ul className="buddies-list" style={{ marginBottom: '1.25rem' }}>
                  {incoming.map((invite) => (
                    <li key={invite.id}>
                      <div
                        className="mini-avatar"
                        style={{
                          background: avatarColor(invite.from_user.avatar),
                          width: 40,
                          height: 40,
                          fontSize: 12,
                        }}
                      >
                        {invite.from_user.initials}
                      </div>
                      <div>
                        <strong>{invite.from_user.name}</strong>
                        <small>&ldquo;{invite.message}&rdquo;</small>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={actingId === invite.id}
                          onClick={() => acceptInvite(invite)}
                        >
                          {actingId === invite.id ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}
                          Accept
                        </button>
                        <button
                          type="button"
                          className="outline-button"
                          disabled={actingId === invite.id}
                          onClick={() => declineInvite(invite)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="section-heading compact" style={{ marginTop: 0 }}>
              <div>
                <p className="eyebrow">YOUR SQUAD</p>
                <h2>Connected buddies</h2>
              </div>
              <HeartHandshake size={20} />
            </div>
            <ul className="buddies-list" style={{ marginBottom: '1.25rem' }}>
              {connected.length === 0 ? (
                <li className="buddies-empty-hint">
                  <small>No connections yet — send an invite to someone nearby.</small>
                </li>
              ) : (
                connected.map((buddy) => {
                  const row = connectedBuddyRow(buddy)
                  return (
                    <li key={buddy.id}>
                      <div className="mini-avatar" style={{ background: row.color, width: 40, height: 40, fontSize: 12 }}>
                        {row.avatar}
                      </div>
                      <div>
                        <strong>{row.name}</strong>
                        <small>
                          {row.activity} · {row.level}
                        </small>
                        <small className="buddy-status">{row.status}</small>
                      </div>
                      <span className="challenge-status-chip success">
                        <Check size={12} /> Connected
                      </span>
                    </li>
                  )
                })
              )}
            </ul>

            <div className="section-heading compact">
              <div>
                <p className="eyebrow">NEARBY</p>
                <h2>Fitness buddies</h2>
              </div>
              <Users size={20} />
            </div>
            <p className="subhead" style={{ marginBottom: '1rem' }}>
              Connect for 10k walks, 5K runs, or gym sessions.
            </p>

            <ul className="buddies-list">
              {nearby.length === 0 ? (
                <li className="buddies-empty-hint">
                  <small>Share location on the map to see movers within ~800 m.</small>
                </li>
              ) : (
                nearby.map((buddy) => {
                  const isConnected = connectedIds.has(buddy.id)
                  const isPending = pendingOutgoing.has(buddy.id)
                  return (
                    <li key={buddy.id}>
                      <div className="mini-avatar" style={{ background: buddy.color, width: 40, height: 40, fontSize: 12 }}>
                        {buddy.avatar}
                      </div>
                      <div>
                        <strong>{buddy.name}</strong>
                        <small>
                          <MapPin size={11} /> {buddy.distance} · {buddy.activity}
                        </small>
                        <small className="buddy-status">{buddy.status} · {buddy.level}</small>
                      </div>
                      {isConnected ? (
                        <span className="challenge-status-chip success">
                          <Check size={12} /> Connected
                        </span>
                      ) : isPending ? (
                        <span className="challenge-status-chip active">Invite sent</span>
                      ) : (
                        <button type="button" className="outline-button" onClick={() => openInvite(buddy)}>
                          <UserPlus size={14} /> Invite
                        </button>
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          </section>
        </div>
      </main>

      {inviteTarget && (
        <div className="modal-backdrop" onClick={closeInvite}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeInvite} aria-label="Close">
              <X size={18} />
            </button>
            <div className="modal-kicker">
              <MessageSquare size={15} /> WORKOUT INVITE
            </div>
            <h2>Invite {inviteTarget.name}</h2>
            <p>They&apos;ll get a notification here and can accept to connect as buddies.</p>
            <label className="invite-message-label" htmlFor="invite-message">
              Message
            </label>
            <textarea
              id="invite-message"
              className="invite-message-input"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={3}
              maxLength={200}
              autoFocus
            />
            <div className="invite-message-actions">
              <button type="button" className="outline-button" onClick={closeInvite}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={() => void sendInvite()} disabled={sendingInvite}>
                {sendingInvite ? <LoaderCircle size={14} className="spin" /> : <UserPlus size={14} />}
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteToast && (
        <div className="toast" style={{ background: '#0284c7', color: '#fff' }}>
          <div>
            <HeartHandshake size={18} />
          </div>
          <span>
            <strong>Buddies</strong>
            <small>{inviteToast}</small>
          </span>
        </div>
      )}
    </div>
  )
}
