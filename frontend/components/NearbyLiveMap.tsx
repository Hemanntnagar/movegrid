'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LoaderCircle, MapPin, Navigation, Users } from 'lucide-react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import { ApiNearbyUser, getStoredToken, movegridApi } from '../lib/api'

type GeoStatus = 'idle' | 'locating' | 'live' | 'denied' | 'error'

const FALLBACK_ORIGIN = { latitude: 40.7128, longitude: -74.006 }
const DEFAULT_ZOOM = 17

function avatarColor(avatar: string, fallbackIndex: number) {
  if (avatar.startsWith('initials:')) {
    const parts = avatar.split(':')
    if (parts[2]) return parts[2]
  }
  const palette = ['#ffd447', '#ff9a61', '#8bd4f4', '#f3a8c7', '#b7e88f', '#c7b6f5']
  return palette[fallbackIndex % palette.length]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pinHtml(person: ApiNearbyUser, color: string, isYou: boolean) {
  const label = escapeHtml(isYou ? 'YOU' : person.distance_label)
  const initials = escapeHtml(person.initials)
  return `
    <div class="mg-pin ${isYou ? 'is-you' : ''}">
      <span class="mg-pin-pulse"></span>
      <div class="mg-pin-avatar" style="background:${color}">
        ${initials}
      </div>
      <span class="mg-pin-label">${label}</span>
    </div>
  `
}

type NearbyLiveMapProps = {
  token?: string | null
  variant?: 'sidebar' | 'page'
}

export function NearbyLiveMap({ token, variant = 'sidebar' }: NearbyLiveMapProps) {
  const authToken = token ?? getStoredToken()
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN)
  const [nearby, setNearby] = useState<ApiNearbyUser[]>([])
  const [me, setMe] = useState<ApiNearbyUser | null>(null)
  const [sharing, setSharing] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<number | 'me', LeafletMarker>>(new Map())
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const hasCenteredRef = useRef(false)
  const originRef = useRef(origin)
  const sharingRef = useRef(sharing)
  originRef.current = origin
  sharingRef.current = sharing

  const refreshNearby = useCallback(
    async (lat: number, lng: number) => {
      try {
        const data = await movegridApi.nearbyPresence(lat, lng, authToken, 800)
        setNearby(data.nearby)
        setMe(data.me)
        setLastUpdated(new Date())
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load nearby movers')
      }
    },
    [authToken]
  )

  const pushPresence = useCallback(
    async (lat: number, lng: number, isSharing: boolean) => {
      if (!authToken) return
      try {
        await movegridApi.updatePresence(authToken, lat, lng, isSharing)
      } catch {
        // Presence publish is best-effort; map still works from nearby query.
      }
    },
    [authToken]
  )

  // Boot Leaflet map once on the client.
  useEffect(() => {
    let cancelled = false
    let mapInstance: LeafletMap | null = null

    async function boot() {
      const el = mapElRef.current
      if (!el) return

      // React Strict Mode remounts leave Leaflet's container class behind.
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
          /* map already torn down */
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
      if (mapElRef.current) mapElRef.current.innerHTML = ''
    }
  }, [])

  // Sync markers whenever people / self / origin change.
  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    if (!mapReady || !map || !L) return

    const nextIds = new Set<number | 'me'>()

    const upsert = (key: number | 'me', person: ApiNearbyUser, isYou: boolean, index: number) => {
      nextIds.add(key)
      const color = isYou ? '#f3a8c7' : avatarColor(person.avatar, index)
      const icon = L.divIcon({
        className: 'mg-leaflet-icon',
        html: pinHtml(person, color, isYou),
        iconSize: [52, 64],
        iconAnchor: [26, 52],
      })
      const existing = markersRef.current.get(key)
      try {
        if (existing) {
          existing.setLatLng([person.latitude, person.longitude])
          existing.setIcon(icon)
          existing.setZIndexOffset(isYou ? 1000 : 0)
        } else {
          const marker = L.marker([person.latitude, person.longitude], {
            icon,
            zIndexOffset: isYou ? 1000 : 0,
            title: isYou ? `${person.name} (you)` : person.name,
          }).addTo(map)
          markersRef.current.set(key, marker)
        }
      } catch {
        markersRef.current.delete(key)
      }
    }

    if (me) {
      upsert('me', { ...me, latitude: origin.latitude, longitude: origin.longitude }, true, 0)
    } else {
      upsert(
        'me',
        {
          id: -1,
          name: 'You',
          avatar: 'initials:YOU:#f3a8c7',
          initials: 'YO',
          latitude: origin.latitude,
          longitude: origin.longitude,
          distance_m: 0,
          distance_label: 'You',
          total_points: 0,
          streak: 0,
          updated_at: new Date().toISOString(),
          is_current_user: true,
        },
        true,
        0
      )
    }

    nearby.forEach((person, index) => upsert(person.id, person, false, index))

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
  }, [mapReady, me, nearby, origin.latitude, origin.longitude])

  // Live GPS watch + presence polling.
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Geolocation is not supported in this browser.')
      setOrigin(FALLBACK_ORIGIN)
      void refreshNearby(FALLBACK_ORIGIN.latitude, FALLBACK_ORIGIN.longitude)
      return
    }

    setStatus('locating')
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setOrigin(next)
        setStatus('live')
        void pushPresence(next.latitude, next.longitude, sharingRef.current)
        void refreshNearby(next.latitude, next.longitude)
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setStatus('denied')
          setError('Location permission denied. Showing a default map area.')
        } else {
          setStatus('error')
          setError('Could not read live GPS. Showing a default map area.')
        }
        setOrigin(FALLBACK_ORIGIN)
        void refreshNearby(FALLBACK_ORIGIN.latitude, FALLBACK_ORIGIN.longitude)
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 }
    )

    const poll = window.setInterval(() => {
      const current = originRef.current
      void refreshNearby(current.latitude, current.longitude)
      void pushPresence(current.latitude, current.longitude, sharingRef.current)
    }, 12_000)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(poll)
    }
  }, [pushPresence, refreshNearby])

  const statusLabel =
    status === 'live'
      ? 'Live GPS'
      : status === 'locating'
        ? 'Locating…'
        : status === 'denied'
          ? 'Permission needed'
          : 'Default area'

  return (
    <div className={`nearby-map side-card ${variant === 'page' ? 'nearby-map-page' : ''}`}>
      <div className="nearby-map-label">
        <span>
          LIVE MAP{' '}
          <em>
            <span className={`live-dot ${status === 'live' ? 'on' : ''}`} /> {nearby.length} movers nearby
          </em>
        </span>
        <span className="nearby-status">{statusLabel}</span>
      </div>

      <div className="nearby-map-stage">
        {status === 'locating' && (
          <div className="nearby-map-overlay">
            <LoaderCircle size={18} className="spin" /> Reading your live location…
          </div>
        )}
        <div
          ref={mapElRef}
          className="nearby-leaflet"
          role="img"
          aria-label="Live map showing your location and nearby movers"
        />
      </div>

      <div className="nearby-map-footer">
        <span>
          <Navigation size={14} /> {status === 'live' ? 'Your live location' : 'Centered on default area'}
        </span>
        <div className="nearby-map-footer-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              void refreshNearby(origin.latitude, origin.longitude)
              void pushPresence(origin.latitude, origin.longitude, sharing)
              mapRef.current?.setView([origin.latitude, origin.longitude], DEFAULT_ZOOM, { animate: true })
            }}
          >
            Refresh <ArrowRight size={14} />
          </button>
          {variant === 'sidebar' && (
            <Link className="text-button" href="/buddies">
              Expand <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="nearby-people">
        <div className="nearby-people-head">
          <Users size={15} />
          <strong>Live nearby</strong>
          {lastUpdated && <small>Updated {lastUpdated.toLocaleTimeString()}</small>}
        </div>
        {error && <p className="nearby-error">{error}</p>}
        {!nearby.length && !error && (
          <p className="nearby-empty">No movers in range yet. Stay sharing to appear for others.</p>
        )}
        <ul className="nearby-people-list">
          {me && (
            <li className="is-you">
              <div className="mini-avatar" style={{ background: '#f3a8c7' }}>
                {me.initials}
              </div>
              <div>
                <strong>{me.name} (you)</strong>
                <small>
                  <MapPin size={11} /> Live · {me.streak} day streak
                </small>
              </div>
              <b>{me.total_points.toLocaleString()}</b>
            </li>
          )}
          {nearby.slice(0, variant === 'page' ? 12 : 6).map((person, index) => (
            <li key={person.id}>
              <div className="mini-avatar" style={{ background: avatarColor(person.avatar, index) }}>
                {person.initials}
              </div>
              <div>
                <strong>{person.name}</strong>
                <small>
                  <MapPin size={11} /> {person.distance_label} · {person.streak} day streak
                </small>
              </div>
              <b>{person.total_points.toLocaleString()}</b>
            </li>
          ))}
        </ul>
        {authToken ? (
          <label className="nearby-share">
            <input
              type="checkbox"
              checked={sharing}
              onChange={(e) => {
                const next = e.target.checked
                setSharing(next)
                void pushPresence(origin.latitude, origin.longitude, next)
              }}
            />
            Share my live location with nearby movers
          </label>
        ) : (
          <p className="nearby-hint">Sign in to broadcast your location on the live grid.</p>
        )}
        {me && <p className="nearby-hint muted">Signed in as {me.name}</p>}
      </div>
    </div>
  )
}
