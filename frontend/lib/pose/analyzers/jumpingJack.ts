import { ankleSpread, shoulderWidth } from '../geometry'
import { POSE_LANDMARK, type AnalyzerConfig, type PoseLandmark } from '../types'
import { BaseCycleAnalyzer } from '../baseAnalyzer'
import type { FramingProfile } from '../framing'
import type { CycleFlags } from '../cycleMachine'
import { isLandmarkReliable } from '../validator'

const LM = POSE_LANDMARK

export const JUMPING_JACK_THRESHOLDS = {
  closedFootRatio: 1.18,
  openFootRatio: 1.72,
  towardOpenFootRatio: 1.35,
  towardClosedFootRatio: 1.4,
  armsDownMargin: 0.04,
  armsUpMargin: 0.1,
  minVisibility: 0.5,
} as const

export class JumpingJackAnalyzer extends BaseCycleAnalyzer {
  readonly id = 'jumping_jack'
  readonly requiredLandmarks = [
    LM.leftShoulder,
    LM.rightShoulder,
    LM.leftWrist,
    LM.rightWrist,
    LM.leftHip,
    LM.rightHip,
    LM.leftAnkle,
    LM.rightAnkle,
  ] as const

  constructor(config: AnalyzerConfig = {}) {
    super(
      {
        minStartHoldMs: 140,
        minEndHoldMs: 70,
        minRepMs: 420,
        maxRepMs: 2400,
        cooldownMs: 260,
      },
      { minVisibility: JUMPING_JACK_THRESHOLDS.minVisibility, ...config },
    )
  }

  framingProfile(): FramingProfile {
    return {
      required: this.requiredLandmarks,
      minVisibility: this.minVisibility,
      needFeet: true,
      needWrists: true,
    }
  }

  protected override startPrompt(): string {
    return 'Stand with feet together and arms down to begin.'
  }

  protected override endPrompt(): string {
    return 'Jump feet wide and raise both arms overhead.'
  }

  protected override returnPrompt(): string {
    return 'Return feet together and arms down to count the rep.'
  }

  protected flagsFor(landmarks: PoseLandmark[]): CycleFlags & {
    formFeedback: string | null
    metrics: Record<string, number | null>
    guidanceOverride?: string
  } {
    const shoulders = shoulderWidth(landmarks)
    const ankles = ankleSpread(landmarks)
    const footRatio = shoulders && ankles && shoulders > 1e-4 ? ankles / shoulders : null
    const leftArmUp = wristAboveShoulder(landmarks, 'left')
    const rightArmUp = wristAboveShoulder(landmarks, 'right')
    const leftArmDown = wristBelowShoulder(landmarks, 'left')
    const rightArmDown = wristBelowShoulder(landmarks, 'right')
    const armsUp = leftArmUp && rightArmUp
    const armsDown = leftArmDown && rightArmDown
    const feetClosed = footRatio != null && footRatio <= JUMPING_JACK_THRESHOLDS.closedFootRatio
    const feetOpen = footRatio != null && footRatio >= JUMPING_JACK_THRESHOLDS.openFootRatio

    const atStart = feetClosed && armsDown
    const atEnd = feetOpen && armsUp
    const towardEnd =
      (footRatio != null && footRatio >= JUMPING_JACK_THRESHOLDS.towardOpenFootRatio) ||
      leftArmUp ||
      rightArmUp
    const towardStart =
      (footRatio != null && footRatio <= JUMPING_JACK_THRESHOLDS.towardClosedFootRatio) ||
      leftArmDown ||
      rightArmDown

    let guidanceOverride: string | undefined
    if (feetOpen && !armsUp) guidanceOverride = 'Raise both arms overhead to finish the open position.'
    if (armsUp && !feetOpen) guidanceOverride = 'Jump your feet wide — arm raises alone do not count.'

    return {
      atStart,
      atEnd,
      towardEnd,
      towardStart,
      valid: footRatio != null && leftArmUp != null && rightArmUp != null,
      formFeedback: null,
      guidanceOverride,
      metrics: {
        footRatio,
        armsUp: armsUp ? 1 : 0,
        armsDown: armsDown ? 1 : 0,
      },
    }
  }
}

function wristAboveShoulder(landmarks: PoseLandmark[], side: 'left' | 'right'): boolean {
  const wrist = landmarks[side === 'left' ? LM.leftWrist : LM.rightWrist]
  const shoulder = landmarks[side === 'left' ? LM.leftShoulder : LM.rightShoulder]
  if (!isLandmarkReliable(wrist, 0.45) || !isLandmarkReliable(shoulder, 0.45)) return false
  return wrist.y < shoulder.y - JUMPING_JACK_THRESHOLDS.armsUpMargin
}

function wristBelowShoulder(landmarks: PoseLandmark[], side: 'left' | 'right'): boolean {
  const wrist = landmarks[side === 'left' ? LM.leftWrist : LM.rightWrist]
  const shoulder = landmarks[side === 'left' ? LM.leftShoulder : LM.rightShoulder]
  if (!isLandmarkReliable(wrist, 0.45) || !isLandmarkReliable(shoulder, 0.45)) return false
  return wrist.y > shoulder.y + JUMPING_JACK_THRESHOLDS.armsDownMargin
}
