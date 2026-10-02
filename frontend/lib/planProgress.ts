import { istDateKey } from './ist'
import { userStorageInfix } from './userStorageScope'

const DONE_KEY_PREFIX = 'movegrid_plan_exercise_done_'

function storageKey(dateKey: string) {
  return `${DONE_KEY_PREFIX}${userStorageInfix()}${dateKey}`
}

export function getPlanExerciseDoneIds(dateKey = istDateKey()): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(storageKey(dateKey))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function markPlanExerciseDone(exerciseId: string, dateKey = istDateKey()) {
  const done = getPlanExerciseDoneIds(dateKey)
  done.add(exerciseId)
  localStorage.setItem(storageKey(dateKey), JSON.stringify([...done]))
}

export function clearPlanExerciseProgress(dateKey = istDateKey()) {
  localStorage.removeItem(storageKey(dateKey))
}

const REST_DONE_PREFIX = 'movegrid_plan_rest_done_'

export function isRestDayMarkedComplete(dateKey = istDateKey()): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`${REST_DONE_PREFIX}${userStorageInfix()}${dateKey}`) === '1'
}

export function markRestDayComplete(dateKey = istDateKey()) {
  localStorage.setItem(`${REST_DONE_PREFIX}${userStorageInfix()}${dateKey}`, '1')
}
