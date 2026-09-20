import type { ApiExercise } from './api'

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
