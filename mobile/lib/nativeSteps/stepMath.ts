/**
 * Pure step-total reconciler for native pedometer sources.
 *
 * - iOS: CMPedometer day query (authoritative) + live watch deltas
 * - Android: Health Connect day aggregate (background) + TYPE_STEP_COUNTER watch
 *
 * Never sums overlapping sources — always takes the max of independent estimates.
 */

export type StepSnapshot = {
  /** IST calendar day key YYYY-MM-DD */
  dateKey: string
  /** Best-known steps for dateKey (monotonic within the day) */
  steps: number
  /** Daily steps committed when the current watch subscription started */
  sessionBase: number
  /** Last steps value reported by Pedometer.watchStepCount for this session */
  lastWatchSteps: number
}

export function emptySnapshot(dateKey: string): StepSnapshot {
  return { dateKey, steps: 0, sessionBase: 0, lastWatchSteps: 0 }
}

/** Roll to a new IST day — drop previous totals to avoid carrying steps over. */
export function ensureDate(snapshot: StepSnapshot, dateKey: string): StepSnapshot {
  if (snapshot.dateKey === dateKey) return snapshot
  return emptySnapshot(dateKey)
}

/**
 * Apply a platform day-total query (iOS getStepCountAsync or Android Health Connect).
 * Uses max() so a stale/lower query cannot erase local progress.
 */
export function applyDayQuery(snapshot: StepSnapshot, dateKey: string, queriedSteps: number): StepSnapshot {
  const base = ensureDate(snapshot, dateKey)
  const safe = clampSteps(queriedSteps)
  return {
    ...base,
    steps: Math.max(base.steps, safe),
  }
}

/**
 * Apply a Pedometer.watchStepCount update.
 *
 * Expo Android reports steps relative to subscription start (TYPE_STEP_COUNTER delta).
 * Expo iOS CMPedometer startUpdates similarly reports steps since watch start.
 * A drop in watch steps indicates sensor reboot or a new subscription — re-baseline.
 */
export function applyWatchUpdate(snapshot: StepSnapshot, dateKey: string, watchSteps: number): StepSnapshot {
  let next = ensureDate(snapshot, dateKey)
  const safeWatch = clampSteps(watchSteps)

  if (safeWatch < next.lastWatchSteps) {
    // Sensor counter reset (reboot) or subscription restarted mid-day.
    next = {
      ...next,
      sessionBase: next.steps,
      lastWatchSteps: 0,
    }
  }

  const candidate = next.sessionBase + safeWatch
  return {
    ...next,
    lastWatchSteps: safeWatch,
    steps: Math.max(next.steps, clampSteps(candidate)),
  }
}

/** Begin a new watch session without losing the committed daily total. */
export function beginWatchSession(snapshot: StepSnapshot, dateKey: string): StepSnapshot {
  const base = ensureDate(snapshot, dateKey)
  return {
    ...base,
    sessionBase: base.steps,
    lastWatchSteps: 0,
  }
}

export function clampSteps(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(Math.floor(n), 999_999)
}
