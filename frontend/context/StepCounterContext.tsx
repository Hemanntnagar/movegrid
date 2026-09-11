'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { istDateKey } from '../lib/ist'
import { getStoredToken, movegridApi } from '../lib/api'

const STEP_GOAL = 10_000
const STORAGE_PREFIX = 'movegrid_steps_'
const MIN_ACCELERATION_THRESHOLD = 0.95
const MIN_GYRO_ROTATION_THRESHOLD = 8.0
const MIN_STEP_INTERVAL_MS = 220
const MAX_STEP_INTERVAL_MS = 1400
const MIN_STRIDE_BUFFER_COUNT = 1
const STRIDE_METERS = 0.78
const MIN_GPS_ACCURACY_M = 45

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'prompt'

export interface StepCounterState {
  steps: number
  goal: number
  percent: number
  active: boolean
  permissionState: PermissionState
  requestPermission: () => Promise<void>
  startTracking: () => void
  start: () => void
  pause: () => void
}

function todayKey(): string {
  return `${STORAGE_PREFIX}${istDateKey()}`
}

function loadSteps(): number {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(todayKey())
  if (!raw) return 0
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) ? 0 : parsed
}

function saveSteps(steps: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(todayKey(), String(steps))
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const StepCounterContext = createContext<StepCounterState | null>(null)

export function StepCounterProvider({ children }: { children: ReactNode }) {
  const [steps, setStepsState] = useState(0)
  const [active, setActive] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')

  const stepsRef = useRef(0)
  const sessionBaseStepsRef = useRef(0)
  const motionSessionStepsRef = useRef(0)
  const gpsDistanceSessionRef = useRef(0)
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null)
  const geoWatchIdRef = useRef<number | null>(null)

  const lastPeakTimeRef = useRef(0)
  const prevMagRef = useRef(0)
  const isRisingRef = useRef(false)
  const strideBufferRef = useRef(0)
  const lastStrideTimeRef = useRef(0)
  const gravityRef = useRef({ x: 0, y: 0, z: 9.81 })

  const applySessionSteps = useCallback((motionDelta: number, gpsDistanceM: number) => {
    motionSessionStepsRef.current = motionDelta
    gpsDistanceSessionRef.current = gpsDistanceM
    const gpsSteps = Math.floor(gpsDistanceM / STRIDE_METERS)
    const sessionSteps = Math.max(motionDelta, gpsSteps)
    const next = Math.min(sessionBaseStepsRef.current + sessionSteps, 999_999)
    stepsRef.current = next
    setStepsState(next)
    saveSteps(next)
    const token = getStoredToken()
    if (token) {
      movegridApi.syncSteps(token, next).catch(() => {})
    }
  }, [])

  const bumpMotionStep = useCallback(() => {
    applySessionSteps(motionSessionStepsRef.current + 1, gpsDistanceSessionRef.current)
  }, [applySessionSteps])

  useEffect(() => {
    const saved = loadSteps()
    stepsRef.current = saved
    setStepsState(saved)
    if (typeof window !== 'undefined' && typeof DeviceMotionEvent === 'undefined') {
      setPermissionState('unavailable')
    }
  }, [])

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      let linMag = 0
      let gyroMag = 0

      const rot = event.rotationRate
      if (rot && (rot.alpha != null || rot.beta != null || rot.gamma != null)) {
        const a = rot.alpha ?? 0
        const b = rot.beta ?? 0
        const g = rot.gamma ?? 0
        gyroMag = Math.sqrt(a * a + b * b + g * g)
      }

      const userAcc = event.acceleration
      if (userAcc && userAcc.x != null && userAcc.y != null) {
        const x = userAcc.x ?? 0
        const y = userAcc.y ?? 0
        const z = userAcc.z ?? 0
        linMag = Math.sqrt(x * x + y * y + z * z)
      } else {
        const acc = event.accelerationIncludingGravity
        if (!acc) return
        const rawX = acc.x ?? 0
        const rawY = acc.y ?? 0
        const rawZ = acc.z ?? 9.81
        const alphaFilter = 0.82
        gravityRef.current.x = alphaFilter * gravityRef.current.x + (1 - alphaFilter) * rawX
        gravityRef.current.y = alphaFilter * gravityRef.current.y + (1 - alphaFilter) * rawY
        gravityRef.current.z = alphaFilter * gravityRef.current.z + (1 - alphaFilter) * rawZ
        const lx = rawX - gravityRef.current.x
        const ly = rawY - gravityRef.current.y
        const lz = rawZ - gravityRef.current.z
        linMag = Math.sqrt(lx * lx + ly * ly + lz * lz)
      }

      const gyroFactor = gyroMag >= MIN_GYRO_ROTATION_THRESHOLD ? 1 : 0.65
      const combinedScore = linMag * 0.75 + (gyroMag / 30) * 0.25 * gyroFactor

      const wasRising = isRisingRef.current
      const isRising = combinedScore > prevMagRef.current

      if (wasRising && !isRising && prevMagRef.current > MIN_ACCELERATION_THRESHOLD) {
        const now = Date.now()
        const timeSinceLastPeak = now - lastPeakTimeRef.current

        if (timeSinceLastPeak >= MIN_STEP_INTERVAL_MS && timeSinceLastPeak <= MAX_STEP_INTERVAL_MS) {
          lastPeakTimeRef.current = now
          const timeSinceLastStride = now - lastStrideTimeRef.current
          lastStrideTimeRef.current = now

          if (timeSinceLastStride >= MIN_STEP_INTERVAL_MS && timeSinceLastStride <= MAX_STEP_INTERVAL_MS) {
            strideBufferRef.current += 1
          } else {
            strideBufferRef.current = 1
          }

          if (strideBufferRef.current >= MIN_STRIDE_BUFFER_COUNT) {
            bumpMotionStep()
          }
        }
      }

      prevMagRef.current = combinedScore
      isRisingRef.current = isRising
    },
    [bumpMotionStep],
  )

  const stopGeolocation = useCallback(() => {
    if (geoWatchIdRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current)
      geoWatchIdRef.current = null
    }
    lastGpsRef.current = null
  }, [])

  const startGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    stopGeolocation()
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        if (accuracy == null || accuracy > MIN_GPS_ACCURACY_M) return

        const prev = lastGpsRef.current
        lastGpsRef.current = { lat: latitude, lng: longitude }
        if (!prev) return

        const delta = haversineMeters(prev.lat, prev.lng, latitude, longitude)
        if (delta < 0.4 || delta > 40) return

        const nextDistance = gpsDistanceSessionRef.current + delta
        applySessionSteps(motionSessionStepsRef.current, nextDistance)
      },
      () => {
        /* location denied or unavailable — motion-only tracking continues */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
  }, [applySessionSteps, stopGeolocation])

  const resetSession = useCallback(() => {
    sessionBaseStepsRef.current = stepsRef.current
    motionSessionStepsRef.current = 0
    gpsDistanceSessionRef.current = 0
    lastGpsRef.current = null
    lastPeakTimeRef.current = 0
    strideBufferRef.current = 0
  }, [])

  const startMotionListening = useCallback(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('devicemotion', handleMotion, { passive: true })
  }, [handleMotion])

  const startListening = useCallback(
    (options?: { motion?: boolean }) => {
      if (typeof window === 'undefined') return
      resetSession()
      if (options?.motion !== false && typeof DeviceMotionEvent !== 'undefined') {
        startMotionListening()
      }
      startGeolocation()
      setActive(true)
    },
    [resetSession, startMotionListening, startGeolocation],
  )

  const pause = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion)
    }
    stopGeolocation()
    setActive(false)
  }, [handleMotion, stopGeolocation])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion)
      }
      stopGeolocation()
    }
  }, [handleMotion, stopGeolocation])

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined') return

    if (typeof DeviceMotionEvent === 'undefined') {
      setPermissionState('unavailable')
      startListening({ motion: false })
      return
    }

    let motionGranted = true
    const motionReq = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission

    if (typeof motionReq === 'function') {
      try {
        const motionState = await motionReq()
        const orientationReq = (
          DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
        ).requestPermission
        if (typeof orientationReq === 'function') {
          await orientationReq().catch(() => {})
        }
        motionGranted = motionState === 'granted'
      } catch {
        motionGranted = false
      }
    }

    setPermissionState(motionGranted ? 'granted' : 'denied')
    startListening({ motion: motionGranted })
  }, [startListening])

  const percent = Math.min(100, Math.round((steps / STEP_GOAL) * 100))

  const value = useMemo<StepCounterState>(
    () => ({
      steps,
      goal: STEP_GOAL,
      percent,
      active,
      permissionState,
      requestPermission,
      startTracking: () => {
        void requestPermission()
      },
      start: () => {
        void requestPermission()
      },
      pause,
    }),
    [steps, percent, active, permissionState, requestPermission, pause],
  )

  return <StepCounterContext.Provider value={value}>{children}</StepCounterContext.Provider>
}

export function useStepCounter(): StepCounterState {
  const ctx = useContext(StepCounterContext)
  if (!ctx) {
    throw new Error('useStepCounter must be used within StepCounterProvider')
  }
  return ctx
}
