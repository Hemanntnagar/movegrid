'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { istDateKey } from '../lib/ist'
import { getStoredToken, movegridApi } from '../lib/api'

// ─── Constants & Sensor Tuning ────────────────────────────────────────────────

const STEP_GOAL = 10_000
const STORAGE_PREFIX = 'movegrid_steps_'

/**
 * Acceleration magnitude threshold for a step peak (in m/s²).
 * Combined with gyroscope angular velocity for high-accuracy step detection.
 */
const MIN_ACCELERATION_THRESHOLD = 1.15

/**
 * Minimum Gyroscope angular velocity (deg/s) associated with human leg/hip stride swing.
 */
const MIN_GYRO_ROTATION_THRESHOLD = 12.0

/**
 * Minimum & Maximum time window between 2 valid walking strides (ms).
 * 200ms = 5 steps/sec (fast sprint), 1200ms = 0.83 steps/sec (slow walk).
 */
const MIN_STEP_INTERVAL_MS = 200
const MAX_STEP_INTERVAL_MS = 1200

/**
 * Minimum consecutive stride peaks before committing steps (noise suppression).
 * Filters out random hand shakes or stationary phone movement.
 */
const MIN_STRIDE_BUFFER_COUNT = 2

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Pedometer Hook ──────────────────────────────────────────────────────────

export function useStepCounter(): StepCounterState {
  const [steps, setStepsState] = useState<number>(0)
  const [active, setActive] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('granted')

  const stepsRef = useRef<number>(0)
  const lastPeakTimeRef = useRef<number>(0)
  const prevMagRef = useRef<number>(0)
  const isRisingRef = useRef<boolean>(false)
  const lastMotionEventTimeRef = useRef<number>(0)

  // Stride cadence buffer for noise rejection
  const strideBufferRef = useRef<number>(0)
  const lastStrideTimeRef = useRef<number>(0)

  // Gravity vector estimation for low-pass filter
  const gravityRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 9.81 })

  // Latest angular velocity values (alpha, beta, gamma)
  const gyroRateRef = useRef<{ alpha: number; beta: number; gamma: number }>({
    alpha: 0,
    beta: 0,
    gamma: 0,
  })

  function setSteps(n: number) {
    stepsRef.current = n
    setStepsState(n)
    saveSteps(n)
    const token = getStoredToken()
    if (token) {
      movegridApi.syncSteps(token, n).catch(() => {})
    }
  }

  // Load saved step count on mount
  useEffect(() => {
    const saved = loadSteps()
    stepsRef.current = saved
    setStepsState(saved)
  }, [])


  // ── Rotation Handler ──────────────────────────────────────────────────────

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
      gyroRateRef.current = {
        alpha: Math.abs(event.alpha || 0),
        beta: Math.abs(event.beta || 0),
        gamma: Math.abs(event.gamma || 0),
      }
    }
  }, [])

  // ── Motion & Step Handler ─────────────────────────────────────────────────

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    lastMotionEventTimeRef.current = Date.now()
    let linMag = 0
    let gyroMag = 0

    // Extract rotation rate from motion event if available
    const rot = event.rotationRate
    if (rot && (rot.alpha !== null || rot.beta !== null || rot.gamma !== null)) {
      const a = rot.alpha || 0
      const b = rot.beta || 0
      const g = rot.gamma || 0
      gyroMag = Math.sqrt(a * a + b * b + g * g)
    } else {
      // Fallback: estimate rotation from orientation rate
      const { alpha, beta, gamma } = gyroRateRef.current
      gyroMag = Math.sqrt(alpha * alpha + beta * beta + gamma * gamma) * 0.1
    }

    // Extract Pure Linear Acceleration (hardware compensated or gravity low-pass filtered)
    const userAcc = event.acceleration
    if (userAcc && userAcc.x !== null && userAcc.x !== undefined && userAcc.y !== null && userAcc.y !== undefined) {
      const x = userAcc.x || 0
      const y = userAcc.y || 0
      const z = userAcc.z || 0
      linMag = Math.sqrt(x * x + y * y + z * z)
    } else {
      // Low-pass gravity separation filter
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

    // Combined Sensor Fusion Score (70% Linear Acc + 30% Rotation)
    const combinedScore = linMag * 0.7 + (gyroMag / 25.0) * 0.3

    const wasRising = isRisingRef.current
    const isRising = combinedScore > prevMagRef.current

    // Peak detection: upward trend flips downward above threshold
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

        // Only count steps if stride cadence is consistent (noise suppression)
        if (strideBufferRef.current >= MIN_STRIDE_BUFFER_COUNT) {
          const nextSteps = Math.min(stepsRef.current + 1, 999_999)
          setSteps(nextSteps)
        }
      }
    }

    prevMagRef.current = combinedScore
    isRisingRef.current = isRising
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / Pause Sensor Listeners ─────────────────────────────────────────

  const startListening = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion, { passive: true })
      window.addEventListener('deviceorientation', handleOrientation, { passive: true })
    }
    setActive(true)
    setPermissionState('granted')
  }, [handleMotion, handleOrientation])

  const pause = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
    setActive(false)
  }, [handleMotion, handleOrientation])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion)
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [handleMotion, handleOrientation])

  // ── Permission Request & Direct Start ─────────────────────────────────────

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined') return

    const motionReq = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    const orientationReq = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission

    if (typeof motionReq === 'function') {
      try {
        await motionReq()
        if (typeof orientationReq === 'function') {
          await orientationReq().catch(() => {})
        }
      } catch {
        /* proceed to start tracking anyway */
      }
    }
    startListening()
  }, [startListening])

  // ── Manual Step Override (Desktop Testing) ─────────────────────────────────

  const addSteps = useCallback((n: number) => {
    const next = Math.min(stepsRef.current + n, 999_999)
    setSteps(next)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const percent = Math.min(100, Math.round((steps / STEP_GOAL) * 100))

  return {
    steps,
    goal: STEP_GOAL,
    percent,
    active,
    permissionState,
    requestPermission,
    startTracking: requestPermission,
    start: requestPermission,
    pause,
    addSteps,
  }
}
