import { dist, shoulderCenter, torsoLength } from './geometry'
import { meanVisibility, requiredLandmarksInFrame, requiredLandmarksReliable } from './validator'
import { POSE_LANDMARK, type FramingAdvice, type PoseLandmark, type TrackingStatus } from './types'

const LM = POSE_LANDMARK

export type FramingProfile = {
  required: readonly number[]
  minVisibility: number
  preferSideView?: boolean
  needFeet?: boolean
  needWrists?: boolean
}

const LANDMARK_NAMES: Record<number, string> = {
  [LM.leftShoulder]: 'shoulders',
  [LM.rightShoulder]: 'shoulders',
  [LM.leftElbow]: 'elbows',
  [LM.rightElbow]: 'elbows',
  [LM.leftWrist]: 'wrists',
  [LM.rightWrist]: 'wrists',
  [LM.leftHip]: 'hips',
  [LM.rightHip]: 'hips',
  [LM.leftKnee]: 'knees',
  [LM.rightKnee]: 'knees',
  [LM.leftAnkle]: 'feet',
  [LM.rightAnkle]: 'feet',
}

export function personVisible(landmarks: PoseLandmark[], minVisibility: number): boolean {
  const core = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip]
  return requiredLandmarksReliable(landmarks, core, minVisibility)
}

export function isSideView(landmarks: PoseLandmark[]): boolean {
  const leftHip = landmarks[LM.leftHip]
  const rightHip = landmarks[LM.rightHip]
  const leftShoulder = landmarks[LM.leftShoulder]
  const rightShoulder = landmarks[LM.rightShoulder]
  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) return false
  const hipWidth = dist(leftHip, rightHip)
  const shoulderW = dist(leftShoulder, rightShoulder)
  const torso = torsoLength(landmarks) ?? 0.2
  return hipWidth < torso * 0.55 && shoulderW < torso * 0.7
}

export function assessFraming(landmarks: PoseLandmark[], profile: FramingProfile): FramingAdvice {
  if (!landmarks.length) {
    return advice('searching', 'Pose not detected — counting paused.')
  }

  if (!personVisible(landmarks, profile.minVisibility * 0.8)) {
    return advice('searching', 'Pose not detected — counting paused.')
  }

  const visibility = meanVisibility(landmarks, profile.required)
  if (visibility < profile.minVisibility * 0.75) {
    return advice('unreliable', 'Improve lighting.')
  }

  if (!requiredLandmarksReliable(landmarks, profile.required, profile.minVisibility)) {
    const missingFeet = profile.needFeet && !requiredLandmarksReliable(
      landmarks,
      [LM.leftAnkle, LM.rightAnkle],
      profile.minVisibility,
    )
    if (missingFeet || (profile.needFeet && !requiredLandmarksInFrame(landmarks, [LM.leftAnkle, LM.rightAnkle]))) {
      return advice('framing', 'Your feet are outside the frame.')
    }
    if (profile.needWrists && !requiredLandmarksReliable(landmarks, [LM.leftWrist, LM.rightWrist], profile.minVisibility)) {
      return advice('framing', 'Show your wrists and arms in the frame.')
    }
    return advice('framing', 'Step back so the required body parts are visible.')
  }

  if (!requiredLandmarksInFrame(landmarks, profile.required)) {
    if (profile.needFeet && !requiredLandmarksInFrame(landmarks, [LM.leftAnkle, LM.rightAnkle])) {
      return advice('framing', 'Your feet are outside the frame.')
    }
    return advice('framing', 'Move farther from the camera.')
  }

  const torso = torsoLength(landmarks)
  if (torso != null && torso > 0.58) {
    return advice('framing', 'Move farther from the camera.')
  }
  if (torso != null && torso < 0.08) {
    return advice('framing', 'Move closer so your body is clearly visible.')
  }

  const center = shoulderCenter(landmarks)
  if (center && (center.x < 0.12 || center.x > 0.88)) {
    return advice('framing', 'Center your body in the frame.')
  }

  if (profile.preferSideView && !isSideView(landmarks)) {
    const hip = landmarks[LM.leftHip]
    const knee = landmarks[LM.leftKnee]
    const ankle = landmarks[LM.leftAnkle]
    const shin = hip && knee && ankle ? dist(knee, ankle) : 0
    if (shin > 0 && torso != null && shin < torso * 0.25) {
      return advice('framing', 'Turn sideways for this exercise.')
    }
  }

  return { ok: true, status: 'ready', message: 'Return to the starting position.' }
}

function advice(status: TrackingStatus, message: string): FramingAdvice {
  return { ok: false, status, message }
}
