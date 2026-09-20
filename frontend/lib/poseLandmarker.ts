import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

export type KeyPoint = {
  x: number
  y: number
  score?: number
  name?: string
}

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const POSE_LITE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

/** MediaPipe BlazePose index → COCO-17 index used by PostureCamera. */
const MP_INDEX_FOR_COCO: number[] = [
  0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28,
]

let landmarkerPromise: Promise<PoseLandmarker> | null = null

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_LITE_MODEL,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
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

export function landmarksToKeypoints(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
): KeyPoint[] {
  const keypoints: KeyPoint[] = []

  for (let coco = 0; coco < MP_INDEX_FOR_COCO.length; coco++) {
    const mp = landmarks[MP_INDEX_FOR_COCO[coco]]
    if (!mp) {
      keypoints.push({ x: 0, y: 0, score: 0 })
      continue
    }
    keypoints.push({
      x: mp.x * width,
      y: mp.y * height,
      score: mp.visibility ?? 0,
    })
  }

  return keypoints
}

export function resetPoseLandmarkerCache() {
  landmarkerPromise = null
}
