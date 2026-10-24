import { POSE_LANDMARK_COUNT, type PoseLandmark } from './types'

const IN_FRAME_MIN = 0.02
const IN_FRAME_MAX = 0.98

export function isLandmarkReliable(
  landmark: PoseLandmark | undefined,
  minVisibility: number,
): landmark is PoseLandmark {
  if (!landmark) return false
  const visibility = landmark.visibility ?? 0
  const presence = landmark.presence ?? 1
  return visibility >= minVisibility && presence >= minVisibility
}

export function requiredLandmarksReliable(
  landmarks: PoseLandmark[],
  indices: readonly number[],
  minVisibility: number,
): boolean {
  if (!landmarks.length || landmarks.length < POSE_LANDMARK_COUNT * 0.5) return false
  return indices.every((index) => isLandmarkReliable(landmarks[index], minVisibility))
}

export function landmarkInFrame(landmark: PoseLandmark | undefined): boolean {
  if (!landmark) return false
  return (
    landmark.x >= IN_FRAME_MIN &&
    landmark.x <= IN_FRAME_MAX &&
    landmark.y >= IN_FRAME_MIN &&
    landmark.y <= IN_FRAME_MAX
  )
}

export function requiredLandmarksInFrame(
  landmarks: PoseLandmark[],
  indices: readonly number[],
): boolean {
  return indices.every((index) => landmarkInFrame(landmarks[index]))
}

export function meanVisibility(
  landmarks: PoseLandmark[],
  indices: readonly number[],
): number {
  if (!indices.length) return 0
  const total = indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0)
  return total / indices.length
}

export function missingLandmarkNames(
  landmarks: PoseLandmark[],
  indices: readonly number[],
  minVisibility: number,
  names: Record<number, string>,
): string[] {
  return indices
    .filter((index) => !isLandmarkReliable(landmarks[index], minVisibility) || !landmarkInFrame(landmarks[index]))
    .map((index) => names[index] ?? `joint ${index}`)
}
