import { angleAt } from './geometry'
import { POSE_LANDMARK, POSE_LANDMARK_COUNT, type PoseFrame, type PoseLandmark } from './types'

const LM = POSE_LANDMARK

export type Point = { x: number; y: number }

export function blankLandmarks(visibility = 0): PoseLandmark[] {
  return Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x: 0,
    y: 0,
    visibility,
  }))
}

export function setJoint(
  landmarks: PoseLandmark[],
  index: number,
  x: number,
  y: number,
  visibility = 1,
): void {
  landmarks[index] = { x, y, visibility }
}

/** Place `result` so the angle at `origin` between `from` and `result` is `angleDeg`. */
export function pointAtAngle(
  origin: Point,
  from: Point,
  angleDeg: number,
  length: number,
  sign = 1,
): Point {
  const fromAng = Math.atan2(from.y - origin.y, from.x - origin.x)
  const rad = ((sign >= 0 ? angleDeg : -angleDeg) * Math.PI) / 180
  const theta = fromAng + rad
  return {
    x: origin.x + Math.cos(theta) * length,
    y: origin.y + Math.sin(theta) * length,
  }
}

export function pairSides(
  landmarks: PoseLandmark[],
  left: number,
  right: number,
  point: Point,
  offset = 0.03,
  visibility = 1,
) {
  setJoint(landmarks, left, point.x - offset, point.y, visibility)
  setJoint(landmarks, right, point.x + offset, point.y, visibility)
}

export type SideViewOptions = {
  hipDeg: number
  kneeDeg: number
  elbowDeg?: number
  scale?: number
  originX?: number
  originY?: number
  visibility?: number
  wristLift?: number
  ankleSpread?: number
  upright?: boolean
}

/**
 * Side-view kinematic body. `hipDeg`/`kneeDeg`/`elbowDeg` are the actual
 * joint angles that `angleAt` will measure.
 */
export function sideViewPose(options: SideViewOptions): PoseLandmark[] {
  const scale = options.scale ?? 1
  const visibility = options.visibility ?? 1
  const originX = options.originX ?? 0.5
  const originY = options.originY ?? 0.5
  const torso = 0.22 * scale
  const femur = 0.2 * scale
  const shin = 0.2 * scale
  const upperArm = 0.12 * scale
  const forearm = 0.12 * scale
  const ankleSpread = options.ankleSpread ?? 0.05
  const landmarks = blankLandmarks(visibility)

  const hip = { x: originX, y: originY }
  const shoulder = { x: originX - 0.02 * scale, y: originY - torso }
  const knee = pointAtAngle(hip, shoulder, options.hipDeg, femur, 1)
  const ankle = pointAtAngle(knee, hip, options.kneeDeg, shin, 1)
  const elbowDeg = options.elbowDeg ?? 170
  const elbow = pointAtAngle(shoulder, hip, 20, upperArm, -1)
  const wrist = pointAtAngle(elbow, shoulder, elbowDeg, forearm, 1)
  if (options.wristLift) {
    wrist.y -= options.wristLift * scale
  }

  pairSides(landmarks, LM.leftHip, LM.rightHip, hip, 0.025, visibility)
  pairSides(landmarks, LM.leftShoulder, LM.rightShoulder, shoulder, 0.03, visibility)
  pairSides(landmarks, LM.leftKnee, LM.rightKnee, knee, 0.03, visibility)
  setJoint(landmarks, LM.leftAnkle, ankle.x - ankleSpread / 2, ankle.y, visibility)
  setJoint(landmarks, LM.rightAnkle, ankle.x + ankleSpread / 2, ankle.y, visibility)
  pairSides(landmarks, LM.leftElbow, LM.rightElbow, elbow, 0.03, visibility)
  pairSides(landmarks, LM.leftWrist, LM.rightWrist, wrist, 0.03, visibility)
  setJoint(landmarks, LM.nose, shoulder.x, shoulder.y - 0.06 * scale, visibility)
  setJoint(landmarks, LM.leftHeel, ankle.x - ankleSpread / 2, ankle.y + 0.01, visibility)
  setJoint(landmarks, LM.rightHeel, ankle.x + ankleSpread / 2, ankle.y + 0.01, visibility)
  setJoint(landmarks, LM.leftFootIndex, ankle.x - ankleSpread / 2 + 0.02, ankle.y, visibility)
  setJoint(landmarks, LM.rightFootIndex, ankle.x + ankleSpread / 2 + 0.02, ankle.y, visibility)

  if (options.upright === false) {
    // Already kinematic; callers place plank poses separately.
  }

  return landmarks
}

export function pushUpPose(options: {
  elbowDeg: number
  scale?: number
  visibility?: number
}): PoseLandmark[] {
  const scale = options.scale ?? 1
  const visibility = options.visibility ?? 1
  const landmarks = blankLandmarks(visibility)
  const shoulder = { x: 0.4, y: 0.44 }
  const hip = { x: 0.6, y: 0.45 }
  const ankle = { x: 0.8, y: 0.46 }
  const elbow = { x: 0.34, y: 0.54 }
  const wrist = pointAtAngle(elbow, shoulder, options.elbowDeg, 0.12 * scale, 1)
  pairSides(landmarks, LM.leftShoulder, LM.rightShoulder, shoulder, 0.02, visibility)
  pairSides(landmarks, LM.leftHip, LM.rightHip, hip, 0.02, visibility)
  pairSides(landmarks, LM.leftAnkle, LM.rightAnkle, ankle, 0.03, visibility)
  pairSides(landmarks, LM.leftElbow, LM.rightElbow, elbow, 0.02, visibility)
  pairSides(landmarks, LM.leftWrist, LM.rightWrist, wrist, 0.02, visibility)
  pairSides(landmarks, LM.leftKnee, LM.rightKnee, { x: 0.7, y: 0.455 }, 0.025, visibility)
  setJoint(landmarks, LM.nose, shoulder.x - 0.04, shoulder.y, visibility)
  return landmarks
}

export function plankPose(options: {
  elbowDeg: number
  scale?: number
  visibility?: number
  driveKnee?: 'left' | 'right' | null
  driveKneeDeg?: number
}): PoseLandmark[] {
  const scale = options.scale ?? 1
  const visibility = options.visibility ?? 1
  const landmarks = blankLandmarks(visibility)
  const shoulder = { x: 0.38, y: 0.46 }
  const hip = { x: 0.58, y: 0.47 }
  const ankle = { x: 0.8, y: 0.48 }
  const wrist = { x: 0.28, y: 0.6 }
  const elbow = pointAtAngle(shoulder, wrist, options.elbowDeg, 0.1 * scale, 1)
  elbow.x = (shoulder.x + wrist.x) / 2
  elbow.y = Math.min(shoulder.y, wrist.y) - 0.02 + (180 - options.elbowDeg) * 0.001

  pairSides(landmarks, LM.leftShoulder, LM.rightShoulder, shoulder, 0.02, visibility)
  pairSides(landmarks, LM.leftHip, LM.rightHip, hip, 0.02, visibility)
  pairSides(landmarks, LM.leftAnkle, LM.rightAnkle, ankle, 0.03, visibility)
  pairSides(landmarks, LM.leftWrist, LM.rightWrist, wrist, 0.02, visibility)
  pairSides(landmarks, LM.leftElbow, LM.rightElbow, elbow, 0.02, visibility)

  const leftKnee = { x: 0.69, y: 0.475 }
  const rightKnee = { x: 0.69, y: 0.475 }
  if (options.driveKnee === 'left') {
    const deg = options.driveKneeDeg ?? 80
    const driven = pointAtAngle(hip, ankle, deg, 0.16 * scale, -1)
    leftKnee.x = driven.x
    leftKnee.y = driven.y
  } else if (options.driveKnee === 'right') {
    const deg = options.driveKneeDeg ?? 80
    const driven = pointAtAngle(hip, ankle, deg, 0.16 * scale, -1)
    rightKnee.x = driven.x
    rightKnee.y = driven.y
  }
  setJoint(landmarks, LM.leftKnee, leftKnee.x, leftKnee.y, visibility)
  setJoint(landmarks, LM.rightKnee, rightKnee.x, rightKnee.y, visibility)
  setJoint(landmarks, LM.nose, shoulder.x - 0.04, shoulder.y - 0.01, visibility)
  return landmarks
}

export function jumpingJackPose(options: {
  open: boolean
  scale?: number
  visibility?: number
  armsOnly?: boolean
  feetOnly?: boolean
}): PoseLandmark[] {
  const scale = options.scale ?? 1
  const visibility = options.visibility ?? 1
  const open = options.open
  const landmarks = blankLandmarks(visibility)
  const hipY = 0.52
  const shoulderY = 0.3
  const ankleY = 0.9
  const spread = open && !options.armsOnly ? 0.28 * scale : 0.06 * scale
  const armY = open && !options.feetOnly ? 0.12 : 0.48

  pairSides(landmarks, LM.leftShoulder, LM.rightShoulder, { x: 0.5, y: shoulderY }, 0.08 * scale, visibility)
  pairSides(landmarks, LM.leftHip, LM.rightHip, { x: 0.5, y: hipY }, 0.06 * scale, visibility)
  setJoint(landmarks, LM.leftAnkle, 0.5 - spread, ankleY, visibility)
  setJoint(landmarks, LM.rightAnkle, 0.5 + spread, ankleY, visibility)
  setJoint(landmarks, LM.leftKnee, 0.5 - spread * 0.6, 0.72, visibility)
  setJoint(landmarks, LM.rightKnee, 0.5 + spread * 0.6, 0.72, visibility)
  setJoint(landmarks, LM.leftElbow, 0.5 - 0.12, (shoulderY + armY) / 2, visibility)
  setJoint(landmarks, LM.rightElbow, 0.5 + 0.12, (shoulderY + armY) / 2, visibility)
  setJoint(landmarks, LM.leftWrist, 0.5 - (open && !options.feetOnly ? 0.1 : 0.08), armY, visibility)
  setJoint(landmarks, LM.rightWrist, 0.5 + (open && !options.feetOnly ? 0.1 : 0.08), armY, visibility)
  setJoint(landmarks, LM.nose, 0.5, 0.2, visibility)
  return landmarks
}

export function measuredKnee(landmarks: PoseLandmark[]): number {
  return angleAt(landmarks[LM.leftHip], landmarks[LM.leftKnee], landmarks[LM.leftAnkle])
}

export function measuredHip(landmarks: PoseLandmark[]): number {
  return angleAt(landmarks[LM.leftShoulder], landmarks[LM.leftHip], landmarks[LM.leftKnee])
}

export function measuredElbow(landmarks: PoseLandmark[]): number {
  return angleAt(landmarks[LM.leftShoulder], landmarks[LM.leftElbow], landmarks[LM.leftWrist])
}

export function holdFrames(
  landmarks: PoseLandmark[],
  startMs: number,
  durationMs: number,
  stepMs = 50,
): PoseFrame[] {
  const frames: PoseFrame[] = []
  for (let t = 0; t <= durationMs; t += stepMs) {
    frames.push({
      timestampMs: startMs + t,
      landmarks: landmarks.map((landmark) => ({ ...landmark })),
    })
  }
  return frames
}

export function interpolateFrames(
  from: PoseLandmark[],
  to: PoseLandmark[],
  startMs: number,
  durationMs: number,
  stepMs = 50,
): PoseFrame[] {
  const frames: PoseFrame[] = []
  for (let t = 0; t <= durationMs; t += stepMs) {
    const u = durationMs === 0 ? 1 : t / durationMs
    frames.push({
      timestampMs: startMs + t,
      landmarks: from.map((landmark, index) => {
        const target = to[index] ?? landmark
        return {
          x: landmark.x + (target.x - landmark.x) * u,
          y: landmark.y + (target.y - landmark.y) * u,
          visibility: landmark.visibility + (target.visibility - landmark.visibility) * u,
        }
      }),
    })
  }
  return frames
}

export function withJitter(frames: PoseFrame[], amplitude = 0.008, seed = 1): PoseFrame[] {
  let n = seed
  const rand = () => {
    n = (n * 1664525 + 1013904223) >>> 0
    return (n / 0xffffffff) * 2 - 1
  }
  return frames.map((frame) => ({
    ...frame,
    landmarks: frame.landmarks.map((landmark) => ({
      ...landmark,
      x: landmark.x + rand() * amplitude,
      y: landmark.y + rand() * amplitude,
    })),
  }))
}

export function concatFrames(...groups: PoseFrame[][]): PoseFrame[] {
  return groups.flat()
}
