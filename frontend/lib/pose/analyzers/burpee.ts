import { average, dist, landmarkAngle, torsoLength } from '../geometry'
import {
  POSE_LANDMARK,
  type AnalysisTick,
  type AnalyzerConfig,
  type CyclePhase,
  type ExerciseAnalyzer,
  type PoseFrame,
  type PoseLandmark,
  type TrackingStatus,
} from '../types'
import { LandmarkSmoother } from '../smoothing'
import { assessFraming, type FramingProfile } from '../framing'
import { requiredLandmarksReliable, isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

type BurpeePhase = 'idle' | 'stand' | 'squat' | 'plank' | 'rise'

export const BURPEE_THRESHOLDS = {
  standKneeMin: 156,
  squatKneeMax: 110,
  squatHipDrop: 0.1,
  plankAlignMin: 145,
  minPhaseMs: 90,
  minRepMs: 1100,
  maxRepMs: 8000,
  cooldownMs: 500,
  minVisibility: 0.5,
} as const

export class BurpeeAnalyzer implements ExerciseAnalyzer {
  readonly id = 'burpee'
  readonly requiredLandmarks = [
    LM.leftShoulder,
    LM.rightShoulder,
    LM.leftHip,
    LM.rightHip,
    LM.leftKnee,
    LM.rightKnee,
    LM.leftAnkle,
    LM.rightAnkle,
  ] as const
  readonly minVisibility = BURPEE_THRESHOLDS.minVisibility

  private readonly smoother: LandmarkSmoother
  private phase: BurpeePhase = 'idle'
  private completedReps = 0
  private phaseEnteredMs: number | null = null
  private cycleStartMs: number | null = null
  private lastCompletedMs = Number.NEGATIVE_INFINITY
  private lastTs: number | null = null
  private startHipY: number | null = null
  private startTorso: number | null = null

  constructor(config: AnalyzerConfig = {}) {
    this.smoother = new LandmarkSmoother(config.smoothingHalfLifeMs ?? 70)
  }

  framingProfile(): FramingProfile {
    return {
      required: this.requiredLandmarks,
      minVisibility: this.minVisibility,
      preferSideView: true,
      needFeet: true,
    }
  }

  update(frame: PoseFrame): AnalysisTick {
    if (this.lastTs === frame.timestampMs) {
      return this.tick('tracking', 'Hold position.', false, {})
    }

    const landmarks = this.smoother.update(frame.landmarks, frame.timestampMs)
    const framing = assessFraming(landmarks, this.framingProfile())
    if (!framing.ok || !requiredLandmarksReliable(landmarks, this.requiredLandmarks, this.minVisibility)) {
      this.abandon(frame.timestampMs)
      return this.tick(framing.status, framing.message, false, {})
    }

    const knee = average([
      joint(landmarks, LM.leftHip, LM.leftKnee, LM.leftAnkle, this.minVisibility),
      joint(landmarks, LM.rightHip, LM.rightKnee, LM.rightAnkle, this.minVisibility),
    ])
    const plank = average([
      joint(landmarks, LM.leftShoulder, LM.leftHip, LM.leftAnkle, this.minVisibility * 0.85),
      joint(landmarks, LM.rightShoulder, LM.rightHip, LM.rightAnkle, this.minVisibility * 0.85),
    ])
    const hipY = average([landmarks[LM.leftHip]?.y, landmarks[LM.rightHip]?.y])
    const torso = torsoLength(landmarks)
    const standing = knee != null && knee >= BURPEE_THRESHOLDS.standKneeMin && looksUpright(landmarks)

    if (standing && hipY != null && torso != null) {
      this.startHipY = hipY
      this.startTorso = torso
    }

    const hipDrop =
      hipY != null && this.startHipY != null && this.startTorso
        ? (hipY - this.startHipY) / this.startTorso
        : 0
    const squatting =
      knee != null &&
      knee <= BURPEE_THRESHOLDS.squatKneeMax &&
      hipDrop >= BURPEE_THRESHOLDS.squatHipDrop
    const inPlank = plank != null && plank >= BURPEE_THRESHOLDS.plankAlignMin && !looksUpright(landmarks)

    const ts = frame.timestampMs
    const held = this.held(ts)
    let repCompleted = false

    switch (this.phase) {
      case 'idle':
        if (standing && held) this.enter('stand', ts)
        else if (standing) this.markEnter(ts)
        else this.phaseEnteredMs = null
        break
      case 'stand':
        if (squatting && held) {
          this.enter('squat', ts)
          this.cycleStartMs = this.cycleStartMs ?? ts
        } else if (!standing && !squatting && this.timedOut(ts)) {
          this.abandon(ts)
        }
        break
      case 'squat':
        if (inPlank && held) this.enter('plank', ts)
        else if (standing && !inPlank) this.abandon(ts)
        else if (this.timedOut(ts)) this.abandon(ts)
        break
      case 'plank':
        if ((squatting || standing) && held) this.enter('rise', ts)
        else if (this.timedOut(ts)) this.abandon(ts)
        break
      case 'rise':
        if (standing && held) {
          const duration = this.cycleStartMs == null ? 0 : ts - this.cycleStartMs
          const cooled = ts - this.lastCompletedMs >= BURPEE_THRESHOLDS.cooldownMs
          if (
            duration >= BURPEE_THRESHOLDS.minRepMs &&
            duration <= BURPEE_THRESHOLDS.maxRepMs &&
            cooled
          ) {
            this.completedReps += 1
            this.lastCompletedMs = ts
            repCompleted = true
            this.enter('stand', ts)
            this.cycleStartMs = null
          } else {
            this.abandon(ts)
          }
        } else if (this.timedOut(ts)) {
          this.abandon(ts)
        }
        break
    }

    this.lastTs = ts
    const guidance = this.guidance()
    return this.tick(this.phase === 'idle' ? 'ready' : 'tracking', guidance, repCompleted, {
      knee,
      plank,
      hipDrop,
    })
  }

  notifyUnreliable(timestampMs: number, reason = 'Pose not detected — counting paused.'): AnalysisTick {
    this.abandon(timestampMs)
    return this.tick('paused', reason, false, {})
  }

  resetCycle() {
    this.smoother.reset()
    this.abandon(this.lastTs ?? 0)
  }

  resetAll() {
    this.resetCycle()
    this.completedReps = 0
    this.lastCompletedMs = Number.NEGATIVE_INFINITY
  }

  getCompletedReps(): number {
    return this.completedReps
  }

  private enter(phase: BurpeePhase, ts: number) {
    this.phase = phase
    this.phaseEnteredMs = ts
    if (phase === 'squat' && this.cycleStartMs == null) this.cycleStartMs = ts
  }

  private markEnter(ts: number) {
    if (this.phaseEnteredMs == null) this.phaseEnteredMs = ts
  }

  private held(ts: number): boolean {
    return this.phaseEnteredMs != null && ts - this.phaseEnteredMs >= BURPEE_THRESHOLDS.minPhaseMs
  }

  private timedOut(ts: number): boolean {
    return this.cycleStartMs != null && ts - this.cycleStartMs > BURPEE_THRESHOLDS.maxRepMs
  }

  private abandon(ts: number) {
    this.phase = 'idle'
    this.phaseEnteredMs = ts
    this.cycleStartMs = null
    this.lastTs = ts
  }

  private guidance(): string {
    switch (this.phase) {
      case 'idle':
      case 'stand':
        return 'Stand tall, then squat to start the burpee.'
      case 'squat':
        return 'Plant your hands and jump or step back to a plank.'
      case 'plank':
        return 'Jump or step your feet back under you.'
      case 'rise':
        return 'Stand all the way up to count the burpee.'
      default:
        return 'Return to the starting position.'
    }
  }

  private tick(
    tracking: TrackingStatus,
    guidance: string,
    repCompleted: boolean,
    metrics: Record<string, number | null>,
  ): AnalysisTick {
    const phase = toCyclePhase(this.phase)
    return {
      phase,
      tracking,
      guidance,
      formFeedback: null,
      movementDetected: this.phase === 'squat' || this.phase === 'plank' || this.phase === 'rise',
      attemptActive: this.phase === 'squat' || this.phase === 'plank' || this.phase === 'rise',
      repCompleted,
      completedReps: this.completedReps,
      metrics,
    }
  }
}

function toCyclePhase(phase: BurpeePhase): CyclePhase {
  switch (phase) {
    case 'stand':
      return 'ready'
    case 'squat':
      return 'to_end'
    case 'plank':
      return 'at_end'
    case 'rise':
      return 'to_start'
    default:
      return 'idle'
  }
}

function joint(
  landmarks: PoseLandmark[],
  a: number,
  b: number,
  c: number,
  minVisibility: number,
): number | null {
  if (
    !isLandmarkReliable(landmarks[a], minVisibility) ||
    !isLandmarkReliable(landmarks[b], minVisibility) ||
    !isLandmarkReliable(landmarks[c], minVisibility)
  ) {
    return null
  }
  return landmarkAngle(landmarks, a, b, c)
}

function looksUpright(landmarks: PoseLandmark[]): boolean {
  const shoulder = landmarks[LM.leftShoulder] ?? landmarks[LM.rightShoulder]
  const hip = landmarks[LM.leftHip] ?? landmarks[LM.rightHip]
  const ankle = landmarks[LM.leftAnkle] ?? landmarks[LM.rightAnkle]
  if (!shoulder || !hip || !ankle) return false
  return shoulder.y + 0.08 < hip.y && hip.y + 0.1 < ankle.y && dist(hip, ankle) > 0.12
}
