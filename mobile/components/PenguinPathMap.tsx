import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { daysInIstMonth, getIstParts, monthLabelIst } from '@/lib/ist'
import type { DayLevelStatus } from '@/lib/monthProgress'

export type PathLevel = {
  day: number
  status: DayLevelStatus
}

type Point = { x: number; y: number }

type PenguinPathMapProps = {
  levels: PathLevel[]
  todayDay: number
  onSelectDay: (day: number) => void
}

const MAP_W = 360
const PAD_Y = 70
const GAP_Y = 100
const NODE_R = 26
const AMP = 98
const VISIBLE_LEVELS = 3
const VIEWPORT_H = (VISIBLE_LEVELS - 1) * GAP_Y + PAD_Y * 2

const NODE_FILL: Record<DayLevelStatus, string> = {
  active: '#FF633D',
  completed: '#FFD447',
  locked: '#E8F4F8',
  missed: '#F3A8C7',
  closed: '#F3A8C7',
}

const NODE_LABEL: Record<DayLevelStatus, string> = {
  active: '#FFFFFF',
  completed: '#5E7119',
  locked: '#5A7F90',
  missed: '#8A2F4A',
  closed: '#8A2F4A',
}

function layoutPoints(dayCount: number): Point[] {
  const height = PAD_Y * 2 + Math.max(0, dayCount - 1) * GAP_Y
  const centerX = MAP_W / 2
  const points: Point[] = []
  for (let day = 1; day <= dayCount; day += 1) {
    const index = day - 1
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
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Ellipse cx={0} cy={18} rx={14} ry={5} fill="rgba(24,61,89,0.12)" />
      <Path d="M0,-28 L18,8 L-18,8 Z" fill="#2f7a45" stroke="#183d59" strokeWidth={2.5} />
      <Path d="M0,-42 L14,-8 L-14,-8 Z" fill="#3f9a55" stroke="#183d59" strokeWidth={2.5} />
      <Path d="M0,-54 L10,-28 L-10,-28 Z" fill="#5cbc6e" stroke="#183d59" strokeWidth={2.2} />
      <Rect x={-3} y={8} width={6} height={12} rx={2} fill="#8b5a2b" stroke="#183d59" strokeWidth={1.5} />
    </G>
  )
}

function Cabin({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx={28} cy={42} rx={36} ry={8} fill="rgba(24,61,89,0.1)" />
      <Rect x={4} y={10} width={48} height={32} rx={4} fill="#c47a3a" stroke="#183d59" strokeWidth={2.5} />
      <Path d="M0,14 L28,-10 L56,14 Z" fill="#fffdf0" stroke="#183d59" strokeWidth={2.5} />
      <Rect x={22} y={22} width={12} height={20} rx={2} fill="#183d59" />
      <Rect x={10} y={18} width={10} height={10} rx={2} fill="#8bd4f4" stroke="#183d59" strokeWidth={1.5} />
      <Rect x={36} y={18} width={10} height={10} rx={2} fill="#8bd4f4" stroke="#183d59" strokeWidth={1.5} />
    </G>
  )
}

function HeroPenguin() {
  return (
    <Svg width={58} height={66} viewBox="0 0 100 110">
      <Ellipse cx={50} cy={106} rx={28} ry={6} fill="rgba(24,61,89,0.18)" />
      <Ellipse cx={50} cy={65} rx={35} ry={40} fill="#0f172a" />
      <Ellipse cx={50} cy={68} rx={24} ry={32} fill="#ffffff" />
      <Circle cx={50} cy={32} r={24} fill="#0f172a" />
      <Circle cx={42} cy={28} r={4} fill="#ffffff" />
      <Circle cx={43} cy={28} r={2} fill="#000" />
      <Circle cx={58} cy={28} r={4} fill="#ffffff" />
      <Circle cx={57} cy={28} r={2} fill="#000" />
      <Polygon points="50,32 44,38 56,38" fill="#ff7b3d" />
      <Rect x={30} y={48} width={40} height={8} rx={4} fill="#8bd4f4" />
      <Ellipse cx={38} cy={102} rx={10} ry={5} fill="#ff7b3d" />
      <Ellipse cx={62} cy={102} rx={10} ry={5} fill="#ff7b3d" />
    </Svg>
  )
}

export function PenguinPathMap({ levels, todayDay, onSelectDay }: PenguinPathMapProps) {
  const { width: screenW } = useWindowDimensions()
  const dayCount = levels.length || daysInIstMonth()
  const points = useMemo(() => layoutPoints(dayCount), [dayCount])
  const height = PAD_Y * 2 + Math.max(0, dayCount - 1) * GAP_Y
  const ribbon = useMemo(() => pathRibbon(points, 46), [points])
  const stroke = useMemo(() => smoothStroke(points), [points])
  const scrollerRef = useRef<ScrollView>(null)
  const [focusDay, setFocusDay] = useState(todayDay)
  const [canvasW, setCanvasW] = useState(Math.min(screenW - 28, 440))
  const initialScrollDone = useRef(false)
  const skipScrollSync = useRef(false)

  const scale = canvasW / MAP_W
  const canvasH = height * scale
  const viewportH = Math.min(VIEWPORT_H * scale, Math.min(screenW * 0.72, 300))

  const penguinTarget = points[Math.max(0, Math.min(todayDay, dayCount) - 1)] ?? points[0]

  const scrollToDay = (day: number) => {
    const point = points[Math.max(0, Math.min(day, dayCount) - 1)]
    if (!point || canvasH <= 0) return
    const yRatio = point.y / height
    const targetTop = yRatio * canvasH - viewportH / 2
    skipScrollSync.current = true
    scrollerRef.current?.scrollTo({ y: Math.max(0, targetTop), animated: true })
    setTimeout(() => {
      skipScrollSync.current = false
    }, 400)
  }

  useEffect(() => {
    initialScrollDone.current = false
    setFocusDay(todayDay)
    const t = setTimeout(() => {
      scrollToDay(todayDay)
      initialScrollDone.current = true
    }, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDay, dayCount, canvasH, viewportH])

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!initialScrollDone.current || skipScrollSync.current || points.length === 0) return
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent
    if (contentSize.height <= layoutMeasurement.height + 8) return
    const centerY =
      ((contentOffset.y + layoutMeasurement.height / 2) / contentSize.height) * height
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

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w > 0 && Math.abs(w - canvasW) > 1) setCanvasW(w)
  }

  const canSlideUp = focusDay < dayCount
  const canSlideDown = focusDay > 1
  const label = monthLabelIst()
  const { month, year } = getIstParts()
  const windowStart = Math.max(1, focusDay - 1)
  const windowEnd = Math.min(dayCount, focusDay + 1)

  return (
    <View style={styles.trailMap} accessibilityLabel={`${label} movement path`}>
      <View style={styles.head}>
        <Text style={styles.title}>
          {label} <Text style={styles.titleAccent}>trail</Text>
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Levels {windowStart}–{windowEnd} · Day {todayDay}
          </Text>
        </View>
      </View>

      <View style={styles.chrome}>
        <Pressable
          style={[styles.slideBtn, !canSlideUp && styles.slideBtnDisabled]}
          disabled={!canSlideUp}
          onPress={() => {
            const next = Math.min(dayCount, focusDay + 1)
            setFocusDay(next)
            scrollToDay(next)
          }}
          accessibilityLabel="Slide to higher levels">
          <Text style={styles.slideBtnText}>▲</Text>
        </Pressable>

        <ScrollView
          ref={scrollerRef}
          style={[styles.scroll, { height: viewportH }]}
          contentContainerStyle={{ width: '100%' }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast">
          <View
            style={[styles.canvas, { width: '100%', height: canvasH }]}
            onLayout={onCanvasLayout}
            accessibilityLabel={`Movement path for ${month}/${year}`}>
            <Svg width={canvasW} height={canvasH} viewBox={`0 0 ${MAP_W} ${height}`}>
              <Defs>
                <LinearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#5eb8e8" />
                  <Stop offset="100%" stopColor="#8bd4f4" />
                </LinearGradient>
              </Defs>

              <Ellipse cx={70} cy={height * 0.18} rx={48} ry={22} fill="#fff" opacity={0.35} />
              <Ellipse cx={290} cy={height * 0.42} rx={56} ry={26} fill="#fff" opacity={0.3} />
              <Ellipse cx={90} cy={height * 0.72} rx={52} ry={24} fill="#fff" opacity={0.28} />

              <Pine x={42} y={height * 0.12} scale={0.85} />
              <Pine x={310} y={height * 0.22} scale={1} />
              <Pine x={48} y={height * 0.38} scale={0.7} />
              <Pine x={318} y={height * 0.55} scale={0.9} />
              <Pine x={56} y={height * 0.68} scale={0.75} />
              <Pine x={300} y={height * 0.82} scale={0.8} />
              <Cabin x={268} y={height - 110} />

              <Path d={ribbon} fill="url(#pathGrad)" stroke="#183d59" strokeWidth={3} opacity={0.95} />
              <Path
                d={stroke}
                fill="none"
                stroke="#fffdf0"
                strokeWidth={3}
                strokeDasharray="6 10"
                opacity={0.55}
              />

              {levels.map((level, index) => {
                const point = points[index]
                if (!point) return null
                const isToday = level.day === todayDay
                const inWindow =
                  (level.day >= windowStart && level.day <= windowEnd) || isToday
                return (
                  <G
                    key={level.day}
                    transform={`translate(${point.x}, ${point.y})`}
                    opacity={inWindow ? 1 : 0.22}>
                    <Ellipse cx={0} cy={NODE_R + 6} rx={22} ry={7} fill="rgba(24,61,89,0.14)" />
                    <Circle
                      r={NODE_R}
                      fill={NODE_FILL[level.status]}
                      stroke="#0f172a"
                      strokeWidth={isToday ? 4 : 3}
                    />
                    <SvgText
                      textAnchor="middle"
                      y={7}
                      fill={NODE_LABEL[level.status]}
                      fontSize={16}
                      fontWeight="900">
                      {level.day}
                    </SvgText>
                    {isToday && level.status === 'active' ? (
                      <G transform="translate(0, -36)">
                        <Rect
                          x={-26}
                          y={-10}
                          width={52}
                          height={18}
                          rx={9}
                          fill="#183d59"
                          stroke="#ffd447"
                          strokeWidth={1.5}
                        />
                        <SvgText
                          textAnchor="middle"
                          y={3}
                          fill="#ffd447"
                          fontSize={9}
                          fontWeight="900">
                          ▶ START
                        </SvgText>
                      </G>
                    ) : null}
                  </G>
                )
              })}
            </Svg>

            {levels.map((level, index) => {
              const point = points[index]
              if (!point) return null
              const isToday = level.day === todayDay
              const inWindow =
                (level.day >= windowStart && level.day <= windowEnd) || isToday
              if (!inWindow) return null
              return (
                <Pressable
                  key={`hot-${level.day}`}
                  accessibilityLabel={`Level ${level.day}, ${level.status}`}
                  onPress={() => onSelectDay(level.day)}
                  style={[
                    styles.hotspot,
                    {
                      left: (point.x / MAP_W) * canvasW - 28,
                      top: (point.y / height) * canvasH - 28,
                    },
                  ]}
                />
              )
            })}

            {penguinTarget ? (
              <View
                pointerEvents="none"
                style={[
                  styles.penguin,
                  {
                    left: (penguinTarget.x / MAP_W) * canvasW - 29,
                    top: (penguinTarget.y / height) * canvasH - 78,
                  },
                ]}>
                <View style={styles.iceFloe} />
                <HeroPenguin />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.slideBtn, !canSlideDown && styles.slideBtnDisabled]}
          disabled={!canSlideDown}
          onPress={() => {
            const next = Math.max(1, focusDay - 1)
            setFocusDay(next)
            scrollToDay(next)
          }}
          accessibilityLabel="Slide to lower levels">
          <Text style={styles.slideBtnText}>▼</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  trailMap: {
    marginHorizontal: -4,
    gap: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  titleAccent: {
    color: '#ff633d',
  },
  badge: {
    backgroundColor: '#fffdf0',
    borderWidth: 2.5,
    borderColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  chrome: {
    alignItems: 'center',
    gap: 6,
  },
  slideBtn: {
    width: 36,
    height: 32,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#0f172a',
    backgroundColor: '#fffdf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideBtnDisabled: {
    opacity: 0.35,
  },
  slideBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  scroll: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 3.5,
    borderColor: '#0f172a',
    backgroundColor: '#7dd3fc',
    overflow: 'hidden',
  },
  canvas: {
    position: 'relative',
    backgroundColor: '#7dd3fc',
  },
  hotspot: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    zIndex: 2,
  },
  penguin: {
    position: 'absolute',
    width: 58,
    height: 72,
    alignItems: 'center',
    zIndex: 3,
  },
  iceFloe: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,253,240,0.85)',
    borderWidth: 2,
    borderColor: '#183d59',
  },
})
