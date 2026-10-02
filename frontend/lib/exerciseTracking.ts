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

function inferTrackingModeFromName(name: string): ExerciseTrackingMode | null {
  const n = name.toLowerCase().trim()
  if (!n) return null

  if (n.includes('push-up') || n.includes('push up') || n.includes('pushup')) return 'pushup'
  if (n.includes('burpee')) return 'burpee'
  if (n.includes('jumping jack') || n.includes('jump jack')) return 'jumping_jack'
  if (n.includes('mountain climber')) return 'mountain_climber'
  if (n.includes('plank') || n.includes('hollow hold') || n.includes('dead bug')) return 'plank_hold'

  if (
    n.includes('squat') ||
    n.includes('leg press') ||
    n.includes('lunge') ||
    n.includes('split squat') ||
    n.includes('step-up') ||
    n.includes('step up') ||
    n.includes('deadlift') ||
    n.includes('rdl') ||
    n.includes('hip thrust') ||
    n.includes('glute bridge') ||
    n.includes('calf raise')
  ) {
    return 'squat'
  }

  if (
    n.includes('bench') ||
    n.includes('press') ||
    n.includes('fly') ||
    n.includes('dip') ||
    n.includes('triceps') ||
    n.includes('tri extension') ||
    n.includes('skull') ||
    n.includes('shoulder') ||
    n.includes('overhead') ||
    n.includes('ohp') ||
    n.includes('chest') ||
    n.includes('push') ||
    n.includes('row') ||
    n.includes('pull') ||
    n.includes('lat') ||
    n.includes('curl') ||
    n.includes('chin') ||
    n.includes('bicep') ||
    n.includes('extension')
  ) {
    return 'pushup'
  }

  if (
    n.includes('core') ||
    n.includes('crunch') ||
    n.includes('sit-up') ||
    n.includes('sit up') ||
    n.includes('situp') ||
    n.includes('ab ')
  ) {
    return 'plank_hold'
  }

  if (n.includes('walk') || n.includes('run') || n.includes('cardio') || n === 'training') return 'timed'

  if (n.includes('v-up') || n.includes('v up') || n.includes('vup')) return 'plank_hold'
  if (n.includes('hip circle') || n.includes('mobility') || n.includes('stretch') || n.includes('flow')) {
    return 'timed'
  }

  return null
}

function inferTrackingModeFromText(...parts: (string | undefined)[]): ExerciseTrackingMode | null {
  for (const part of parts) {
    if (!part?.trim()) continue
    const hit = inferTrackingModeFromName(part)
    if (hit) return hit
  }
  return null
}

export function resolveTrackingModeFromPlan(name: string, prescription = ''): ExerciseTrackingMode {
  const { target_reps, duration_minutes } = parsePlanPrescription(prescription)
  return resolveTrackingMode({
    id: 0,
    name,
    description: prescription,
    category: 'Plan',
    difficulty: '',
    duration_minutes,
    target_reps,
    instructions: '',
    points: 0,
  })
}

export function resolveTrackingMode(exercise: ApiExercise): ExerciseTrackingMode {
  const fromApi = exercise.tracking_mode?.trim().toLowerCase()
  if (fromApi && fromApi !== 'manual') {
    return fromApi as ExerciseTrackingMode
  }

  const inferred = inferTrackingModeFromText(
    exercise.name,
    exercise.description,
    exercise.instructions,
  )
  if (inferred) return inferred

  if (exercise.duration_minutes > 0 && exercise.target_reps === 0) return 'timed'
  return 'manual'
}

/** MediaPipe pose runs for every mode, including catalog `manual` exercises. */
export function exerciseUsesPoseModel(_mode: ExerciseTrackingMode): boolean {
  return true
}

export function usesPoseRepCounter(mode: ExerciseTrackingMode): boolean {
  return REP_COUNTER_MODES.includes(mode)
}

export function repTargetForScheduledExercise(exercise: ApiExercise): number {
  if (exercise.target_reps > 0) return exercise.target_reps
  if (exercise.duration_minutes > 0) return Math.max(10, exercise.duration_minutes * 10)
  return 10
}

/** All plan and assignment exercises can use live pose + camera; mode selects rep logic. */
export function exerciseSupportsLiveCamera(_exercise: ApiExercise): boolean {
  return true
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
  const draft: ApiExercise = {
    id: stableNumericId(item.id),
    name: item.name,
    description: item.prescription,
    category: 'Plan',
    difficulty: '',
    duration_minutes,
    target_reps,
    instructions: '',
    points: 0,
    tracking_mode: item.tracking_mode?.trim() || undefined,
  }
  return { ...draft, tracking_mode: resolveTrackingMode(draft) }
}

export function liveCameraStartHint(mode: ExerciseTrackingMode): string {
  switch (mode) {
    case 'pushup':
    case 'burpee':
      return 'Use rear camera, side view — show arms and torso (works for presses, rows, and curls)'
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
    case 'manual':
      return 'Pose model tracks your form — tap +1 for each rep you complete'
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
