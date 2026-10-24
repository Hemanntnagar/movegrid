import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { POSE_LANDMARK_COUNT, type PoseFrame, type PoseLandmark } from './pose/types'

export type KeyPoint = {
  x: number
  y: number
  score?: number
  name?: string
}

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_LITE =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
const MODEL_FULL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'

let landmarkerPromise: Promise<PoseLandmarker> | null = null

function chooseModel(): { path: string; label: 'lite' | 'full' } {
  if (typeof navigator === 'undefined') return { path: MODEL_LITE, label: 'lite' }
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency ?? 4
  if (mobile || cores < 4) return { path: MODEL_LITE, label: 'lite' }
  return { path: MODEL_FULL, label: 'full' }
}

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
  const model = chooseModel()
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: model.path,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  })
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerPromise) return landmarkerPromise

  landmarkerPromise = (async () => {
    try {
      return await createLandmarker('GPU')
    } catch {
      return createLandmarker('CPU')
    }
  })()

  return landmarkerPromise
}

export function landmarksToPoseLandmarks(landmarks: NormalizedLandmark[]): PoseLandmark[] {
  const out: PoseLandmark[] = []
  for (let i = 0; i < POSE_LANDMARK_COUNT; i++) {
    const landmark = landmarks[i]
    if (!landmark) {
      out.push({ x: 0, y: 0, visibility: 0, presence: 0 })
      continue
    }
    out.push({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility ?? 0,
    })
  }
  return out
}

export function toPoseFrame(
  landmarks: NormalizedLandmark[],
  timestampMs: number,
): PoseFrame {
  return {
    timestampMs,
    landmarks: landmarksToPoseLandmarks(landmarks),
  }
}

/** Pixel-space keypoints for canvas overlay. Uses all 33 pose landmarks. */
export function landmarksToKeypoints(
  landmarks: NormalizedLandmark[] | PoseLandmark[],
  width: number,
  height: number,
): KeyPoint[] {
  const keypoints: KeyPoint[] = []
  const count = Math.max(landmarks.length, POSE_LANDMARK_COUNT)
  for (let i = 0; i < count; i++) {
    const landmark = landmarks[i]
    if (!landmark) {
      keypoints.push({ x: 0, y: 0, score: 0 })
      continue
    }
    keypoints.push({
      x: landmark.x * width,
      y: landmark.y * height,
      score: 'visibility' in landmark ? landmark.visibility ?? 0 : 0,
    })
  }
  return keypoints
}

export function resetPoseLandmarkerCache() {
  landmarkerPromise = null
}
