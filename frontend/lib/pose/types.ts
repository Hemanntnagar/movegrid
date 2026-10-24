export const POSE_LANDMARK = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const

export const POSE_LANDMARK_COUNT = 33

export type PoseLandmark = {
  x: number
  y: number
  z?: number
  visibility: number
  presence?: number
}

export type PoseFrame = {
  timestampMs: number
  landmarks: PoseLandmark[]
}

export type CyclePhase =
  | 'idle'
  | 'ready'
  | 'to_end'
  | 'at_end'
  | 'to_start'
  | 'completed'

export type TrackingStatus =
  | 'searching'
  | 'framing'
  | 'ready'
  | 'tracking'
  | 'paused'
  | 'unreliable'

export type AnalysisTick = {
  phase: CyclePhase
  tracking: TrackingStatus
  guidance: string
  formFeedback: string | null
  movementDetected: boolean
  attemptActive: boolean
  /** True only on the single tick that validates a completed repetition. */
  repCompleted: boolean
  completedReps: number
  metrics: Record<string, number | null>
}

export type ExerciseAnalyzer = {
  readonly id: string
  readonly requiredLandmarks: readonly number[]
  readonly minVisibility: number
  update(frame: PoseFrame): AnalysisTick
  notifyUnreliable(timestampMs: number, reason?: string): AnalysisTick
  resetCycle(): void
  resetAll(): void
  getCompletedReps(): number
}

export type FramingAdvice = {
  ok: boolean
  status: TrackingStatus
  message: string
}

export type AnalyzerConfig = {
  smoothingHalfLifeMs?: number
  minVisibility?: number
  variant?: string
}
