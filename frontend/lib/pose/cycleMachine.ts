import type { CyclePhase } from './types'

export type CycleFlags = {
  atStart: boolean
  atEnd: boolean
  towardEnd: boolean
  towardStart: boolean
  valid: boolean
}

export type CycleMachineConfig = {
  minStartHoldMs: number
  minEndHoldMs: number
  minRepMs: number
  maxRepMs: number
  cooldownMs: number
}

export type CycleTick = {
  phase: CyclePhase
  completedReps: number
  repCompleted: boolean
  attemptActive: boolean
  movementDetected: boolean
  cycleDurationMs: number | null
}

const DEFAULTS: CycleMachineConfig = {
  minStartHoldMs: 180,
  minEndHoldMs: 90,
  minRepMs: 700,
  maxRepMs: 6000,
  cooldownMs: 400,
}

export class DepthCycleMachine {
  phase: CyclePhase = 'idle'
  completedReps = 0

  private startHoldMs = 0
  private endHoldMs = 0
  private cycleStartMs: number | null = null
  private lastCompletedMs = Number.NEGATIVE_INFINITY
  private lastTs: number | null = null
  private lastTick: CycleTick
  private readonly config: CycleMachineConfig

  constructor(config: Partial<CycleMachineConfig> = {}) {
    this.config = { ...DEFAULTS, ...config }
    this.lastTick = this.snapshot(false, false)
  }

  update(timestampMs: number, flags: CycleFlags): CycleTick {
    if (this.lastTs != null && timestampMs === this.lastTs) {
      return this.lastTick
    }

    if (!flags.valid) {
      this.abandonAttempt()
      this.lastTs = timestampMs
      this.lastTick = this.snapshot(false, false)
      return this.lastTick
    }

    const dt = this.lastTs == null ? 0 : Math.max(0, timestampMs - this.lastTs)
    this.lastTs = timestampMs

    const atStart = flags.atStart && !flags.atEnd
    const atEnd = flags.atEnd && !flags.atStart
    let repCompleted = false

    switch (this.phase) {
      case 'idle':
      case 'completed':
        this.phase = 'idle'
        if (atStart) {
          this.startHoldMs += dt
          if (this.startHoldMs >= this.config.minStartHoldMs) {
            this.phase = 'ready'
          }
        } else {
          this.startHoldMs = 0
        }
        break

      case 'ready':
        if (atStart) {
          this.startHoldMs += dt
        } else if (flags.towardEnd) {
          this.phase = 'to_end'
          this.cycleStartMs = timestampMs
          this.endHoldMs = 0
          this.startHoldMs = 0
        }
        break

      case 'to_end':
        if (atEnd) {
          this.endHoldMs += dt
          if (this.endHoldMs >= this.config.minEndHoldMs) {
            this.phase = 'at_end'
          }
        } else if (atStart) {
          this.abandonAttempt()
          this.startHoldMs = this.config.minStartHoldMs
          this.phase = 'ready'
        } else {
          this.endHoldMs = 0
          if (this.timedOut(timestampMs)) {
            this.abandonAttempt()
          }
        }
        break

      case 'at_end':
        if (atEnd) {
          this.endHoldMs += dt
        } else if (flags.towardStart || atStart) {
          this.phase = 'to_start'
          this.endHoldMs = 0
        }
        break

      case 'to_start':
        if (atStart) {
          const duration = this.cycleStartMs == null ? 0 : timestampMs - this.cycleStartMs
          const cooled = timestampMs - this.lastCompletedMs >= this.config.cooldownMs
          if (
            duration >= this.config.minRepMs &&
            duration <= this.config.maxRepMs &&
            cooled
          ) {
            this.completedReps += 1
            this.lastCompletedMs = timestampMs
            repCompleted = true
            this.phase = 'ready'
            this.startHoldMs = this.config.minStartHoldMs
            this.cycleStartMs = null
          } else {
            this.abandonAttempt()
            this.startHoldMs = this.config.minStartHoldMs
            this.phase = 'ready'
          }
        } else if (atEnd) {
          this.phase = 'at_end'
          this.endHoldMs = 0
        } else if (this.timedOut(timestampMs)) {
          this.abandonAttempt()
        }
        break
    }

    const movementDetected = flags.towardEnd || flags.towardStart || this.phase === 'to_end' || this.phase === 'to_start'
    this.lastTick = this.snapshot(repCompleted, movementDetected)
    return this.lastTick
  }

  notifyUnreliable(timestampMs: number): CycleTick {
    this.abandonAttempt()
    this.lastTs = timestampMs
    this.lastTick = this.snapshot(false, false)
    return this.lastTick
  }

  resetCycle() {
    this.abandonAttempt()
    this.lastTs = null
  }

  resetAll() {
    this.resetCycle()
    this.completedReps = 0
    this.lastCompletedMs = Number.NEGATIVE_INFINITY
    this.lastTick = this.snapshot(false, false)
  }

  private timedOut(timestampMs: number): boolean {
    return this.cycleStartMs != null && timestampMs - this.cycleStartMs > this.config.maxRepMs
  }

  private abandonAttempt() {
    this.phase = 'idle'
    this.startHoldMs = 0
    this.endHoldMs = 0
    this.cycleStartMs = null
  }

  private snapshot(repCompleted: boolean, movementDetected: boolean): CycleTick {
    return {
      phase: this.phase,
      completedReps: this.completedReps,
      repCompleted,
      attemptActive: this.phase === 'to_end' || this.phase === 'at_end' || this.phase === 'to_start',
      movementDetected,
      cycleDurationMs: this.cycleStartMs == null || this.lastTs == null ? null : this.lastTs - this.cycleStartMs,
    }
  }
}
