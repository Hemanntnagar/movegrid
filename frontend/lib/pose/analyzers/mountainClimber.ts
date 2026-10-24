import { average, dist, landmarkAngle } from '../geometry'
import { POSE_LANDMARK, type AnalyzerConfig, type PoseLandmark } from '../types'
import { BaseCycleAnalyzer } from '../baseAnalyzer'
import type { FramingProfile } from '../framing'
import type { CycleFlags } from '../cycleMachine'
import { isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

export const MOUNTAIN_CLIMBER_THRESHOLDS = {
  plankKneeMin: 145,
  driveKneeMax: 92,
  towardDrive: 130,
  towardPlank: 118,
  plankAlignMin: 140,
  minVisibility: 0.5,
} as const

export class MountainClimberAnalyzer extends BaseCycleAnalyzer {
  readonly id = 'mountain_climber'
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

  constructor(config: AnalyzerConfig = {}) {
    super(
      {
        minStartHoldMs: 140,
        minEndHoldMs: 60,
        minRepMs: 280,
        maxRepMs: 2200,
        cooldownMs: 160,
      },
      { minVisibility: MOUNTAIN_CLIMBER_THRESHOLDS.minVisibility, ...config },
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

  protected override startPrompt(): string {
    return 'Hold a plank with both legs extended to begin.'
  }

  protected override endPrompt(): string {
    return 'Drive one knee toward your chest.'
  }

  protected override returnPrompt(): string {
    return 'Extend the driving leg back to plank to count the rep.'
  }

  protected flagsFor(landmarks: PoseLandmark[]): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
    guidanceOverride?: string
  } {
    const leftKnee = joint(landmarks, LM.leftHip, LM.leftKnee, LM.leftAnkle, this.minVisibility)
    const rightKnee = joint(landmarks, LM.rightHip, LM.rightKnee, LM.rightAnkle, this.minVisibility)
    const plank = average([
      joint(landmarks, LM.leftShoulder, LM.leftHip, LM.leftAnkle, this.minVisibility * 0.85),
      joint(landmarks, LM.rightShoulder, LM.rightHip, LM.rightAnkle, this.minVisibility * 0.85),
    ])

    if (looksStanding(landmarks)) {
      return {
        atStart: false,
        atEnd: false,
        towardEnd: false,
        towardStart: false,
        valid: false,
        formFeedback: null,
        guidanceOverride: 'Get into a plank. Standing knee lifts are not mountain climbers.',
        metrics: { leftKnee, rightKnee, plank },
      }
    }

    const bothExtended =
      leftKnee != null &&
      rightKnee != null &&
      leftKnee >= MOUNTAIN_CLIMBER_THRESHOLDS.plankKneeMin &&
      rightKnee >= MOUNTAIN_CLIMBER_THRESHOLDS.plankKneeMin
    const oneDriven =
      (leftKnee != null && leftKnee <= MOUNTAIN_CLIMBER_THRESHOLDS.driveKneeMax) ||
      (rightKnee != null && rightKnee <= MOUNTAIN_CLIMBER_THRESHOLDS.driveKneeMax)
    const aligned = plank == null || plank >= MOUNTAIN_CLIMBER_THRESHOLDS.plankAlignMin

    return {
      atStart: bothExtended && aligned,
      atEnd: oneDriven && aligned,
      towardEnd:
        (leftKnee != null && leftKnee <= MOUNTAIN_CLIMBER_THRESHOLDS.towardDrive) ||
        (rightKnee != null && rightKnee <= MOUNTAIN_CLIMBER_THRESHOLDS.towardDrive),
      towardStart:
        (leftKnee == null || leftKnee >= MOUNTAIN_CLIMBER_THRESHOLDS.towardPlank) &&
        (rightKnee == null || rightKnee >= MOUNTAIN_CLIMBER_THRESHOLDS.towardPlank),
      valid: leftKnee != null && rightKnee != null && aligned,
      formFeedback: aligned ? null : 'Keep your hips from piking or sagging.',
      metrics: { leftKnee, rightKnee, plank },
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

function looksStanding(landmarks: PoseLandmark[]): boolean {
  const shoulder = landmarks[LM.leftShoulder] ?? landmarks[LM.rightShoulder]
  const hip = landmarks[LM.leftHip] ?? landmarks[LM.rightHip]
  const ankle = landmarks[LM.leftAnkle] ?? landmarks[LM.rightAnkle]
  if (!shoulder || !hip || !ankle) return false
  return hip.y + 0.12 < ankle.y && shoulder.y + 0.1 < hip.y && dist(hip, ankle) > 0.12
}
