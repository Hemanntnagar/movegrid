'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { daysInIstMonth, getIstParts, monthLabelIst } from '../lib/ist'
import type { DayLevelStatus } from '../lib/monthProgress'

export type PathLevel = {
  day: number
  status: DayLevelStatus
}

type Point = { x: number; y: number }

type PenguinPathMapProps = {
  levels: PathLevel[]
  todayDay: number
  onSelectDay: (day: number) => void
  compact?: boolean
}

const MAP_W = 360
const PAD_Y = 70
const GAP_Y = 100
const NODE_R = 26
const AMP = 98
/** Exactly 3 levels fit in the viewport (top · middle · bottom). */
const VISIBLE_LEVELS = 3
const VIEWPORT_H = (VISIBLE_LEVELS - 1) * GAP_Y + PAD_Y * 2

function layoutPoints(dayCount: number): Point[] {
  const height = PAD_Y * 2 + Math.max(0, dayCount - 1) * GAP_Y
  const centerX = MAP_W / 2
  const points: Point[] = []
  for (let day = 1; day <= dayCount; day += 1) {
    const index = day - 1
    // Level 1 at bottom → end of month at top
    const y = height - PAD_Y - index * GAP_Y
    const x = centerX + Math.sin(index * 0.95) * AMP
    points.push({ x, y })
  }
  return points
}

function pathRibbon(points: Point[], width: number) {
  if (points.length < 2) return ''
  const half = width / 2
  const left: string[] = []
  const right: string[] = []

  for (let i = 0; i < points.length; i += 1) {
    const prev = points[i - 1] ?? points[i]
    const next = points[i + 1] ?? points[i]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const nx = (-dy / len) * half
    const ny = (dx / len) * half
    left.push(`${points[i].x + nx},${points[i].y + ny}`)
    right.push(`${points[i].x - nx},${points[i].y - ny}`)
  }

  return `M ${left[0]} L ${left.slice(1).join(' L ')} L ${right.reverse().join(' L ')} Z`
}

function smoothStroke(points: Point[]) {
  if (points.length === 0) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const cx = (prev.x + curr.x) / 2
    const cy = (prev.y + curr.y) / 2
    d += ` Q ${prev.x} ${prev.y - 8} ${cx} ${cy}`
    d += ` Q ${curr.x} ${curr.y + 8} ${curr.x} ${curr.y}`
  }
  return d
}

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="18" rx="14" ry="5" fill="rgba(24,61,89,0.12)" />
      <path d="M0,-28 L18,8 L-18,8 Z" fill="#2f7a45" stroke="#183d59" strokeWidth="2.5" />
      <path d="M0,-42 L14,-8 L-14,-8 Z" fill="#3f9a55" stroke="#183d59" strokeWidth="2.5" />
      <path d="M0,-54 L10,-28 L-10,-28 Z" fill="#5cbc6e" stroke="#183d59" strokeWidth="2.2" />
      <rect x="-3" y="8" width="6" height="12" rx="2" fill="#8b5a2b" stroke="#183d59" strokeWidth="1.5" />
      <ellipse cx="-6" cy="-20" rx="5" ry="3" fill="#fffdf0" opacity="0.9" />
      <ellipse cx="5" cy="-36" rx="4" ry="2.5" fill="#fffdf0" opacity="0.9" />
    </g>
  )
}

function Cabin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="28" cy="42" rx="36" ry="8" fill="rgba(24,61,89,0.1)" />
      <rect x="4" y="10" width="48" height="32" rx="4" fill="#c47a3a" stroke="#183d59" strokeWidth="2.5" />
      <path d="M0,14 L28,-10 L56,14 Z" fill="#fffdf0" stroke="#183d59" strokeWidth="2.5" />
      <rect x="22" y="22" width="12" height="20" rx="2" fill="#183d59" />
      <rect x="10" y="18" width="10" height="10" rx="2" fill="#8bd4f4" stroke="#183d59" strokeWidth="1.5" />
      <rect x="36" y="18" width="10" height="10" rx="2" fill="#8bd4f4" stroke="#183d59" strokeWidth="1.5" />
    </g>
  )
}

function Bridge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0,18 Q40,-8 80,18" fill="none" stroke="#6b7c8a" strokeWidth="10" strokeLinecap="round" />
      <path d="M0,18 Q40,-8 80,18" fill="none" stroke="#183d59" strokeWidth="2.5" />
      <rect x="6" y="16" width="6" height="18" rx="2" fill="#8a96a1" stroke="#183d59" strokeWidth="1.5" />
      <rect x="68" y="16" width="6" height="18" rx="2" fill="#8a96a1" stroke="#183d59" strokeWidth="1.5" />
    </g>
  )
}

function Deer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="16" cy="28" rx="14" ry="5" fill="rgba(24,61,89,0.1)" />
      <ellipse cx="18" cy="18" rx="14" ry="9" fill="#c48a4a" stroke="#183d59" strokeWidth="2" />
      <circle cx="30" cy="10" r="7" fill="#c48a4a" stroke="#183d59" strokeWidth="2" />
      <path d="M28,4 L24,-6 M32,4 L36,-6" stroke="#183d59" strokeWidth="2" strokeLinecap="round" />
      <rect x="8" y="24" width="4" height="10" rx="1" fill="#8b5a2b" />
      <rect x="22" y="24" width="4" height="10" rx="1" fill="#8b5a2b" />
    </g>
  )
}

function Dog({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="14" cy="24" rx="12" ry="4" fill="rgba(24,61,89,0.1)" />
      <ellipse cx="14" cy="14" rx="12" ry="8" fill="#d4a574" stroke="#183d59" strokeWidth="2" />
      <circle cx="24" cy="8" r="6" fill="#d4a574" stroke="#183d59" strokeWidth="2" />
      <circle cx="26" cy="7" r="1.2" fill="#183d59" />
      <ellipse cx="4" cy="8" rx="3" ry="5" fill="#d4a574" stroke="#183d59" strokeWidth="1.5" />
    </g>
  )
}

function MiniPenguin({ x, y, scale = 0.55 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="50" cy="65" rx="35" ry="40" fill="#0f172a" />
      <ellipse cx="50" cy="68" rx="24" ry="32" fill="#ffffff" />
      <circle cx="50" cy="32" r="24" fill="#0f172a" />
      <circle cx="42" cy="28" r="4" fill="#ffffff" />
      <circle cx="43" cy="28" r="2" fill="#000" />
      <circle cx="58" cy="28" r="4" fill="#ffffff" />
      <circle cx="57" cy="28" r="2" fill="#000" />
      <polygon points="50,32 44,38 56,38" fill="#ff7b3d" />
      <ellipse cx="38" cy="102" rx="10" ry="5" fill="#ff7b3d" />
      <ellipse cx="62" cy="102" rx="10" ry="5" fill="#ff7b3d" />
    </g>
  )
}

function HeroPenguin({ className }: { className?: string }) {
  return (
    <svg className={className} width="58" height="66" viewBox="0 0 100 110" fill="none" aria-hidden>
      <ellipse cx="50" cy="106" rx="28" ry="6" fill="rgba(24,61,89,0.18)" />
      <ellipse cx="50" cy="65" rx="35" ry="40" fill="#0f172a" />
      <ellipse cx="50" cy="68" rx="24" ry="32" fill="#ffffff" />
      <circle cx="50" cy="32" r="24" fill="#0f172a" />
      <circle cx="42" cy="28" r="4" fill="#ffffff" />
      <circle cx="43" cy="28" r="2" fill="#000" />
      <circle cx="58" cy="28" r="4" fill="#ffffff" />
      <circle cx="57" cy="28" r="2" fill="#000" />
      <polygon points="50,32 44,38 56,38" fill="#ff7b3d" />
      <circle cx="36" cy="34" r="3" fill="#f3a8c7" opacity="0.7" />
      <circle cx="64" cy="34" r="3" fill="#f3a8c7" opacity="0.7" />
      <rect x="30" y="48" width="40" height="8" rx="4" fill="#8bd4f4" />
      <ellipse cx="14" cy="65" rx="7" ry="18" fill="#0f172a" transform="rotate(20 14 65)" />
      <ellipse cx="86" cy="65" rx="7" ry="18" fill="#0f172a" transform="rotate(-20 86 65)" />
      <ellipse cx="38" cy="102" rx="10" ry="5" fill="#ff7b3d" />
      <ellipse cx="62" cy="102" rx="10" ry="5" fill="#ff7b3d" />
    </svg>
  )
}

export function PenguinPathMap({ levels, todayDay, onSelectDay, compact }: PenguinPathMapProps) {
  const dayCount = levels.length || daysInIstMonth()
  const points = useMemo(() => layoutPoints(dayCount), [dayCount])
  const height = PAD_Y * 2 + Math.max(0, dayCount - 1) * GAP_Y
  const ribbon = useMemo(() => pathRibbon(points, 46), [points])
  const stroke = useMemo(() => smoothStroke(points), [points])
  const penguinTarget = points[Math.max(0, Math.min(todayDay, dayCount) - 1)] ?? points[0]
  const [penguinPos, setPenguinPos] = useState(penguinTarget)
  const [waddle, setWaddle] = useState(false)
  /** Day number currently centered in the 3-level window */
  const [focusDay, setFocusDay] = useState(todayDay)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const skipScrollSync = useRef(false)

  const scrollToDay = (day: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollerRef.current
    const point = points[Math.max(0, Math.min(day, dayCount) - 1)]
    if (!el || !point || height <= 0) return
    const yRatio = point.y / height
    const targetTop = yRatio * el.scrollHeight - el.clientHeight / 2
    skipScrollSync.current = true
    el.scrollTo({ top: Math.max(0, targetTop), behavior })
    window.setTimeout(() => {
      skipScrollSync.current = false
    }, behavior === 'smooth' ? 450 : 50)
  }

  useEffect(() => {
    setFocusDay(todayDay)
    scrollToDay(todayDay, 'auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recenter when today changes
  }, [todayDay, dayCount])

  useEffect(() => {
    setWaddle(true)
    const id = window.setTimeout(() => setPenguinPos(penguinTarget), 40)
    const done = window.setTimeout(() => setWaddle(false), 900)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(done)
    }
  }, [penguinTarget.x, penguinTarget.y])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => {
      if (skipScrollSync.current || points.length === 0 || height <= 0) return
      const centerY = ((el.scrollTop + el.clientHeight / 2) / el.scrollHeight) * height
      let nearest = 1
      let best = Infinity
      points.forEach((point, index) => {
        const dist = Math.abs(point.y - centerY)
        if (dist < best) {
          best = dist
          nearest = index + 1
        }
      })
      setFocusDay(nearest)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [points, height])

  const canSlideUp = focusDay < dayCount
  const canSlideDown = focusDay > 1

  const label = monthLabelIst()
  const { month, year } = getIstParts()
  const windowStart = Math.max(1, focusDay - 1)
  const windowEnd = Math.min(dayCount, focusDay + 1)

  return (
    <section className={`trail-map ${compact ? 'is-compact' : ''}`} aria-label={`${label} movement path`}>
      <div className="trail-map-head">
        <div>
          <p className="eyebrow">MONTHLY PATH · IST</p>
          <h2>
            {label} <span>trail</span>
          </h2>
        </div>
        <div className="trail-map-badge">
          Levels {windowStart}–{windowEnd} · Day {todayDay}
        </div>
      </div>

      <div className="trail-slide-chrome">
        <button
          type="button"
          className="trail-slide-btn"
          disabled={!canSlideUp}
          aria-label="Slide to higher levels"
          onClick={() => {
            const next = Math.min(dayCount, focusDay + 1)
            setFocusDay(next)
            scrollToDay(next)
          }}
        >
          <ChevronUp size={20} />
        </button>

        <div
          className="trail-map-scroll"
          ref={scrollerRef}
          style={{ height: VIEWPORT_H }}
        >
          <div className="trail-map-canvas" style={{ aspectRatio: `${MAP_W} / ${height}` }}>
            <svg
              className="trail-map-svg"
              viewBox={`0 0 ${MAP_W} ${height}`}
              width="100%"
              role="img"
              aria-label={`Movement path for ${month}/${year}`}
            >
              <defs>
                <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5eb8e8" />
                  <stop offset="100%" stopColor="#8bd4f4" />
                </linearGradient>
              </defs>

              <ellipse cx="70" cy={height * 0.18} rx="48" ry="22" fill="#fff" opacity="0.35" />
              <ellipse cx="290" cy={height * 0.42} rx="56" ry="26" fill="#fff" opacity="0.3" />
              <ellipse cx="90" cy={height * 0.72} rx="52" ry="24" fill="#fff" opacity="0.28" />

              <Pine x={42} y={height * 0.12} scale={0.85} />
              <Pine x={310} y={height * 0.22} scale={1} />
              <Pine x={48} y={height * 0.38} scale={0.7} />
              <Pine x={318} y={height * 0.55} scale={0.9} />
              <Pine x={56} y={height * 0.68} scale={0.75} />
              <Pine x={300} y={height * 0.82} scale={0.8} />

              {dayCount > 5 && (
                <Bridge x={MAP_W / 2 - 40} y={(points[Math.min(dayCount - 1, 6)]?.y ?? 90) - 10} />
              )}
              <Cabin x={268} y={height - 110} />
              <Deer x={36} y={height - 100} />
              {points[2] && <Dog x={points[2].x + 48} y={points[2].y - 10} />}
              <MiniPenguin x={28} y={height - 160} scale={0.38} />
              <MiniPenguin x={280} y={height * 0.08} scale={0.32} />

              <path d={ribbon} fill="url(#pathGrad)" stroke="#183d59" strokeWidth="3" opacity="0.95" />
              <path d={stroke} fill="none" stroke="#fffdf0" strokeWidth="3" strokeDasharray="6 10" opacity="0.55" />

              {levels.map((level, index) => {
                const point = points[index]
                if (!point) return null
                const isToday = level.day === todayDay
                const inWindow = level.day >= windowStart && level.day <= windowEnd
                return (
                  <g
                    key={level.day}
                    className={`trail-level-group ${inWindow ? 'is-visible' : 'is-hidden'}`}
                    transform={`translate(${point.x}, ${point.y})`}
                  >
                    <ellipse cx="0" cy={NODE_R + 6} rx="22" ry="7" fill="rgba(24,61,89,0.14)" />
                    <circle
                      className={`trail-node node-${level.status} ${isToday ? 'is-today' : ''}`}
                      r={NODE_R}
                    />
                    <text className={`trail-node-label status-${level.status}`} textAnchor="middle" dy="7">
                      {level.day}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Snap anchors — one per level, centered in the 3-level viewport */}
            <div className="trail-snap-rail" aria-hidden>
              {points.map((point, index) => (
                <div
                  key={`snap-${index + 1}`}
                  className="trail-snap-point"
                  style={{
                    top: `${((point.y - VIEWPORT_H / 2) / height) * 100}%`,
                    height: `${(VIEWPORT_H / height) * 100}%`,
                  }}
                />
              ))}
            </div>

            <div className="trail-hotspots">
              {levels.map((level, index) => {
                const point = points[index]
                if (!point) return null
                const inWindow = level.day >= windowStart && level.day <= windowEnd
                return (
                  <button
                    key={`hot-${level.day}`}
                    type="button"
                    className={`trail-hotspot ${inWindow ? '' : 'is-offscreen'}`}
                    style={{
                      left: `${(point.x / MAP_W) * 100}%`,
                      top: `${(point.y / height) * 100}%`,
                    }}
                    tabIndex={inWindow ? 0 : -1}
                    aria-hidden={!inWindow}
                    aria-label={`Level ${level.day}, ${level.status}`}
                    onClick={() => onSelectDay(level.day)}
                  />
                )
              })}
            </div>

            {penguinPos && (
              <div
                className={`trail-penguin ${waddle ? 'waddling' : ''}`}
                style={{
                  left: `calc(${(penguinPos.x / MAP_W) * 100}% - 29px)`,
                  top: `calc(${(penguinPos.y / height) * 100}% - 78px)`,
                }}
              >
                <div className="trail-ice-floe" />
                <HeroPenguin />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="trail-slide-btn"
          disabled={!canSlideDown}
          aria-label="Slide to lower levels"
          onClick={() => {
            const next = Math.max(1, focusDay - 1)
            setFocusDay(next)
            scrollToDay(next)
          }}
        >
          <ChevronDown size={20} />
        </button>
      </div>
    </section>
  )
}
