'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { istDateKey } from '../lib/ist'
import { getStoredToken, movegridApi } from '../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_GOAL = 10_000
const STORAGE_PREFIX = 'movegrid_steps_'

/**
 * Acceleration magnitude threshold for a step peak (in m/s² of linear acceleration).
 * Dynamic vector filtering isolates walking movement from gravity baseline.
 */
const LINEAR_STEP_THRESHOLD = 1.25

/**
 * Minimum milliseconds between two detected steps (debounce).
 * Prevents double-counting fast jitter while tracking cadence up to 4.5 steps/sec.
 */
const STEP_MIN_INTERVAL_MS = 220

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'prompt'

export interface StepCounterState {
  /** Current step count for today (persisted across refreshes). */
  steps: number
  /** Daily step goal (default 10 000). */
  goal: number
  /** 0–100 percent toward goal. */
  percent: number
  /** Whether the sensor listener is currently running. */
  active: boolean
  /** DeviceMotion permission state. */
  permissionState: PermissionState
  /** Call this to start counting (also requests permission on iOS). */
  requestPermission: () => Promise<void>
  /** Pause the sensor listener without resetting the count. */
  pause: () => void
  /** Manually add steps (useful for testing on desktop). */
  addSteps: (n: number) => void
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStepCounter(): StepCounterState {
  const [steps, setStepsState] = useState<number>(0)
  const [active, setActive] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')

  // Ref so the event listener always sees the latest value without re-registering
  const stepsRef = useRef<number>(0)
  const lastPeakTimeRef = useRef<number>(0)
  const prevMagRef = useRef<number>(0)
  const risingRef = useRef<boolean>(false)
  const gravityRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 9.81 })

  /** Persist + update state together */
  function setSteps(n: number) {
    stepsRef.current = n
    setStepsState(n)
    saveSteps(n)
    const token = getStoredToken()
    if (token) {
      movegridApi.syncSteps(token, n).catch(() => {})
    }
  }

  // Load today's saved count on mount
  useEffect(() => {
    const saved = loadSteps()
    stepsRef.current = saved
    setStepsState(saved)
  }, [])

  // Determine initial permission state
  useEffect(() => {
    if (typeof window === 'undefined') return

    // DeviceMotionEvent not available at all (e.g. desktop with no sensors)
    if (!('DeviceMotionEvent' in window)) {
      setPermissionState('unavailable')
      return
    }

    // iOS 13+ requires explicit permission; Android grants automatically
    if (
      typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission ===
      'function'
    ) {
      setPermissionState('prompt')
    } else {
      // Android / non-iOS — permission is implicitly granted
      setPermissionState('granted')
    }
  }, [])

  // ── Step detection handler ────────────────────────────────────────────────

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    let mag = 0

    // 1. Prefer hardware-compensated pure linear acceleration if available
    const userAcc = event.acceleration
    if (userAcc && userAcc.x !== null && userAcc.x !== undefined && userAcc.y !== null && userAcc.y !== undefined) {
      const x = userAcc.x || 0
      const y = userAcc.y || 0
      const z = userAcc.z || 0
      mag = Math.sqrt(x * x + y * y + z * z)
    } else {
      // 2. Fallback: Low-pass vector gravity isolation for accurate 3D linear acceleration
      const acc = event.accelerationIncludingGravity
      if (!acc) return
      const rawX = acc.x ?? 0
      const rawY = acc.y ?? 0
      const rawZ = acc.z ?? 0

      const alpha = 0.85
      gravityRef.current.x = alpha * gravityRef.current.x + (1 - alpha) * rawX
      gravityRef.current.y = alpha * gravityRef.current.y + (1 - alpha) * rawY
      gravityRef.current.z = alpha * gravityRef.current.z + (1 - alpha) * rawZ

      const linX = rawX - gravityRef.current.x
      const linY = rawY - gravityRef.current.y
      const linZ = rawZ - gravityRef.current.z

      mag = Math.sqrt(linX * linX + linY * linY + linZ * linZ)
    }

    const wasRising = risingRef.current
    const isRising = mag > prevMagRef.current

    // Detect downward peak crossing above threshold → step step count
    if (wasRising && !isRising && prevMagRef.current > LINEAR_STEP_THRESHOLD) {
      const now = Date.now()
      if (now - lastPeakTimeRef.current > STEP_MIN_INTERVAL_MS) {
        lastPeakTimeRef.current = now
        const next = Math.min(stepsRef.current + 1, 99_999)
        setSteps(next)
      }
    }

    prevMagRef.current = mag
    risingRef.current = isRising
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / stop sensor ───────────────────────────────────────────────────

  const startListening = useCallback(() => {
    window.addEventListener('devicemotion', handleMotion, { passive: true })
    setActive(true)
  }, [handleMotion])

  const pause = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion)
    setActive(false)
  }, [handleMotion])

  // Stop listener on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [handleMotion])

  // ── Permission request ────────────────────────────────────────────────────

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined') return

    // iOS 13+ requires runtime permission
    const requestFn = (
      DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
    ).requestPermission

    if (typeof requestFn === 'function') {
      try {
        const result = await requestFn()
        if (result === 'granted') {
          setPermissionState('granted')
          startListening()
        } else {
          setPermissionState('denied')
        }
      } catch {
        setPermissionState('denied')
      }
    } else {
      // Android / desktop — just start
      setPermissionState('granted')
      startListening()
    }
  }, [startListening])

  // ── Manual step addition (for desktop testing) ────────────────────────────

  const addSteps = useCallback((n: number) => {
    const next = Math.min(stepsRef.current + n, 99_999)
    setSteps(next)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ────────────────────────────────────────────────────────

  const percent = Math.min(100, Math.round((steps / STEP_GOAL) * 100))

  return {
    steps,
    goal: STEP_GOAL,
    percent,
    active,
    permissionState,
    requestPermission,
    pause,
    addSteps,
  }
}
