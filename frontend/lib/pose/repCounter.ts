import type { AnalysisTick, ExerciseAnalyzer, PoseFrame } from './types'

export type RepEvent =
  | { type: 'rep_completed'; reps: number; timestampMs: number }
  | { type: 'attempt_started'; timestampMs: number }
  | { type: 'attempt_abandoned'; timestampMs: number }

/**
 * Guards the analyzer so one completed movement can increment at most once,
 * and unreliable frames never change the accumulated count.
 */
export class RepCounter {
  private lastEmitted = 0
  private attemptWasActive = false
  private readonly events: RepEvent[] = []

  constructor(private readonly analyzer: ExerciseAnalyzer) {}

  ingest(frame: PoseFrame): AnalysisTick {
    const tick = this.analyzer.update(frame)
    return this.observe(tick, frame.timestampMs)
  }

  ingestUnreliable(timestampMs: number, reason?: string): AnalysisTick {
    const tick = this.analyzer.notifyUnreliable(timestampMs, reason)
    return this.observe(tick, timestampMs)
  }

  reset() {
    this.analyzer.resetAll()
    this.lastEmitted = 0
    this.attemptWasActive = false
    this.events.length = 0
  }

  resetCycle() {
    this.analyzer.resetCycle()
    this.attemptWasActive = false
  }

  getCompletedReps(): number {
    return this.lastEmitted
  }

  getEvents(): readonly RepEvent[] {
    return this.events
  }

  private observe(tick: AnalysisTick, timestampMs: number): AnalysisTick {
    if (tick.attemptActive && !this.attemptWasActive) {
      this.events.push({ type: 'attempt_started', timestampMs })
    }
    if (!tick.attemptActive && this.attemptWasActive && !tick.repCompleted) {
      this.events.push({ type: 'attempt_abandoned', timestampMs })
    }
    this.attemptWasActive = tick.attemptActive

    if (!tick.repCompleted) {
      return { ...tick, completedReps: this.lastEmitted, repCompleted: false }
    }

    const next = tick.completedReps
    if (next !== this.lastEmitted + 1) {
      return { ...tick, completedReps: this.lastEmitted, repCompleted: false }
    }

    this.lastEmitted = next
    this.events.push({ type: 'rep_completed', reps: next, timestampMs })
    return { ...tick, completedReps: this.lastEmitted, repCompleted: true }
  }
}
