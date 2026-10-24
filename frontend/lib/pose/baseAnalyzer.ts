import { LandmarkSmoother } from './smoothing'
import { assessFraming, type FramingProfile } from './framing'
import { requiredLandmarksReliable } from './validator'
import type {
  AnalysisTick,
  AnalyzerConfig,
  CyclePhase,
  ExerciseAnalyzer,
  PoseFrame,
  PoseLandmark,
  TrackingStatus,
} from './types'
import { DepthCycleMachine, type CycleFlags, type CycleTick } from './cycleMachine'

export abstract class BaseCycleAnalyzer implements ExerciseAnalyzer {
  abstract readonly id: string
  abstract readonly requiredLandmarks: readonly number[]
  readonly minVisibility: number

  protected readonly smoother: LandmarkSmoother
  protected readonly machine: DepthCycleMachine
  private lastGuidance = 'Pose not detected — counting paused.'
  private lastTick: AnalysisTick

  constructor(
    machineConfig: ConstructorParameters<typeof DepthCycleMachine>[0],
    config: AnalyzerConfig = {},
  ) {
    this.minVisibility = config.minVisibility ?? 0.55
    this.smoother = new LandmarkSmoother(config.smoothingHalfLifeMs ?? 70)
    this.machine = new DepthCycleMachine(machineConfig)
    this.lastTick = this.buildTick(this.machine.notifyUnreliable(0), 'searching', this.lastGuidance, null, {})
  }

  abstract framingProfile(): FramingProfile
  protected abstract flagsFor(landmarks: PoseLandmark[], timestampMs: number): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
    guidanceOverride?: string
  }

  update(frame: PoseFrame): AnalysisTick {
    const smoothed = this.smoother.update(frame.landmarks, frame.timestampMs)
    const framing = assessFraming(smoothed, this.framingProfile())

    if (!framing.ok || !requiredLandmarksReliable(smoothed, this.requiredLandmarks, this.minVisibility)) {
      const cycle = this.machine.notifyUnreliable(frame.timestampMs)
      this.lastGuidance = framing.message
      this.lastTick = this.buildTick(cycle, framing.status, framing.message, null, {})
      return this.lastTick
    }

    const measured = this.flagsFor(smoothed, frame.timestampMs)
    if (!measured.valid) {
      const cycle = this.machine.notifyUnreliable(frame.timestampMs)
      const guidance = measured.guidanceOverride ?? framing.message
      this.lastGuidance = guidance
      this.lastTick = this.buildTick(cycle, 'unreliable', guidance, measured.formFeedback, measured.metrics)
      return this.lastTick
    }

    const cycle = this.machine.update(frame.timestampMs, measured)
    const tracking: TrackingStatus = cycle.phase === 'idle' ? 'ready' : 'tracking'
    const guidance =
      measured.guidanceOverride ??
      guidanceForPhase(cycle.phase, this.lastGuidance, this.startPrompt(), this.endPrompt(), this.returnPrompt())
    this.lastGuidance = guidance
    this.lastTick = this.buildTick(cycle, tracking, guidance, measured.formFeedback, measured.metrics)
    return this.lastTick
  }

  notifyUnreliable(timestampMs: number, reason = 'Pose not detected — counting paused.'): AnalysisTick {
    const cycle = this.machine.notifyUnreliable(timestampMs)
    this.lastGuidance = reason
    this.lastTick = this.buildTick(cycle, 'paused', reason, null, {})
    return this.lastTick
  }

  resetCycle() {
    this.smoother.reset()
    this.machine.resetCycle()
  }

  resetAll() {
    this.smoother.reset()
    this.machine.resetAll()
  }

  getCompletedReps(): number {
    return this.machine.completedReps
  }

  protected startPrompt(): string {
    return 'Return to the starting position.'
  }

  protected endPrompt(): string {
    return 'Complete the full range of motion.'
  }

  protected returnPrompt(): string {
    return 'Return to the starting position to count the rep.'
  }

  private buildTick(
    cycle: CycleTick,
    tracking: TrackingStatus,
    guidance: string,
    formFeedback: string | null,
    metrics: Record<string, number | null>,
  ): AnalysisTick {
    return {
      phase: cycle.phase,
      tracking,
      guidance,
      formFeedback,
      movementDetected: cycle.movementDetected,
      attemptActive: cycle.attemptActive,
      repCompleted: cycle.repCompleted,
      completedReps: cycle.completedReps,
      metrics,
    }
  }
}

export function guidanceForPhase(
  phase: CyclePhase,
  fallback: string,
  startPrompt: string,
  endPrompt: string,
  returnPrompt: string,
): string {
  switch (phase) {
    case 'idle':
    case 'ready':
      return startPrompt
    case 'to_end':
      return endPrompt
    case 'at_end':
      return returnPrompt
    case 'to_start':
      return returnPrompt
    case 'completed':
      return 'Rep counted. Set up for the next one.'
    default:
      return fallback
  }
}
