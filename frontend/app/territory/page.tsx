'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Crosshair, Sparkles, Zap } from 'lucide-react'
import type { ApiTerritoryState } from '../../lib/api'
import { getStoredToken } from '../../lib/api'
import { AppChrome } from '../../components/AppChrome'
import { MobileBottomNav } from '../../components/MobileBottomNav'
import { TerritoryLiveMap, TerritoryPlayButton } from '../../components/TerritoryLiveMap'

export default function TerritoryPage() {
  const token = getStoredToken()
  const [playing, setPlaying] = useState(false)
  const [state, setState] = useState<ApiTerritoryState | null>(null)

  return (
    <div className="app-shell">
      <AppChrome />

      <main className="main-content territory-page">
        <div className="welcome page-hero territory-hero">
          <div>
            <Link className="text-button hide-on-mobile" href="/">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <p className="eyebrow">MOVEGRID · LIVE GAME</p>
            <h1>
              Grid Claim <span>the streets.</span>
            </h1>
            <p className="subhead">
              Full live map. Walk to paint turf as yours. If another mover overlaps your patch, that slice flips to them.
            </p>
          </div>
          <div className="territory-hero-actions">
            {state && state.points_awarded > 0 && (
              <div className="move-chip">
                <Zap size={14} fill="currentColor" /> +{state.points_awarded} MOVE
              </div>
            )}
            <TerritoryPlayButton
              playing={playing}
              disabled={!token}
              onToggle={() => setPlaying((value) => !value)}
            />
          </div>
        </div>

        {!token && (
          <p className="territory-signin-hint">
            <Sparkles size={14} /> Sign in to claim live cells. You can still preview the map.
          </p>
        )}

        {playing && (
          <div className="territory-live-banner">
            <Crosshair size={14} /> Claiming is live — keep moving. Overlap a rival and take their ground.
          </div>
        )}

        <TerritoryLiveMap token={token} playing={playing && Boolean(token)} onState={setState} />
      </main>

      <MobileBottomNav />
    </div>
  )
}
