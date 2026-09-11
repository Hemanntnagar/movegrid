import { getIstParts, istDateKey } from './ist'
import { getStoredPlan, type TimetableSlot } from './fitnessPlan'

export const EXERCISE_REMINDERS_ENABLED_KEY = 'movegrid_exercise_notifications'

export function parseScheduleTime(time: string): { hour: number; minute: number } | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function sortedSchedule(slots: TimetableSlot[]): TimetableSlot[] {
  return [...slots].sort((a, b) => a.time.localeCompare(b.time))
}

export function isExerciseRemindersEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(EXERCISE_REMINDERS_ENABLED_KEY) === '1'
}

export function setExerciseRemindersEnabled(enabled: boolean) {
  if (enabled) localStorage.setItem(EXERCISE_REMINDERS_ENABLED_KEY, '1')
  else localStorage.removeItem(EXERCISE_REMINDERS_ENABLED_KEY)
}

function notifiedStorageKey(slotId: string, dateKey = istDateKey()): string {
  return `movegrid_exercise_notified_${dateKey}_${slotId}`
}

export function wasExerciseNotifiedToday(slotId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(notifiedStorageKey(slotId)) === '1'
}

export function markExerciseNotifiedToday(slotId: string) {
  localStorage.setItem(notifiedStorageKey(slotId), '1')
}

export function formatScheduleTime12(time: string): string {
  const parsed = parseScheduleTime(time)
  if (!parsed) return time
  const { hour, minute } = parsed
  const h12 = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm} IST`
}

export type NextExerciseReminder = {
  slot: TimetableSlot
  minutesUntil: number
  isToday: boolean
}

export function getNextExerciseReminder(slots: TimetableSlot[], now = new Date()): NextExerciseReminder | null {
  if (!slots.length) return null
  const ist = getIstParts(now)
  const nowMinutes = ist.hour * 60 + ist.minute
  const ordered = sortedSchedule(slots)

  for (const slot of ordered) {
    const parsed = parseScheduleTime(slot.time)
    if (!parsed) continue
    const slotMinutes = parsed.hour * 60 + parsed.minute
    if (slotMinutes >= nowMinutes) {
      return {
        slot,
        minutesUntil: slotMinutes - nowMinutes,
        isToday: true,
      }
    }
  }

  const first = ordered[0]
  const firstParsed = parseScheduleTime(first.time)
  if (!firstParsed) return null
  const firstMinutes = firstParsed.hour * 60 + firstParsed.minute
  const minutesUntilTomorrow = 24 * 60 - nowMinutes + firstMinutes
  return {
    slot: first,
    minutesUntil: minutesUntilTomorrow,
    isToday: false,
  }
}

export function getDueExerciseSlots(slots: TimetableSlot[], now = new Date()): TimetableSlot[] {
  const ist = getIstParts(now)
  return sortedSchedule(slots).filter((slot) => {
    const parsed = parseScheduleTime(slot.time)
    if (!parsed) return false
    return parsed.hour === ist.hour && parsed.minute === ist.minute
  })
}

export function loadExerciseSchedule(): TimetableSlot[] {
  return getStoredPlan()?.schedule ?? []
}
