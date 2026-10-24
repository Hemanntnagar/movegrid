import {
  concatFrames,
  holdFrames,
  interpolateFrames,
  jumpingJackPose,
  pushUpPose,
  sideViewPose,
  withJitter,
} from './fixtures'
import type { PoseFrame, PoseLandmark } from './types'

const STEP = 50

export function standingPose(scale = 1, visibility = 1): PoseLandmark[] {
  return sideViewPose({
    hipDeg: 168,
    kneeDeg: 170,
    elbowDeg: 168,
    originY: 0.48,
    scale,
    visibility,
  })
}

export function squatBottomPose(scale = 1, visibility = 1): PoseLandmark[] {
  return sideViewPose({
    hipDeg: 86,
    kneeDeg: 84,
    elbowDeg: 165,
    originY: 0.64,
    scale,
    visibility,
  })
}

export function squatShallowPose(scale = 1): PoseLandmark[] {
  return sideViewPose({
    hipDeg: 135,
    kneeDeg: 128,
    elbowDeg: 165,
    originY: 0.53,
    scale,
  })
}

export function completeSquatSequence(startMs = 0, scale = 1): PoseFrame[] {
  const stand = standingPose(scale)
  const bottom = squatBottomPose(scale)
  return concatFrames(
    holdFrames(stand, startMs, 250, STEP),
    interpolateFrames(stand, bottom, startMs + 250, 450, STEP),
    holdFrames(bottom, startMs + 700, 150, STEP),
    interpolateFrames(bottom, stand, startMs + 850, 450, STEP),
    holdFrames(stand, startMs + 1300, 250, STEP),
  )
}

export function incompleteSquatSequence(startMs = 0): PoseFrame[] {
  const stand = standingPose()
  const shallow = squatShallowPose()
  return concatFrames(
    holdFrames(stand, startMs, 250, STEP),
    interpolateFrames(stand, shallow, startMs + 250, 300, STEP),
    holdFrames(shallow, startMs + 550, 100, STEP),
    interpolateFrames(shallow, stand, startMs + 650, 300, STEP),
    holdFrames(stand, startMs + 950, 250, STEP),
  )
}

export function completePushUpSequence(startMs = 0, scale = 1): PoseFrame[] {
  const top = pushUpPose({ elbowDeg: 170, scale })
  const bottom = pushUpPose({ elbowDeg: 78, scale })
  return concatFrames(
    holdFrames(top, startMs, 220, STEP),
    interpolateFrames(top, bottom, startMs + 220, 400, STEP),
    holdFrames(bottom, startMs + 620, 120, STEP),
    interpolateFrames(bottom, top, startMs + 740, 400, STEP),
    holdFrames(top, startMs + 1140, 220, STEP),
  )
}

export function completeCurlSequence(startMs = 0, scale = 1): PoseFrame[] {
  const down = sideViewPose({ hipDeg: 168, kneeDeg: 170, elbowDeg: 168, originY: 0.5, scale })
  const up = sideViewPose({ hipDeg: 168, kneeDeg: 170, elbowDeg: 52, originY: 0.5, scale })
  return concatFrames(
    holdFrames(down, startMs, 200, STEP),
    interpolateFrames(down, up, startMs + 200, 350, STEP),
    holdFrames(up, startMs + 550, 120, STEP),
    interpolateFrames(up, down, startMs + 670, 350, STEP),
    holdFrames(down, startMs + 1020, 200, STEP),
  )
}

export function completeJackSequence(startMs = 0, scale = 1): PoseFrame[] {
  const closed = jumpingJackPose({ open: false, scale })
  const open = jumpingJackPose({ open: true, scale })
  return concatFrames(
    holdFrames(closed, startMs, 180, STEP),
    interpolateFrames(closed, open, startMs + 180, 250, STEP),
    holdFrames(open, startMs + 430, 100, STEP),
    interpolateFrames(open, closed, startMs + 530, 250, STEP),
    holdFrames(closed, startMs + 780, 180, STEP),
  )
}

export function randomArmWaveSequence(startMs = 0): PoseFrame[] {
  const a = standingPose()
  const b = sideViewPose({ hipDeg: 168, kneeDeg: 170, elbowDeg: 60, originY: 0.48, wristLift: 0.18 })
  return concatFrames(
    holdFrames(a, startMs, 200, STEP),
    interpolateFrames(a, b, startMs + 200, 180, STEP),
    interpolateFrames(b, a, startMs + 380, 180, STEP),
    holdFrames(a, startMs + 560, 200, STEP),
  )
}

export function jitteredStanding(startMs = 0): PoseFrame[] {
  return withJitter(holdFrames(standingPose(), startMs, 1200, STEP), 0.02, 7)
}

export function lostTrackingGap(before: PoseFrame[], after: PoseFrame[], gapMs = 400): PoseFrame[] {
  const last = before[before.length - 1]
  const start = (last?.timestampMs ?? 0) + 50
  const blank = holdFrames(
    before[0].landmarks.map((landmark) => ({ ...landmark, visibility: 0.05 })),
    start,
    gapMs,
    STEP,
  )
  const shifted = after.map((frame, index) => ({
    ...frame,
    timestampMs: start + gapMs + 50 + index * STEP,
  }))
  return concatFrames(before, blank, shifted)
}

export function offsetSequence(frames: PoseFrame[], startMs: number): PoseFrame[] {
  if (!frames.length) return frames
  const delta = startMs - frames[0].timestampMs
  return frames.map((frame) => ({ ...frame, timestampMs: frame.timestampMs + delta }))
}
