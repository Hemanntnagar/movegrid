'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeatureGroup, Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import { LoaderCircle, MapPin, Navigation, Pause, Play, Swords, Users } from 'lucide-react'
import type { ApiTerritoryCell, ApiTerritoryPlayer, ApiTerritoryState } from '../lib/api'
import { getStoredToken, movegridApi } from '../lib/api'

type GeoStatus = 'idle' | 'locating' | 'live' | 'denied' | 'error'

const FALLBACK_ORIGIN = { latitude: 12.9716, longitude: 77.5946 }
const DEFAULT_ZOOM = 17
const CLAIM_RADIUS_M = 900

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pinHtml(player: ApiTerritoryPlayer) {
  const label = escapeHtml(player.is_you ? 'YOU' : player.initials)
  return `
    <div class="mg-pin ${player.is_you ? 'is-you' : ''}">
      <span class="mg-pin-pulse"></span>
      <div class="mg-pin-avatar" style="background:${player.color}">
        ${escapeHtml(player.initials)}
      </div>
      <span class="mg-pin-label">${label}</span>
    </div>
  `
}

function cellBounds(cell: ApiTerritoryCell, cellDeg: number): [[number, number], [number, number]] {
  return [
    [cell.y * cellDeg, cell.x * cellDeg],
    [(cell.y + 1) * cellDeg, (cell.x + 1) * cellDeg],
  ]
}

function formatArea(m2: number) {
  if (m2 >= 10_000) return `${(m2 / 1_000_000).toFixed(2)} km²`
  return `${m2.toLocaleString()} m²`
}

type TerritoryLiveMapProps = {
  token?: string | null
  playing: boolean
  onState?: (state: ApiTerritoryState) => void
}

export function TerritoryLiveMap({ token, playing, onState }: TerritoryLiveMapProps) {
  const authToken = token ?? getStoredToken()
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN)
  const [state, setState] = useState<ApiTerritoryState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const cellsLayerRef = useRef<FeatureGroup | null>(null)
  const markersRef = useRef<Map<number | 'me', LeafletMarker>>(new Map())
  const trailRef = useRef<{ latitude: number; longitude: number }[]>([])
  const originRef = useRef(origin)
  const playingRef = useRef(playing)
  const claimingRef = useRef(false)
  const hasCenteredRef = useRef(false)
  originRef.current = origin
  playingRef.current = playing

  const applyState = useCallback(
    (next: ApiTerritoryState) => {
      setState(next)
      onState?.(next)
    },
    [onState],
  )

  const refreshState = useCallback(
    async (lat: number, lng: number) => {
      try {
        const data = await movegridApi.territoryState(lat, lng, authToken, CLAIM_RADIUS_M)
        applyState(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the live grid')
      }
    },
    [applyState, authToken],
  )

  const claimHere = useCallback(
    async (lat: number, lng: number) => {
      if (!authToken || !playingRef.current || claimingRef.current) return
      claimingRef.current = true
      try {
        const trail = trailRef.current.slice(-8)
        const data = await movegridApi.claimTerritory(authToken, {
          latitude: lat,
          longitude: lng,
          trail,
          is_playing: true,
        })
        applyState(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not claim this ground')
      } finally {
        claimingRef.current = false
      }
    },
    [applyState, authToken],
  )

  useEffect(() => {
    let cancelled = false
    let mapInstance: LeafletMap | null = null

    async function boot() {
      const el = mapElRef.current
      if (!el) return
      el.innerHTML = ''
      Reflect.deleteProperty(el, '_leaflet_id')

      const L = await import('leaflet')
      if (cancelled || mapElRef.current !== el) return

      leafletRef.current = L
      mapInstance = L.map(el, {
        zoomControl: true,
        attributionControl: true,
      }).setView([FALLBACK_ORIGIN.latitude, FALLBACK_ORIGIN.longitude], DEFAULT_ZOOM)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapInstance)

      cellsLayerRef.current = L.featureGroup().addTo(mapInstance)
      mapRef.current = mapInstance
      hasCenteredRef.current = false
      requestAnimationFrame(() => {
        if (!cancelled && mapInstance) {
          mapInstance.invalidateSize()
          setMapReady(true)
        }
      })
    }

    void boot()

    return () => {
      cancelled = true
      setMapReady(false)
      markersRef.current.forEach((marker) => {
        try {
          marker.remove()
        } catch {
          /* ignore */
        }
      })
      markersRef.current.clear()
      try {
        mapInstance?.remove()
      } catch {
        /* ignore */
      }
      mapRef.current = null
      leafletRef.current = null
      cellsLayerRef.current = null
      if (mapElRef.current) mapElRef.current.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    const layer = cellsLayerRef.current
    if (!mapReady || !map || !L || !layer || !state) return

    layer.clearLayers()
    const colorByOwner = new Map(state.players.map((player) => [player.id, player.color]))
    for (const cell of state.cells) {
      const color = colorByOwner.get(cell.owner_id) ?? '#94a3b8'
      L.rectangle(cellBounds(cell, state.cell_deg), {
        color,
        weight: 1,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: 0.38,
      }).addTo(layer)
    }

    const nextIds = new Set<number | 'me'>()
    const upsert = (key: number | 'me', player: ApiTerritoryPlayer) => {
      nextIds.add(key)
      const icon = L.divIcon({
        className: 'mg-leaflet-icon',
        html: pinHtml(player),
        iconSize: [52, 64],
        iconAnchor: [26, 52],
      })
      const existing = markersRef.current.get(key)
      try {
        if (existing) {
          existing.setLatLng([player.latitude, player.longitude])
          existing.setIcon(icon)
          existing.setZIndexOffset(player.is_you ? 1000 : 0)
        } else {
          const marker = L.marker([player.latitude, player.longitude], {
            icon,
            zIndexOffset: player.is_you ? 1000 : 0,
            title: player.is_you ? `${player.name} (you)` : player.name,
          }).addTo(map)
          markersRef.current.set(key, marker)
        }
      } catch {
        markersRef.current.delete(key)
      }
    }

    state.players.forEach((player) => upsert(player.is_you ? 'me' : player.id, player))
    if (!state.players.some((player) => player.is_you)) {
      upsert('me', {
        id: -1,
        name: 'You',
        initials: 'YO',
        color: '#f472b6',
        latitude: origin.latitude,
        longitude: origin.longitude,
        cell_count: 0,
        area_m2: 0,
        is_you: true,
      })
    }

    markersRef.current.forEach((marker, key) => {
      if (!nextIds.has(key)) {
        try {
          marker.remove()
        } catch {
          /* ignore */
        }
        markersRef.current.delete(key)
      }
    })

    if (!hasCenteredRef.current) {
      try {
        map.setView([origin.latitude, origin.longitude], DEFAULT_ZOOM, { animate: true })
        hasCenteredRef.current = true
      } catch {
        /* map not ready */
      }
    }
  }, [mapReady, origin.latitude, origin.longitude, state])

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Geolocation is not supported in this browser.')
      setOrigin(FALLBACK_ORIGIN)
      void refreshState(FALLBACK_ORIGIN.latitude, FALLBACK_ORIGIN.longitude)
      return
    }

    setStatus('locating')
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        trailRef.current = [...trailRef.current.slice(-10), next]
        setOrigin(next)
        setStatus('live')
        if (playingRef.current) void claimHere(next.latitude, next.longitude)
        else void refreshState(next.latitude, next.longitude)
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setStatus('denied')
          setError('Location permission denied. Showing a default city preview.')
        } else {
          setStatus('error')
          setError('Could not read live GPS. Showing a default city preview.')
        }
        setOrigin(FALLBACK_ORIGIN)
        void refreshState(FALLBACK_ORIGIN.latitude, FALLBACK_ORIGIN.longitude)
      },
      { enableHighAccuracy: true, maximumAge: 4_000, timeout: 12_000 },
    )

    const poll = window.setInterval(() => {
      const current = originRef.current
      if (playingRef.current) void claimHere(current.latitude, current.longitude)
      else void refreshState(current.latitude, current.longitude)
    }, 4_000)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(poll)
    }
  }, [claimHere, refreshState])

  useEffect(() => {
    if (playing) void claimHere(originRef.current.latitude, originRef.current.longitude)
  }, [playing, claimHere])

  const rivals = state?.players.filter((player) => !player.is_you) ?? []
  const me = state?.me
  const statusLabel =
    status === 'live' ? 'Live GPS' : status === 'locating' ? 'Locating…' : status === 'denied' ? 'Permission needed' : 'Preview area'

  return (
    <div className="territory-map nearby-map nearby-map-page">
      <div className="nearby-map-label">
        <span>
          LIVE GRID{' '}
          <em>
            <span className={`live-dot ${status === 'live' ? 'on' : ''}`} /> {rivals.length} rivals in range
          </em>
        </span>
        <span className="nearby-status">{statusLabel}</span>
      </div>

      <div className="nearby-map-stage territory-map-stage">
        {status === 'locating' && (
          <div className="nearby-map-overlay">
            <LoaderCircle size={18} className="spin" /> Reading your live location…
          </div>
        )}
        <div ref={mapElRef} className="nearby-leaflet territory-leaflet" role="img" aria-label="Live territory map" />
      </div>

      <div className="territory-hud">
        <div>
          <small>Your turf</small>
          <strong>{formatArea(me?.area_m2 ?? 0)}</strong>
        </div>
        <div>
          <small>Cells held</small>
          <strong>{me?.cell_count ?? 0}</strong>
        </div>
        <div>
          <small>Just taken</small>
          <strong>
            +{state?.captured ?? 0}
            {state && state.stolen > 0 ? ` · ${state.stolen} stolen` : ''}
          </strong>
        </div>
      </div>

      <div className="nearby-map-footer">
        <span>
          <Navigation size={14} /> {status === 'live' ? 'Painting from your live GPS' : 'Centered on a preview city'}
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            mapRef.current?.setView([origin.latitude, origin.longitude], DEFAULT_ZOOM, { animate: true })
            if (playing) void claimHere(origin.latitude, origin.longitude)
            else void refreshState(origin.latitude, origin.longitude)
          }}
        >
          Recenter
        </button>
      </div>

      <div className="nearby-people">
        <div className="nearby-people-head">
          <Users size={15} />
          <strong>Who owns what</strong>
        </div>
        {error && <p className="nearby-error">{error}</p>}
        {!state?.players.length && !error && <p className="nearby-empty">Walk to stamp the first cells on this map.</p>}
        <ul className="nearby-people-list">
          {state?.players.map((player) => (
            <li key={player.id} className={player.is_you ? 'is-you' : ''}>
              <div className="mini-avatar" style={{ background: player.color }}>
                {player.initials}
              </div>
              <div>
                <strong>
                  {player.name}
                  {player.is_you ? ' (you)' : ''}
                </strong>
                <small>
                  <MapPin size={11} /> {formatArea(player.area_m2)} · {player.cell_count} cells
                </small>
              </div>
              <b>{player.is_you ? 'YOURS' : 'RIVAL'}</b>
            </li>
          ))}
        </ul>
        <p className="nearby-hint">
          <Swords size={12} /> Cover ground to claim it. Walk over someone else’s patch and that slice flips to you.
        </p>
        {!authToken && <p className="nearby-hint">Sign in to start claiming live turf.</p>}
      </div>
    </div>
  )
}

export function TerritoryPlayButton({
  playing,
  disabled,
  onToggle,
}: {
  playing: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button type="button" className="primary-button" disabled={disabled} onClick={onToggle}>
      {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
      {playing ? 'Pause claiming' : 'Start claiming'}
    </button>
  )
}
