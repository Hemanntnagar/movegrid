'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useHealthNotifications } from '../context/HealthNotificationsContext'
import {
  DAILY_EXERCISE_HOUR,
  SLEEP_HOUR,
  SLEEP_MINUTE,
  WATER_REMINDER_HOURS,
} from '../lib/healthNotifications'
import { formatScheduleTime12 } from '../lib/exerciseReminders'

function formatIstHour(hour: number, minute = 0): string {
  const h12 = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm} IST`
}

type ReminderRowProps = {
  title: string
  detail: string
  enabled: boolean
  onToggle: (next: boolean) => void
  disabled?: boolean
}

function ReminderRow({ title, detail, enabled, onToggle, disabled }: ReminderRowProps) {
  return (
    <div className="exercise-reminder-row">
      <div className="exercise-reminder-row-text">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <button
        type="button"
        className={enabled ? 'outline-button exercise-reminder-row-btn' : 'primary-button exercise-reminder-row-btn'}
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
      >
        {enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  )
}

export function ExerciseReminderBell() {
  const {
    exerciseEnabled,
    waterEnabled,
    sleepEnabled,
    anyEnabled,
    permission,
    schedule,
    nextExerciseReminder,
    setExerciseEnabled,
    setWaterEnabled,
    setSleepEnabled,
  } = useHealthNotifications()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function toggleKind(kind: 'exercise' | 'water' | 'sleep', next: boolean) {
    setMessage(null)
    const result =
      kind === 'exercise'
        ? await setExerciseEnabled(next)
        : kind === 'water'
          ? await setWaterEnabled(next)
          : await setSleepEnabled(next)
    if (result.message) setMessage(result.message)
  }

  const waterDetail = `Reminders at ${WATER_REMINDER_HOURS.map((h) => formatIstHour(h)).join(', ')}`
  const exerciseDetail = `Daily at ${formatIstHour(DAILY_EXERCISE_HOUR)}${
    schedule.length ? ', plus each workout time on your plan' : ''
  }`
  const sleepDetail = `Every day at ${formatIstHour(SLEEP_HOUR, SLEEP_MINUTE)}`

  const nextLabel = nextExerciseReminder
    ? `${nextExerciseReminder.slot.title} · ${formatScheduleTime12(nextExerciseReminder.slot.time)}${
        nextExerciseReminder.isToday ? '' : ' (tomorrow)'
      }`
    : null

  return (
    <div className="exercise-reminder-bell-wrap" ref={rootRef}>
      <button
        type="button"
        className={`icon-button exercise-reminder-bell ${anyEnabled ? 'is-on' : ''}`}
        aria-label={anyEnabled ? 'Health reminders on' : 'Open health reminders'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} className={anyEnabled ? 'bell-ring' : undefined} />
        {anyEnabled && <span className="exercise-reminder-dot" aria-hidden />}
      </button>

      {open && (
        <div className="exercise-reminder-panel" role="dialog" aria-label="Health reminders">
          <p className="eyebrow">NOTIFICATIONS</p>
          <strong>Health reminders</strong>
          <p className="exercise-reminder-copy">All times use India Standard Time (IST). Enable only what you want.</p>

          <div className="exercise-reminder-rows">
            <ReminderRow
              title="Exercise"
              detail={exerciseDetail}
              enabled={exerciseEnabled}
              onToggle={(next) => toggleKind('exercise', next)}
            />
            <ReminderRow
              title="Drink water"
              detail={waterDetail}
              enabled={waterEnabled}
              onToggle={(next) => toggleKind('water', next)}
            />
            <ReminderRow
              title="Sleep"
              detail={sleepDetail}
              enabled={sleepEnabled}
              onToggle={(next) => toggleKind('sleep', next)}
            />
          </div>

          {schedule.length === 0 && exerciseEnabled && (
            <p className="exercise-reminder-empty">
              Add workout times in{' '}
              <Link href="/assistant" onClick={() => setOpen(false)}>
                Assistant
              </Link>{' '}
              for scheduled exercise alerts (daily reminder still runs at {formatIstHour(DAILY_EXERCISE_HOUR)}).
            </p>
          )}

          {schedule.length > 0 && (
            <ul className="exercise-reminder-list">
              {schedule.map((slot) => (
                <li key={slot.id}>
                  <span>{formatScheduleTime12(slot.time)}</span>
                  <span>{slot.title}</span>
                </li>
              ))}
            </ul>
          )}

          {nextLabel && exerciseEnabled && (
            <p className="exercise-reminder-next">
              <small>Next workout</small>
              {nextLabel}
            </p>
          )}

          {message && <p className="exercise-reminder-msg">{message}</p>}
          {permission === 'denied' && (
            <p className="exercise-reminder-msg">Notifications are blocked — enable them in browser settings.</p>
          )}
        </div>
      )}
    </div>
  )
}
