'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { istDateKey } from '../lib/ist'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_GOAL = 10_000
const STORAGE_PREFIX = 'movegrid_steps_'

/**
 * Acceleration magnitude threshold for a step peak.
 * Tuned for walking pace (≈ 10–13 m/s² including gravity).
 * Raise if you're getting false positives, lower if steps are missed.
 */
const STEP_THRESHOLD = 11.5

/**
 * Minimum milliseconds between two detected steps (debounce).
 * Prevents double-counting the same footfall.
 */
const STEP_MIN_INTERVAL_MS = 250

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

  /** Persist + update state together */
  function setSteps(n: number) {
    stepsRef.current = n
    setStepsState(n)
    saveSteps(n)
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
    const acc = event.accelerationIncludingGravity
    if (!acc) return
    const x = acc.x ?? 0
    const y = acc.y ?? 0
    const z = acc.z ?? 0
    const mag = Math.sqrt(x * x + y * y + z * z)

    const wasRising = risingRef.current
    const isRising = mag > prevMagRef.current

    // Detect a downward crossing above threshold → step peak
    if (wasRising && !isRising && prevMagRef.current > STEP_THRESHOLD) {
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
