import { average, dist, landmarkAngle } from '../geometry'
import { POSE_LANDMARK, type AnalyzerConfig, type PoseLandmark } from '../types'
import { BaseCycleAnalyzer } from '../baseAnalyzer'
import type { FramingProfile } from '../framing'
import type { CycleFlags } from '../cycleMachine'
import { isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

export const PUSH_UP_THRESHOLDS = {
  extendedElbowMin: 158,
  depthElbowMax: 92,
  towardEndElbow: 145,
  towardStartElbow: 110,
  plankAlignMin: 148,
  wallAlignMin: 112,
  maxHipSag: 128,
  minVisibility: 0.55,
} as const

export class PushUpAnalyzer extends BaseCycleAnalyzer {
  readonly id = 'pushup'
  readonly requiredLandmarks = [
    LM.leftShoulder,
    LM.rightShoulder,
    LM.leftElbow,
    LM.rightElbow,
    LM.leftWrist,
    LM.rightWrist,
    LM.leftHip,
    LM.rightHip,
  ] as const

  private readonly variant: 'floor' | 'wall'

  constructor(config: AnalyzerConfig = {}) {
    super(
      {
        minStartHoldMs: 180,
        minEndHoldMs: 80,
        minRepMs: 650,
        maxRepMs: 5000,
        cooldownMs: 380,
      },
      { minVisibility: PUSH_UP_THRESHOLDS.minVisibility, ...config },
    )
    this.variant = config.variant === 'wall' ? 'wall' : 'floor'
  }

  framingProfile(): FramingProfile {
    return {
      required: this.requiredLandmarks,
      minVisibility: this.minVisibility,
      preferSideView: true,
      needWrists: true,
    }
  }

  protected override startPrompt(): string {
    return this.variant === 'wall'
      ? 'Straighten both arms against the wall to begin.'
      : 'Hold a straight plank with arms extended to begin.'
  }

  protected override endPrompt(): string {
    return 'Lower until both elbows reach full push-up depth.'
  }

  protected override returnPrompt(): string {
    return 'Press back to full elbow extension to count the rep.'
  }

  protected flagsFor(landmarks: PoseLandmark[]): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
    guidanceOverride?: string
  } {
    const elbow = average([
      joint(landmarks, LM.leftShoulder, LM.leftElbow, LM.leftWrist, this.minVisibility),
      joint(landmarks, LM.rightShoulder, LM.rightElbow, LM.rightWrist, this.minVisibility),
    ])
    const plank = average([
      joint(landmarks, LM.leftShoulder, LM.leftHip, LM.leftAnkle, this.minVisibility * 0.85),
      joint(landmarks, LM.rightShoulder, LM.rightHip, LM.rightAnkle, this.minVisibility * 0.85),
    ])

    const bodyAlignmentOk = this.alignmentOk(landmarks, plank)
    const standing = looksStanding(landmarks)

    if (standing && this.variant === 'floor') {
      return {
        atStart: false,
        atEnd: false,
        towardEnd: false,
        towardStart: false,
        valid: false,
        formFeedback: null,
        guidanceOverride: 'Get into a plank. Standing arm bends are not push-ups.',
        metrics: { elbow, plank },
      }
    }

    const atStart = elbow != null && elbow >= PUSH_UP_THRESHOLDS.extendedElbowMin && bodyAlignmentOk
    const atEnd = elbow != null && elbow <= PUSH_UP_THRESHOLDS.depthElbowMax && bodyAlignmentOk
    const towardEnd = elbow != null && elbow <= PUSH_UP_THRESHOLDS.towardEndElbow
    const towardStart = elbow != null && elbow >= PUSH_UP_THRESHOLDS.towardStartElbow

    let formFeedback: string | null = null
    if (plank != null && plank < PUSH_UP_THRESHOLDS.maxHipSag && this.variant === 'floor') {
      formFeedback = 'Keep hips in line with shoulders. Avoid sagging.'
    }

    return {
      atStart,
      atEnd,
      towardEnd,
      towardStart,
      valid: elbow != null && bodyAlignmentOk,
      formFeedback,
      guidanceOverride: bodyAlignmentOk ? undefined : 'Keep a straight body line to continue counting.',
      metrics: { elbow, plank },
    }
  }

  private alignmentOk(landmarks: PoseLandmark[], plank: number | null): boolean {
    if (this.variant === 'wall') {
      return plank == null || plank >= PUSH_UP_THRESHOLDS.wallAlignMin
    }
    if (plank != null) return plank >= PUSH_UP_THRESHOLDS.plankAlignMin
    const leftShoulder = landmarks[LM.leftShoulder]
    const leftHip = landmarks[LM.leftHip]
    const rightShoulder = landmarks[LM.rightShoulder]
    const rightHip = landmarks[LM.rightHip]
    if (!leftShoulder || !leftHip || !rightShoulder || !rightHip) return false
    const drop = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2)
    return drop < 0.16
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
  const hipToAnkle = dist(hip, ankle)
  const shoulderToHip = dist(shoulder, hip)
  if (hipToAnkle < 0.08 || shoulderToHip < 0.06) return false
  return hip.y + 0.12 < ankle.y && shoulder.y + 0.1 < hip.y
}
