'use client'

import { useHealthNotifications } from '../context/HealthNotificationsContext'

/** @deprecated Prefer useHealthNotifications */
export function useExerciseReminders() {
  const {
    exerciseEnabled: enabled,
    permission,
    schedule,
    nextExerciseReminder: nextReminder,
    refresh,
    setExerciseEnabled,
  } = useHealthNotifications()

  return {
    enabled,
    permission,
    schedule,
    nextReminder,
    refresh,
    enableReminders: () => setExerciseEnabled(true),
    disableReminders: () => setExerciseEnabled(false),
    toggleReminders: async () => {
      if (enabled) {
        await setExerciseEnabled(false)
        return { ok: true as const }
      }
      return setExerciseEnabled(true)
    },
  }
}
