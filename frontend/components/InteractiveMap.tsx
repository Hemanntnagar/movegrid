'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, Zap } from 'lucide-react'

// Fix Leaflet marker icons in Next.js
const customMarkerIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="
    background: #ff7b3d;
    border: 3px solid #183d59;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    color: #fff;
    font-weight: bold;
    font-size: 14px;
  ">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const userMarkerIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="
    background: #38bdf8;
    border: 3px solid #ffffff;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.4), 0 4px 10px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

type Mission = {
  id: number
  title: string
  zone: string
  distance: string
  minutes: number
  move: number
  kind: string
  description: string
  lat?: number
  lng?: number
}

const DEFAULT_COORDS: { [key: number]: [number, number] } = {
  1: [40.7829, -73.9654], // Central Park
  2: [40.7589, -73.9851], // Times Square / Downtown
  3: [40.7128, -74.0060], // City Hall / Financial
  4: [40.7484, -73.9857], // Empire / Midtown
  5: [40.7282, -73.9942], // Washington Square
}

export default function InteractiveMap({
  missions,
  onSelect,
}: {
  missions: Mission[]
  onSelect: (m: Mission) => void
}) {
  const [position, setPosition] = useState<[number, number]>([40.7589, -73.9851])

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude])
        },
        () => {}
      )
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '340px', borderRadius: '20px', overflow: 'hidden' }}>
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        {/* CartoDB Dark Matter / Street tile layer for high-contrast movable map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* User Location Marker */}
        <Marker position={position} icon={userMarkerIcon}>
          <Popup>
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <strong style={{ display: 'block', color: '#0f172a' }}>You are here</strong>
              <small style={{ color: '#64748b' }}>GPS Active</small>
            </div>
          </Popup>
        </Marker>

        {/* Mission Route Markers */}
        {missions.map((m, index) => {
          const latLng = DEFAULT_COORDS[m.id] || [
            position[0] + (index * 0.008 - 0.015),
            position[1] + (index * 0.01 - 0.012),
          ]
          return (
            <Marker key={m.id} position={latLng} icon={customMarkerIcon}>
              <Popup>
                <div style={{ padding: '6px', maxWidth: '200px' }}>
                  <span style={{ fontSize: '10px', color: '#ff7b3d', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {m.kind} · +{m.move} MOVE
                  </span>
                  <strong style={{ display: 'block', fontSize: '14px', margin: '3px 0', color: '#0f172a' }}>
                    {m.title}
                  </strong>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px', lineHeight: '1.3' }}>
                    {m.description}
                  </p>
                  <button
                    type="button"
                    style={{
                      background: '#183d59',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onClick={() => onSelect(m)}
                  >
                    Start Mission
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
