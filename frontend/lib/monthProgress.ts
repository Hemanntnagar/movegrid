import { istMonthKey } from './ist'

const PREFIX = 'movegrid_month_levels_'

export type DayLevelStatus = 'locked' | 'active' | 'completed' | 'missed' | 'closed'

export type MonthProgress = {
  month: string
  completedDays: number[]
  missedDays: number[]
}

function storageKey(month = istMonthKey()) {
  return `${PREFIX}${month}`
}

export function getMonthProgress(month = istMonthKey()): MonthProgress {
  if (typeof window === 'undefined') {
    return { month, completedDays: [], missedDays: [] }
  }
  try {
    const raw = localStorage.getItem(storageKey(month))
    if (!raw) return { month, completedDays: [], missedDays: [] }
    const parsed = JSON.parse(raw) as MonthProgress
    if (parsed.month !== month) return { month, completedDays: [], missedDays: [] }
    return {
      month,
      completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
      missedDays: Array.isArray(parsed.missedDays) ? parsed.missedDays : [],
    }
  } catch {
    return { month, completedDays: [], missedDays: [] }
  }
}

function saveMonthProgress(progress: MonthProgress) {
  localStorage.setItem(storageKey(progress.month), JSON.stringify(progress))
}

export function markDayCompleted(day: number, month = istMonthKey()) {
  const progress = getMonthProgress(month)
  if (!progress.completedDays.includes(day)) {
    progress.completedDays = [...progress.completedDays, day].sort((a, b) => a - b)
  }
  progress.missedDays = progress.missedDays.filter((d) => d !== day)
  saveMonthProgress(progress)
  return progress
}

export function markDayMissed(day: number, month = istMonthKey()) {
  const progress = getMonthProgress(month)
  if (progress.completedDays.includes(day)) return progress
  if (!progress.missedDays.includes(day)) {
    progress.missedDays = [...progress.missedDays, day].sort((a, b) => a - b)
  }
  saveMonthProgress(progress)
  return progress
}

export function mergeHistoryIntoProgress(
  completedDayNumbers: number[],
  missedDayNumbers: number[],
  month = istMonthKey(),
) {
  const progress = getMonthProgress(month)
  const completed = new Set([...progress.completedDays, ...completedDayNumbers])
  const missed = new Set(
    [...progress.missedDays, ...missedDayNumbers].filter((d) => !completed.has(d)),
  )
  const next: MonthProgress = {
    month,
    completedDays: [...completed].sort((a, b) => a - b),
    missedDays: [...missed].sort((a, b) => a - b),
  }
  saveMonthProgress(next)
  return next
}
