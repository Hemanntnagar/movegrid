import { average, landmarkAngle, torsoLength } from '../geometry'
import { POSE_LANDMARK, type AnalyzerConfig, type PoseLandmark } from '../types'
import { BaseCycleAnalyzer } from '../baseAnalyzer'
import type { FramingProfile } from '../framing'
import type { CycleFlags } from '../cycleMachine'
import { isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

export const LUNGE_THRESHOLDS = {
  standingKneeMin: 156,
  frontKneeMax: 108,
  rearKneeMax: 135,
  towardEndFront: 140,
  towardStartFront: 122,
  minHipDrop: 0.08,
  standingHipDropMax: 0.05,
  minVisibility: 0.52,
} as const

export class LungeAnalyzer extends BaseCycleAnalyzer {
  readonly id = 'lunge'
  readonly requiredLandmarks = [
    LM.leftHip,
    LM.rightHip,
    LM.leftKnee,
    LM.rightKnee,
    LM.leftAnkle,
    LM.rightAnkle,
    LM.leftShoulder,
    LM.rightShoulder,
  ] as const

  private startHipY: number | null = null
  private startTorso: number | null = null

  constructor(config: AnalyzerConfig = {}) {
    super(
      {
        minStartHoldMs: 180,
        minEndHoldMs: 90,
        minRepMs: 700,
        maxRepMs: 5000,
        cooldownMs: 400,
      },
      { minVisibility: LUNGE_THRESHOLDS.minVisibility, ...config },
    )
  }

  framingProfile(): FramingProfile {
    return {
      required: this.requiredLandmarks,
      minVisibility: this.minVisibility,
      preferSideView: true,
      needFeet: true,
    }
  }

  override resetCycle() {
    super.resetCycle()
    this.startHipY = null
    this.startTorso = null
  }

  override resetAll() {
    super.resetAll()
    this.startHipY = null
    this.startTorso = null
  }

  protected override startPrompt(): string {
    return 'Stand tall with both knees extended to begin the lunge.'
  }

  protected override endPrompt(): string {
    return 'Step into a lunge until the front knee reaches depth.'
  }

  protected override returnPrompt(): string {
    return 'Push back to a full stand to count the rep.'
  }

  protected flagsFor(landmarks: PoseLandmark[]): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
  } {
    const leftKnee = joint(landmarks, LM.leftHip, LM.leftKnee, LM.leftAnkle, this.minVisibility)
    const rightKnee = joint(landmarks, LM.rightHip, LM.rightKnee, LM.rightAnkle, this.minVisibility)
    const hipY = average([landmarks[LM.leftHip]?.y, landmarks[LM.rightHip]?.y])
    const torso = torsoLength(landmarks)
    const standing =
      leftKnee != null &&
      rightKnee != null &&
      leftKnee >= LUNGE_THRESHOLDS.standingKneeMin &&
      rightKnee >= LUNGE_THRESHOLDS.standingKneeMin

    if (standing && hipY != null && torso != null) {
      this.startHipY = hipY
      this.startTorso = torso
    }

    const hipDrop =
      hipY != null && this.startHipY != null && this.startTorso
        ? (hipY - this.startHipY) / this.startTorso
        : null

    const split =
      leftKnee != null &&
      rightKnee != null &&
      ((leftKnee <= LUNGE_THRESHOLDS.frontKneeMax && rightKnee <= LUNGE_THRESHOLDS.rearKneeMax) ||
        (rightKnee <= LUNGE_THRESHOLDS.frontKneeMax && leftKnee <= LUNGE_THRESHOLDS.rearKneeMax))

    const atStart = standing && (hipDrop == null || hipDrop <= LUNGE_THRESHOLDS.standingHipDropMax)
    const atEnd =
      split && hipDrop != null && hipDrop >= LUNGE_THRESHOLDS.minHipDrop
    const minKnee = average([leftKnee, rightKnee])
    const towardEnd =
      (leftKnee != null && leftKnee <= LUNGE_THRESHOLDS.towardEndFront) ||
      (rightKnee != null && rightKnee <= LUNGE_THRESHOLDS.towardEndFront)
    const towardStart =
      (leftKnee != null && leftKnee >= LUNGE_THRESHOLDS.towardStartFront) &&
      (rightKnee != null && rightKnee >= LUNGE_THRESHOLDS.towardStartFront)

    return {
      atStart,
      atEnd,
      towardEnd,
      towardStart,
      valid: leftKnee != null && rightKnee != null,
      formFeedback: null,
      metrics: { leftKnee, rightKnee, hipDrop, minKnee },
    }
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
