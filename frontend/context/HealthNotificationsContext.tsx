'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  fireDueHealthNotifications,
  isAnyHealthNotifyEnabled,
  isExerciseNotifyEnabled,
  isSleepNotifyEnabled,
  isWaterNotifyEnabled,
  requestBrowserNotificationPermission,
  setExerciseNotifyEnabled,
  setSleepNotifyEnabled,
  setWaterNotifyEnabled,
} from '../lib/healthNotifications'
import {
  getNextExerciseReminder,
  loadExerciseSchedule,
  setExerciseRemindersEnabled,
  type NextExerciseReminder,
} from '../lib/exerciseReminders'
import type { TimetableSlot } from '../lib/fitnessPlan'

type ToggleResult = { ok: boolean; message?: string }

type HealthNotificationsContextValue = {
  exerciseEnabled: boolean
  waterEnabled: boolean
  sleepEnabled: boolean
  anyEnabled: boolean
  permission: NotificationPermission | 'unsupported'
  schedule: TimetableSlot[]
  nextExerciseReminder: NextExerciseReminder | null
  refresh: () => void
  setExerciseEnabled: (enabled: boolean) => Promise<ToggleResult>
  setWaterEnabled: (enabled: boolean) => Promise<ToggleResult>
  setSleepEnabled: (enabled: boolean) => Promise<ToggleResult>
}

const HealthNotificationsContext = createContext<HealthNotificationsContextValue | null>(null)

export function HealthNotificationsProvider({ children }: { children: ReactNode }) {
  const [exerciseEnabled, setExerciseEnabledState] = useState(false)
  const [waterEnabled, setWaterEnabledState] = useState(false)
  const [sleepEnabled, setSleepEnabledState] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [schedule, setSchedule] = useState<TimetableSlot[]>([])
  const [nextExerciseReminder, setNextExerciseReminder] = useState<NextExerciseReminder | null>(null)
  const lastMinuteKey = useRef('')

  const refresh = useCallback(() => {
    setExerciseEnabledState(isExerciseNotifyEnabled())
    setWaterEnabledState(isWaterNotifyEnabled())
    setSleepEnabledState(isSleepNotifyEnabled())
    const slots = loadExerciseSchedule()
    setSchedule(slots)
    setNextExerciseReminder(getNextExerciseReminder(slots))
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [])

  const ensurePermission = useCallback(async (): Promise<ToggleResult> => {
    const perm = await requestBrowserNotificationPermission()
    setPermission(perm)
    if (perm === 'unsupported') {
      return { ok: false, message: 'This browser does not support notifications.' }
    }
    if (perm !== 'granted') {
      return { ok: false, message: 'Allow notifications in your browser to get reminders.' }
    }
    return { ok: true }
  }, [])

  const setExerciseEnabled = useCallback(
    async (enabled: boolean): Promise<ToggleResult> => {
      if (!enabled) {
        setExerciseNotifyEnabled(false)
        setExerciseRemindersEnabled(false)
        setExerciseEnabledState(false)
        return { ok: true }
      }
      const permResult = await ensurePermission()
      if (!permResult.ok) return permResult
      setExerciseNotifyEnabled(true)
      setExerciseRemindersEnabled(true)
      setExerciseEnabledState(true)
      refresh()
      fireDueHealthNotifications()
      return { ok: true }
    },
    [ensurePermission, refresh],
  )

  const setWaterEnabled = useCallback(
    async (enabled: boolean): Promise<ToggleResult> => {
      if (!enabled) {
        setWaterNotifyEnabled(false)
        setWaterEnabledState(false)
        return { ok: true }
      }
      const permResult = await ensurePermission()
      if (!permResult.ok) return permResult
      setWaterNotifyEnabled(true)
      setWaterEnabledState(true)
      fireDueHealthNotifications()
      return { ok: true }
    },
    [ensurePermission],
  )

  const setSleepEnabled = useCallback(
    async (enabled: boolean): Promise<ToggleResult> => {
      if (!enabled) {
        setSleepNotifyEnabled(false)
        setSleepEnabledState(false)
        return { ok: true }
      }
      const permResult = await ensurePermission()
      if (!permResult.ok) return permResult
      setSleepNotifyEnabled(true)
      setSleepEnabledState(true)
      fireDueHealthNotifications()
      return { ok: true }
    },
    [ensurePermission],
  )

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
    if (!isAnyHealthNotifyEnabled()) return
    fireDueHealthNotifications()
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
      fireDueHealthNotifications(now)
      setNextExerciseReminder(getNextExerciseReminder(loadExerciseSchedule(), now))
    }, 1000)
    return () => window.clearInterval(id)
  }, [exerciseEnabled, waterEnabled, sleepEnabled])

  const value = useMemo(
    (): HealthNotificationsContextValue => ({
      exerciseEnabled,
      waterEnabled,
      sleepEnabled,
      anyEnabled: exerciseEnabled || waterEnabled || sleepEnabled,
      permission,
      schedule,
      nextExerciseReminder,
      refresh,
      setExerciseEnabled,
      setWaterEnabled,
      setSleepEnabled,
    }),
    [
      exerciseEnabled,
      waterEnabled,
      sleepEnabled,
      permission,
      schedule,
      nextExerciseReminder,
      refresh,
      setExerciseEnabled,
      setWaterEnabled,
      setSleepEnabled,
    ],
  )

  return <HealthNotificationsContext.Provider value={value}>{children}</HealthNotificationsContext.Provider>
}

export function useHealthNotifications() {
  const ctx = useContext(HealthNotificationsContext)
  if (!ctx) {
    throw new Error('useHealthNotifications must be used within HealthNotificationsProvider')
  }
  return ctx
}
