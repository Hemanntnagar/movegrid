'use client'

import Link from 'next/link'
import { ArrowLeft, Bolt, MapPinned } from 'lucide-react'
import { getStoredToken } from '../../lib/api'
import { NearbyLiveMap } from '../../components/NearbyLiveMap'

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

export default function MapPage() {
  const token = getStoredToken()

  return (
    <div className="app-shell map-shell">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/fitness">Fitness</Link>
          <Link className="nav-active" href="/map">
            Map
          </Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/rewards">Rewards</Link>
        </nav>
        <div className="top-actions">
          <Link href="/" className="outline-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={15} /> Back
          </Link>
        </div>
      </header>

      <main className="main-content map-page-main">
        <div className="welcome map-welcome">
          <div>
            <p className="eyebrow">
              <MapPinned size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> CAMPUS LIVE MAP
            </p>
            <h1>
              See movers <span>around you.</span>
            </h1>
            <p className="subhead">Your icon tracks your live GPS. Nearby students appear as they share location.</p>
          </div>
        </div>

        <NearbyLiveMap token={token} variant="page" />
      </main>
    </div>
  )
}
