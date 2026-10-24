import { average, angleAt, landmarkAngle } from '../geometry'
import { POSE_LANDMARK, type AnalyzerConfig, type PoseLandmark } from '../types'
import { BaseCycleAnalyzer } from '../baseAnalyzer'
import type { FramingProfile } from '../framing'
import type { CycleFlags } from '../cycleMachine'
import { isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

export const BICEP_CURL_THRESHOLDS = {
  extendedElbowMin: 152,
  flexedElbowMax: 68,
  towardEndElbow: 138,
  towardStartElbow: 88,
  maxUpperArmTravel: 38,
  minVisibility: 0.55,
} as const

export class BicepCurlAnalyzer extends BaseCycleAnalyzer {
  readonly id = 'bicep_curl'
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

  private startUpperArm: { left: number; right: number } | null = null

  constructor(config: AnalyzerConfig = {}) {
    super(
      {
        minStartHoldMs: 160,
        minEndHoldMs: 80,
        minRepMs: 520,
        maxRepMs: 4000,
        cooldownMs: 320,
      },
      { minVisibility: BICEP_CURL_THRESHOLDS.minVisibility, ...config },
    )
  }

  framingProfile(): FramingProfile {
    return {
      required: this.requiredLandmarks,
      minVisibility: this.minVisibility,
      preferSideView: true,
      needWrists: true,
    }
  }

  override resetCycle() {
    super.resetCycle()
    this.startUpperArm = null
  }

  override resetAll() {
    super.resetAll()
    this.startUpperArm = null
  }

  protected override startPrompt(): string {
    return 'Stand with both elbows extended at your sides to begin.'
  }

  protected override endPrompt(): string {
    return 'Curl until the working elbow is fully flexed. Keep the upper arm still.'
  }

  protected override returnPrompt(): string {
    return 'Lower under control to full elbow extension to count the rep.'
  }

  protected flagsFor(landmarks: PoseLandmark[]): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
    guidanceOverride?: string
  } {
    const left = joint(landmarks, LM.leftShoulder, LM.leftElbow, LM.leftWrist, this.minVisibility)
    const right = joint(landmarks, LM.rightShoulder, LM.rightElbow, LM.rightWrist, this.minVisibility)
    const elbow = chooseWorking(left, right)
    const upperArmLeft = upperArmDeviation(landmarks, 'left')
    const upperArmRight = upperArmDeviation(landmarks, 'right')

    const extended =
      (left != null && left >= BICEP_CURL_THRESHOLDS.extendedElbowMin) ||
      (right != null && right >= BICEP_CURL_THRESHOLDS.extendedElbowMin)

    if (extended) {
      this.startUpperArm = {
        left: upperArmLeft ?? 0,
        right: upperArmRight ?? 0,
      }
    }

    const leftTravel = delta(upperArmLeft, this.startUpperArm?.left)
    const rightTravel = delta(upperArmRight, this.startUpperArm?.right)
    const upperArmTravel = average([leftTravel, rightTravel])
    const stableUpperArm =
      upperArmTravel == null || upperArmTravel <= BICEP_CURL_THRESHOLDS.maxUpperArmTravel

    const atStart = extended && stableUpperArm
    const atEnd =
      elbow != null &&
      elbow <= BICEP_CURL_THRESHOLDS.flexedElbowMax &&
      stableUpperArm
    const towardEnd = elbow != null && elbow <= BICEP_CURL_THRESHOLDS.towardEndElbow
    const towardStart = elbow != null && elbow >= BICEP_CURL_THRESHOLDS.towardStartElbow

    let formFeedback: string | null = null
    if (!stableUpperArm && towardEnd) {
      formFeedback = 'Keep the upper arm pinned. This looks like a swing or raise, not a curl.'
    }

    return {
      atStart,
      atEnd: atEnd && stableUpperArm,
      towardEnd: towardEnd && (stableUpperArm || elbow != null),
      towardStart,
      valid: elbow != null,
      formFeedback,
      guidanceOverride: stableUpperArm
        ? undefined
        : 'Keep your elbows at your sides — punching or swinging will not count.',
      metrics: { elbow, left, right, upperArmTravel },
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

function chooseWorking(left: number | null, right: number | null): number | null {
  if (left == null) return right
  if (right == null) return left
  return Math.min(left, right)
}

function upperArmDeviation(landmarks: PoseLandmark[], side: 'left' | 'right'): number | null {
  const shoulder = landmarks[side === 'left' ? LM.leftShoulder : LM.rightShoulder]
  const elbow = landmarks[side === 'left' ? LM.leftElbow : LM.rightElbow]
  const hip = landmarks[side === 'left' ? LM.leftHip : LM.rightHip]
  if (!shoulder || !elbow || !hip) return null
  if (!isLandmarkReliable(shoulder, 0.45) || !isLandmarkReliable(elbow, 0.45)) return null
  const down = { x: shoulder.x, y: shoulder.y + 0.2 }
  return angleAt(elbow, shoulder, down)
}

function delta(current: number | null | undefined, start: number | null | undefined): number | null {
  if (current == null || start == null) return null
  return Math.abs(current - start)
}
