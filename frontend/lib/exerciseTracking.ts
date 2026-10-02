import type { ApiExercise } from './api'
import type { PlanExerciseItem } from './todaysPlan'

export type ExerciseTrackingMode =
  | 'pushup'
  | 'squat'
  | 'lunge'
  | 'jumping_jack'
  | 'mountain_climber'
  | 'plank_hold'
  | 'burpee'
  | 'timed'
  | 'manual'

const REP_COUNTER_MODES: ExerciseTrackingMode[] = [
  'pushup',
  'squat',
  'lunge',
  'jumping_jack',
  'mountain_climber',
  'burpee',
]

export function resolveTrackingMode(exercise: ApiExercise): ExerciseTrackingMode {
  const fromApi = exercise.tracking_mode?.trim().toLowerCase()
  if (fromApi && fromApi !== 'manual') {
    return fromApi as ExerciseTrackingMode
  }

  const name = exercise.name.toLowerCase()
  if (name.includes('push-up') || name.includes('push up') || name.includes('pushup')) return 'pushup'
  if (name.includes('squat')) return 'squat'
  if (name.includes('lunge')) return 'lunge'
  if (name.includes('jumping jack')) return 'jumping_jack'
  if (name.includes('mountain climber')) return 'mountain_climber'
  if (name.includes('plank') || name.includes('hollow hold')) return 'plank_hold'
  if (name.includes('burpee')) return 'burpee'
  if (exercise.duration_minutes > 0 && exercise.target_reps === 0) return 'timed'
  return 'manual'
}

export function usesPoseRepCounter(mode: ExerciseTrackingMode): boolean {
  return REP_COUNTER_MODES.includes(mode)
}

export function repTargetForScheduledExercise(exercise: ApiExercise): number {
  if (exercise.target_reps > 0) return exercise.target_reps
  if (exercise.duration_minutes > 0) return Math.max(10, exercise.duration_minutes * 10)
  return 10
}

export function exerciseSupportsLiveCamera(exercise: ApiExercise): boolean {
  return resolveTrackingMode(exercise) !== 'manual'
}

function stableNumericId(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

/** Parse weekly-plan prescription strings into rep/duration fields for pose tracking. */
export function parsePlanPrescription(prescription: string): {
  target_reps: number
  duration_minutes: number
} {
  const lower = prescription.trim().toLowerCase()
  const setsReps = lower.match(/(\d+)\s*[×x]\s*(\d+)/)
  if (setsReps) {
    const sets = parseInt(setsReps[1], 10)
    const amount = parseInt(setsReps[2], 10)
    if (lower.includes('sec')) {
      return { target_reps: sets * amount, duration_minutes: 0 }
    }
    return { target_reps: sets * amount, duration_minutes: 0 }
  }
  const minMatch = lower.match(/(\d+)\s*min/)
  if (minMatch) {
    return { duration_minutes: parseInt(minMatch[1], 10), target_reps: 0 }
  }
  const repOnly = lower.match(/^(\d+)\s*$/)
  if (repOnly) {
    return { target_reps: parseInt(repOnly[1], 10), duration_minutes: 0 }
  }
  return { target_reps: 0, duration_minutes: 0 }
}

export function planExerciseToApiExercise(item: PlanExerciseItem): ApiExercise {
  const { target_reps, duration_minutes } = parsePlanPrescription(item.prescription)
  return {
    id: stableNumericId(item.id),
    name: item.name,
    description: item.prescription,
    category: 'Plan',
    difficulty: '',
    duration_minutes,
    target_reps,
    instructions: '',
    points: 0,
  }
}

export function liveCameraStartHint(mode: ExerciseTrackingMode): string {
  switch (mode) {
    case 'pushup':
    case 'burpee':
      return 'Use rear camera, side view — show arms and torso'
    case 'squat':
    case 'lunge':
      return 'Use rear camera, side view — frame hips to ankles'
    case 'jumping_jack':
      return 'Step back so your full body fits in frame'
    case 'mountain_climber':
      return 'Side view — show legs and hips for rep counting'
    case 'plank_hold':
      return 'Side view — hold steady; tap +1 or Complete when finished'
    case 'timed':
      return 'Keep moving — tap Complete when your timed set is done'
    default:
      return 'Tap Start when you are ready to track form with the camera'
  }
}

export function repCounterLabel(mode: ExerciseTrackingMode, exerciseName: string): string {
  switch (mode) {
    case 'pushup':
      return exerciseName
    case 'squat':
      return exerciseName
    case 'lunge':
      return 'Lunge'
    case 'jumping_jack':
      return 'Jumping jack'
    case 'mountain_climber':
      return 'Mountain climber'
    case 'burpee':
      return 'Burpee'
    default:
      return exerciseName
  }
}
