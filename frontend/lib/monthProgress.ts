// Helper module for month level progress tracking

export type DayLevelStatus = 'completed' | 'active' | 'missed' | 'locked' | 'closed'

export type MonthProgress = {
  monthKey: string
  completedDays: number[]
  missedDays: number[]
}

const STORAGE_KEY = 'movegrid_month_progress'

export function getMonthProgress(): MonthProgress {
  if (typeof window === 'undefined') {
    return { monthKey: '', completedDays: [], missedDays: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { monthKey: '', completedDays: [], missedDays: [] }
    const parsed = JSON.parse(raw)
    return {
      monthKey: parsed.monthKey || '',
      completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
      missedDays: Array.isArray(parsed.missedDays) ? parsed.missedDays : [],
    }
  } catch {
    return { monthKey: '', completedDays: [], missedDays: [] }
  }
}

export function saveMonthProgress(progress: MonthProgress): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Ignore storage errors
  }
}

export function markDayCompleted(day: number, monthKey: string): MonthProgress {
  const current = getMonthProgress()
  const isSameMonth = current.monthKey === monthKey
  const completed = new Set(isSameMonth ? current.completedDays : [])
  const missed = new Set((isSameMonth ? current.missedDays : []).filter((d) => d !== day))

  completed.add(day)

  const updated: MonthProgress = {
    monthKey,
    completedDays: Array.from(completed),
    missedDays: Array.from(missed),
  }
  saveMonthProgress(updated)
  return updated
}

export function markDayMissed(day: number, monthKey: string): MonthProgress {
  const current = getMonthProgress()
  const isSameMonth = current.monthKey === monthKey
  const completed = new Set(isSameMonth ? current.completedDays : [])
  const missed = new Set(isSameMonth ? current.missedDays : [])

  if (!completed.has(day)) {
    missed.add(day)
  }

  const updated: MonthProgress = {
    monthKey,
    completedDays: Array.from(completed),
    missedDays: Array.from(missed),
  }
  saveMonthProgress(updated)
  return updated
}

export function mergeHistoryIntoProgress(
  completedFromApi: number[],
  missedFromApi: number[],
  monthKey: string
): MonthProgress {
  const current = getMonthProgress()
  const isSameMonth = current.monthKey === monthKey

  const completed = new Set([
    ...(isSameMonth ? current.completedDays : []),
    ...completedFromApi,
  ])
  const missed = new Set([
    ...(isSameMonth ? current.missedDays : []).filter((d) => !completed.has(d)),
    ...missedFromApi.filter((d) => !completed.has(d)),
  ])

  const updated: MonthProgress = {
    monthKey,
    completedDays: Array.from(completed),
    missedDays: Array.from(missed),
  }
  saveMonthProgress(updated)
  return updated
}
