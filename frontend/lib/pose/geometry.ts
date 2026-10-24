import type { PoseLandmark } from './types'

export type Point = {
  x: number
  y: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/** Interior angle at `b` formed by points `a-b-c`, in degrees [0, 180]. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x
  const v1y = a.y - b.y
  const v2x = c.x - b.x
  const v2y = c.y - b.y
  const mag1 = Math.hypot(v1x, v1y)
  const mag2 = Math.hypot(v2x, v2y)
  if (mag1 < 1e-6 || mag2 < 1e-6) return 0
  const cos = clamp((v1x * v2x + v1y * v2y) / (mag1 * mag2), -1, 1)
  return (Math.acos(cos) * 180) / Math.PI
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!present.length) return null
  return present.reduce((sum, value) => sum + value, 0) / present.length
}

export function landmarkAngle(
  landmarks: PoseLandmark[],
  a: number,
  b: number,
  c: number,
): number | null {
  const p1 = landmarks[a]
  const p2 = landmarks[b]
  const p3 = landmarks[c]
  if (!p1 || !p2 || !p3) return null
  return angleAt(p1, p2, p3)
}

export function segmentLength(
  landmarks: PoseLandmark[],
  a: number,
  b: number,
): number | null {
  const p1 = landmarks[a]
  const p2 = landmarks[b]
  if (!p1 || !p2) return null
  return dist(p1, p2)
}

export function torsoLength(landmarks: PoseLandmark[]): number | null {
  const left = segmentLength(landmarks, 11, 23)
  const right = segmentLength(landmarks, 12, 24)
  return average([left, right])
}

export function shoulderWidth(landmarks: PoseLandmark[]): number | null {
  return segmentLength(landmarks, 11, 12)
}

export function ankleSpread(landmarks: PoseLandmark[]): number | null {
  return segmentLength(landmarks, 27, 28)
}

export function hipCenter(landmarks: PoseLandmark[]): Point | null {
  const left = landmarks[23]
  const right = landmarks[24]
  if (!left || !right) return null
  return midpoint(left, right)
}

export function shoulderCenter(landmarks: PoseLandmark[]): Point | null {
  const left = landmarks[11]
  const right = landmarks[12]
  if (!left || !right) return null
  return midpoint(left, right)
}
