'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, HeartHandshake, MapPin, MessageSquare, UserPlus, Users, X } from 'lucide-react'
import { getStoredToken } from '../../lib/api'
import { NearbyLiveMap } from '../../components/NearbyLiveMap'
import { AppChrome } from '../../components/AppChrome'

type Buddy = {
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

const NEARBY_BUDDIES: Buddy[] = [
  { id: 101, name: 'Maya Chen', distance: '0.2 mi away', activity: '5K Trail Run', level: 'Advanced', status: 'Active now', avatar: 'MC', color: '#ffd447' },
  { id: 102, name: 'Jordan Lee', distance: '0.4 mi away', activity: '10k Steps Walk', level: 'Intermediate', status: 'Walking nearby', avatar: 'JL', color: '#8bd4f4' },
  { id: 103, name: 'Sam Rivera', distance: '0.6 mi away', activity: 'Morning Stretch', level: 'Beginner', status: 'Ready for workout', avatar: 'SR', color: '#ff9a61' },
  { id: 104, name: 'Priya Nair', distance: '0.8 mi away', activity: 'Bike Circuit', level: 'Advanced', status: 'On bike trail', avatar: 'PN', color: '#b7e88f' },
]

export default function BuddiesPage() {
  const token = getStoredToken()
  const [inviteToast, setInviteToast] = useState('')
  const [inviteTarget, setInviteTarget] = useState<Buddy | null>(null)
  const [inviteMessage, setInviteMessage] = useState(DEFAULT_INVITE_MESSAGE)

  const openInvite = (buddy: Buddy) => {
    setInviteTarget(buddy)
    setInviteMessage(DEFAULT_INVITE_MESSAGE)
  }

  const closeInvite = () => {
    setInviteTarget(null)
  }

  const sendInvite = () => {
    if (!inviteTarget) return
    const message = inviteMessage.trim() || DEFAULT_INVITE_MESSAGE
    setInviteToast(`Invitation sent to ${inviteTarget.name}: "${message}"`)
    setInviteTarget(null)
    window.setTimeout(() => setInviteToast(''), 3500)
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
            <p className="subhead">Live map of nearby people plus workout buddies you can invite.</p>
          </div>
        </div>

        <div className="buddies-layout">
          <NearbyLiveMap token={token} variant="page" />

          <section className="side-card buddies-panel">
            <div className="section-heading compact" style={{ marginTop: 0 }}>
              <div>
                <p className="eyebrow">WORKOUT BUDDY FINDER</p>
                <h2>Nearby fitness buddies</h2>
              </div>
              <Users size={20} />
            </div>
            <p className="subhead" style={{ marginBottom: '1rem' }}>
              Connect for 10k walks, 5K runs, or gym sessions.
            </p>

            <ul className="buddies-list">
              {NEARBY_BUDDIES.map((buddy) => (
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
                  <button type="button" className="outline-button" onClick={() => openInvite(buddy)}>
                    <UserPlus size={14} /> Invite
                  </button>
                </li>
              ))}
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
            <p>Add a short note before you send the invite. You can edit the default message.</p>
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
              <button type="button" className="primary-button" onClick={sendInvite}>
                <UserPlus size={14} /> Send invite
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
            <strong>Workout Buddy Invited!</strong>
            <small>{inviteToast}</small>
          </span>
        </div>
      )}
    </div>
  )
}
