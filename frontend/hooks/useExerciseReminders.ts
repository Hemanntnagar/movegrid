'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getDueExerciseSlots,
  isExerciseRemindersEnabled,
  loadExerciseSchedule,
  markExerciseNotifiedToday,
  setExerciseRemindersEnabled,
  wasExerciseNotifiedToday,
  type NextExerciseReminder,
  getNextExerciseReminder,
} from '../lib/exerciseReminders'
import type { TimetableSlot } from '../lib/fitnessPlan'

function showExerciseNotification(slot: TimetableSlot) {
  const title = 'Time for your workout'
  const body = `${slot.title} · ${slot.duration} min · ${slot.category}`
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: `movegrid-exercise-${slot.id}`,
        icon: '/favicon.ico',
      })
    } catch {
      /* ignore */
    }
  }
}

export function useExerciseReminders() {
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [schedule, setSchedule] = useState<TimetableSlot[]>([])
  const [nextReminder, setNextReminder] = useState<NextExerciseReminder | null>(null)
  const lastMinuteKey = useRef('')

  const refresh = useCallback(() => {
    setEnabled(isExerciseRemindersEnabled())
    const slots = loadExerciseSchedule()
    setSchedule(slots)
    setNextReminder(getNextExerciseReminder(slots))
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  const fireDueReminders = useCallback(() => {
    if (!isExerciseRemindersEnabled()) return
    const slots = loadExerciseSchedule()
    for (const slot of getDueExerciseSlots(slots)) {
      if (wasExerciseNotifiedToday(slot.id)) continue
      markExerciseNotifiedToday(slot.id)
      showExerciseNotification(slot)
    }
    setNextReminder(getNextExerciseReminder(slots))
  }, [])

  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onFocus)
    }
  }, [refresh])

  useEffect(() => {
    if (!enabled) return
    fireDueReminders()
    const id = window.setInterval(() => {
      const now = new Date()
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now)
      const map: Record<string, string> = {}
      for (const part of parts) {
        if (part.type !== 'literal') map[part.type] = part.value
      }
      const minuteKey = `${map.hour}:${map.minute}`
      if (minuteKey === lastMinuteKey.current) return
      lastMinuteKey.current = minuteKey
      fireDueReminders()
      setNextReminder(getNextExerciseReminder(loadExerciseSchedule()))
    }, 1000)
    return () => window.clearInterval(id)
  }, [enabled, fireDueReminders])

  const enableReminders = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { ok: false, message: 'This browser does not support notifications.' }
    }
    let perm = Notification.permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
    }
    setPermission(perm)
    if (perm !== 'granted') {
      setExerciseRemindersEnabled(false)
      setEnabled(false)
      return { ok: false, message: 'Allow notifications in your browser to get workout reminders.' }
    }
    setExerciseRemindersEnabled(true)
    setEnabled(true)
    refresh()
    fireDueReminders()
    return { ok: true }
  }, [refresh, fireDueReminders])

  const disableReminders = useCallback(() => {
    setExerciseRemindersEnabled(false)
    setEnabled(false)
  }, [])

  const toggleReminders = useCallback(async () => {
    if (enabled) {
      disableReminders()
      return { ok: true as const }
    }
    return enableReminders()
  }, [enabled, disableReminders, enableReminders])

  return {
    enabled,
    permission,
    schedule,
    nextReminder,
    refresh,
    enableReminders,
    disableReminders,
    toggleReminders,
  }
}
