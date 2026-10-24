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
  | 'bicep_curl'
  | 'timed'
  | 'manual'

const REP_COUNTER_MODES: ExerciseTrackingMode[] = [
  'pushup',
  'squat',
  'lunge',
  'jumping_jack',
  'mountain_climber',
  'burpee',
  'bicep_curl',
]

const KNOWN_MODES = new Set<string>([
  'pushup',
  'squat',
  'lunge',
  'jumping_jack',
  'mountain_climber',
  'plank_hold',
  'burpee',
  'bicep_curl',
  'timed',
  'manual',
])

/** Exact exercise families only. Unrelated lifts are not mapped to squat/push-up. */
function inferStrictTrackingMode(name: string): ExerciseTrackingMode | null {
  const n = name.toLowerCase().trim()
  if (!n) return null

  if (n.includes('jumping jack') || n.includes('jump jack')) return 'jumping_jack'
  if (n.includes('mountain climber')) return 'mountain_climber'
  if (n.includes('burpee')) return 'burpee'
  if (n.includes('bicep') || n.includes('curl')) return 'bicep_curl'
  if (n.includes('lunge') || n.includes('split squat')) return 'lunge'
  if (n.includes('push-up') || n.includes('push up') || n.includes('pushup')) return 'pushup'
  if (n.includes('squat')) return 'squat'
  if (n.includes('plank') || n.includes('hollow hold')) return 'plank_hold'
  return null
}

function inferLooseTrackingMode(name: string): ExerciseTrackingMode | null {
  const n = name.toLowerCase().trim()
  if (!n) return null
  if (n.includes('dead bug') || n.includes('v-up') || n.includes('v up') || n.includes('vup')) {
    return 'plank_hold'
  }
  if (n.includes('walk') || n.includes('run') || n.includes('cardio') || n === 'training') return 'timed'
  if (n.includes('hip circle') || n.includes('mobility') || n.includes('stretch') || n.includes('flow')) {
    return 'timed'
  }
  return null
}

function inferTrackingModeFromText(...parts: (string | undefined)[]): ExerciseTrackingMode | null {
  for (const part of parts) {
    if (!part?.trim()) continue
    const strict = inferStrictTrackingMode(part)
    if (strict) return strict
  }
  for (const part of parts) {
    if (!part?.trim()) continue
    const loose = inferLooseTrackingMode(part)
    if (loose) return loose
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
  const fromName = inferStrictTrackingMode(exercise.name)
  if (fromName) return fromName

  const fromApi = exercise.tracking_mode?.trim().toLowerCase()
  if (fromApi && fromApi !== 'manual' && KNOWN_MODES.has(fromApi)) {
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
      return 'Use rear camera, side view — full arms and torso in frame. Get into a plank before counting starts.'
    case 'burpee':
      return 'Use rear camera, side view — stand, drop to plank, then stand again. Partial movements will not count.'
    case 'squat':
      return 'Use rear camera, side view — frame hips to ankles. Only full-depth squats count.'
    case 'lunge':
      return 'Use rear camera, side view — frame hips to ankles. Step into a full lunge, then stand.'
    case 'jumping_jack':
      return 'Step back so your full body fits in frame. Feet and both arms must complete the movement.'
    case 'mountain_climber':
      return 'Side view plank — drive one knee in, then fully extend it back. Standing knee lifts do not count.'
    case 'bicep_curl':
      return 'Side or 3/4 view — elbows at your sides. Only a full curl and lower counts.'
    case 'plank_hold':
      return 'Side view — hold steady; tap +1 or Complete when finished'
    case 'timed':
      return 'Keep moving — tap Complete when your timed set is done'
    case 'manual':
      return 'Pose overlay is on for form — tap +1 for each rep you complete. Auto-count is off for this exercise.'
    default:
      return 'Tap Start when you are ready to track form with the camera'
  }
}

export function repCounterLabel(mode: ExerciseTrackingMode, exerciseName: string): string {
  switch (mode) {
    case 'lunge':
      return 'Lunge'
    case 'jumping_jack':
      return 'Jumping jack'
    case 'mountain_climber':
      return 'Mountain climber'
    case 'burpee':
      return 'Burpee'
    case 'bicep_curl':
      return exerciseName
    default:
      return exerciseName
  }
}
