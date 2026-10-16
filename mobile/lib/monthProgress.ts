import AsyncStorage from '@react-native-async-storage/async-storage'
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

export async function getMonthProgress(month = istMonthKey()): Promise<MonthProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(month))
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

async function saveMonthProgress(progress: MonthProgress) {
  await AsyncStorage.setItem(storageKey(progress.month), JSON.stringify(progress))
}

export async function markDayCompleted(day: number, month = istMonthKey()) {
  const progress = await getMonthProgress(month)
  if (!progress.completedDays.includes(day)) {
    progress.completedDays = [...progress.completedDays, day].sort((a, b) => a - b)
  }
  progress.missedDays = progress.missedDays.filter((d) => d !== day)
  await saveMonthProgress(progress)
  return progress
}

export async function mergeHistoryIntoProgress(
  completedDayNumbers: number[],
  missedDayNumbers: number[],
  month = istMonthKey(),
) {
  const progress = await getMonthProgress(month)
  const completed = new Set([...progress.completedDays, ...completedDayNumbers])
  const missed = new Set(
    [...progress.missedDays, ...missedDayNumbers].filter((d) => !completed.has(d)),
  )
  const next: MonthProgress = {
    month,
    completedDays: [...completed].sort((a, b) => a - b),
    missedDays: [...missed].sort((a, b) => a - b),
  }
  await saveMonthProgress(next)
  return next
}
