import { average, landmarkAngle, torsoLength } from '../geometry'
import { POSE_LANDMARK, type AnalyzerConfig, type PoseLandmark } from '../types'
import { BaseCycleAnalyzer } from '../baseAnalyzer'
import type { FramingProfile } from '../framing'
import type { CycleFlags } from '../cycleMachine'
import { isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

export const SQUAT_THRESHOLDS = {
  standingKneeMin: 158,
  standingHipMin: 152,
  depthKneeMax: 96,
  depthHipMax: 102,
  towardEndKnee: 146,
  towardStartKnee: 112,
  minHipDrop: 0.12,
  standingHipDropMax: 0.055,
  minVisibility: 0.55,
} as const

export class SquatAnalyzer extends BaseCycleAnalyzer {
  readonly id = 'squat'
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

  private startHipY: number | null = null
  private startTorso: number | null = null

  constructor(config: AnalyzerConfig = {}) {
    super(
      {
        minStartHoldMs: 200,
        minEndHoldMs: 90,
        minRepMs: 750,
        maxRepMs: 5500,
        cooldownMs: 450,
      },
      { minVisibility: SQUAT_THRESHOLDS.minVisibility, ...config },
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
    return 'Stand tall with hips and knees extended to begin.'
  }

  protected override endPrompt(): string {
    return 'Descend until hips and knees reach squat depth.'
  }

  protected override returnPrompt(): string {
    return 'Drive up to a full stand to count the rep.'
  }

  protected flagsFor(landmarks: PoseLandmark[], _timestampMs: number): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
    guidanceOverride?: string
  } {
    const knee = average([
      sideAngle(landmarks, LM.leftHip, LM.leftKnee, LM.leftAnkle, this.minVisibility),
      sideAngle(landmarks, LM.rightHip, LM.rightKnee, LM.rightAnkle, this.minVisibility),
    ])
    const hip = average([
      sideAngle(landmarks, LM.leftShoulder, LM.leftHip, LM.leftKnee, this.minVisibility),
      sideAngle(landmarks, LM.rightShoulder, LM.rightHip, LM.rightKnee, this.minVisibility),
    ])
    const torso = torsoLength(landmarks)
    const hipY = average([landmarks[LM.leftHip]?.y, landmarks[LM.rightHip]?.y])

    const standing =
      knee != null &&
      hip != null &&
      knee >= SQUAT_THRESHOLDS.standingKneeMin &&
      hip >= SQUAT_THRESHOLDS.standingHipMin

    if (standing && hipY != null && torso != null) {
      this.startHipY = hipY
      this.startTorso = torso
    }

    const hipDrop =
      hipY != null && this.startHipY != null && this.startTorso
        ? (hipY - this.startHipY) / this.startTorso
        : null

    const atStart =
      standing && (hipDrop == null || hipDrop <= SQUAT_THRESHOLDS.standingHipDropMax)
    const atEnd =
      knee != null &&
      hip != null &&
      hipDrop != null &&
      knee <= SQUAT_THRESHOLDS.depthKneeMax &&
      hip <= SQUAT_THRESHOLDS.depthHipMax &&
      hipDrop >= SQUAT_THRESHOLDS.minHipDrop
    const towardEnd =
      (knee != null && knee <= SQUAT_THRESHOLDS.towardEndKnee) ||
      (hip != null && hip <= SQUAT_THRESHOLDS.standingHipMin - 8)
    const towardStart =
      (knee != null && knee >= SQUAT_THRESHOLDS.towardStartKnee) ||
      (hip != null && hip >= SQUAT_THRESHOLDS.depthHipMax + 12)

    let formFeedback: string | null = null
    const back = average([
      sideAngle(landmarks, LM.leftShoulder, LM.leftHip, LM.leftKnee, this.minVisibility),
      sideAngle(landmarks, LM.rightShoulder, LM.rightHip, LM.rightKnee, this.minVisibility),
    ])
    if (back != null && back < 70 && towardEnd) {
      formFeedback = 'Keep your chest lifted. Avoid collapsing the torso.'
    }

    return {
      atStart,
      atEnd,
      towardEnd,
      towardStart,
      valid: knee != null && hip != null,
      formFeedback,
      metrics: { knee, hip, hipDrop },
    }
  }
}

function sideAngle(
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
