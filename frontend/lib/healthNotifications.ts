import { getIstParts, istDateKey } from './ist'
import { getStoredPlan, type TimetableSlot } from './fitnessPlan'
import {
  EXERCISE_REMINDERS_ENABLED_KEY,
  getDueExerciseSlots,
  NOTIFY_EXERCISE_KEY as EXERCISE_NOTIFY_STORAGE_KEY,
} from './exerciseReminders'

export const NOTIFY_EXERCISE_KEY = EXERCISE_NOTIFY_STORAGE_KEY
export const NOTIFY_WATER_KEY = 'movegrid_notify_water'
export const NOTIFY_SLEEP_KEY = 'movegrid_notify_sleep'

const LEGACY_EXERCISE_KEY = EXERCISE_REMINDERS_ENABLED_KEY

/** Daily exercise nudge (IST). */
export const DAILY_EXERCISE_HOUR = 8
export const DAILY_EXERCISE_MINUTE = 0

export const SLEEP_HOUR = 23
export const SLEEP_MINUTE = 0

/** Water reminders throughout the day (IST, on the hour). */
export const WATER_REMINDER_HOURS = [9, 11, 13, 15, 17, 19, 21] as const

export type HealthNotificationKind = 'exercise' | 'water' | 'sleep'

export type PendingHealthNotification = {
  id: string
  kind: HealthNotificationKind
  title: string
  body: string
  tag: string
}

function migrateLegacyExerciseFlag() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(LEGACY_EXERCISE_KEY) === '1' && localStorage.getItem(NOTIFY_EXERCISE_KEY) !== '1') {
    localStorage.setItem(NOTIFY_EXERCISE_KEY, '1')
  }
}

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false
  migrateLegacyExerciseFlag()
  return localStorage.getItem(key) === '1'
}

function writeFlag(key: string, enabled: boolean) {
  if (enabled) localStorage.setItem(key, '1')
  else localStorage.removeItem(key)
  if (key === NOTIFY_EXERCISE_KEY) {
    if (enabled) localStorage.setItem(LEGACY_EXERCISE_KEY, '1')
    else localStorage.removeItem(LEGACY_EXERCISE_KEY)
  }
}

export function isExerciseNotifyEnabled(): boolean {
  return readFlag(NOTIFY_EXERCISE_KEY)
}

export function isWaterNotifyEnabled(): boolean {
  return readFlag(NOTIFY_WATER_KEY)
}

export function isSleepNotifyEnabled(): boolean {
  return readFlag(NOTIFY_SLEEP_KEY)
}

export function isAnyHealthNotifyEnabled(): boolean {
  return isExerciseNotifyEnabled() || isWaterNotifyEnabled() || isSleepNotifyEnabled()
}

export function setExerciseNotifyEnabled(enabled: boolean) {
  writeFlag(NOTIFY_EXERCISE_KEY, enabled)
}

export function setWaterNotifyEnabled(enabled: boolean) {
  writeFlag(NOTIFY_WATER_KEY, enabled)
}

export function setSleepNotifyEnabled(enabled: boolean) {
  writeFlag(NOTIFY_SLEEP_KEY, enabled)
}

function notifiedStorageKey(id: string, dateKey = istDateKey()): string {
  return `movegrid_health_notified_${dateKey}_${id}`
}

export function wasHealthNotifiedToday(id: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(notifiedStorageKey(id)) === '1'
}

export function markHealthNotifiedToday(id: string) {
  localStorage.setItem(notifiedStorageKey(id), '1')
}

export function showHealthNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return
  }
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
    })
  } catch {
    /* ignore */
  }
}

function exerciseSlotNotification(slot: TimetableSlot): PendingHealthNotification {
  return {
    id: `exercise-slot-${slot.id}`,
    kind: 'exercise',
    title: 'Time for your workout',
    body: `${slot.title} · ${slot.duration} min · ${slot.category}`,
    tag: `movegrid-exercise-${slot.id}`,
  }
}

export function collectDueHealthNotifications(now = new Date()): PendingHealthNotification[] {
  const ist = getIstParts(now)
  const due: PendingHealthNotification[] = []

  if (isExerciseNotifyEnabled()) {
    if (ist.hour === DAILY_EXERCISE_HOUR && ist.minute === DAILY_EXERCISE_MINUTE) {
      due.push({
        id: 'exercise-daily',
        kind: 'exercise',
        title: 'Daily exercise reminder',
        body: 'Start your day with movement — open MOVEGRID and complete today’s workout.',
        tag: 'movegrid-exercise-daily',
      })
    }
    const slots = getStoredPlan()?.schedule ?? []
    for (const slot of getDueExerciseSlots(slots, now)) {
      due.push(exerciseSlotNotification(slot))
    }
  }

  if (isWaterNotifyEnabled()) {
    for (const hour of WATER_REMINDER_HOURS) {
      if (ist.hour === hour && ist.minute === 0) {
        due.push({
          id: `water-${hour}`,
          kind: 'water',
          title: 'Hydration reminder',
          body: 'Take a moment to drink water and stay hydrated.',
          tag: `movegrid-water-${hour}`,
        })
      }
    }
  }

  if (isSleepNotifyEnabled()) {
    if (ist.hour === SLEEP_HOUR && ist.minute === SLEEP_MINUTE) {
      due.push({
        id: 'sleep-bedtime',
        kind: 'sleep',
        title: 'Wind down for sleep',
        body: 'It’s 11:00 PM IST — time to rest so you can recover and move better tomorrow.',
        tag: 'movegrid-sleep-bedtime',
      })
    }
  }

  return due
}

export function fireDueHealthNotifications(now = new Date()) {
  for (const item of collectDueHealthNotifications(now)) {
    if (wasHealthNotifiedToday(item.id)) continue
    markHealthNotifiedToday(item.id)
    showHealthNotification(item.title, item.body, item.tag)
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  return perm
}
