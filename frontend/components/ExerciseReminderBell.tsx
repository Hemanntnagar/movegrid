'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useExerciseReminders } from '../hooks/useExerciseReminders'
import { formatScheduleTime12 } from '../lib/exerciseReminders'

export function ExerciseReminderBell() {
  const { enabled, permission, schedule, nextReminder, toggleReminders } = useExerciseReminders()
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

  async function handleToggle() {
    setMessage(null)
    const result = await toggleReminders()
    if ('message' in result && result.message) setMessage(result.message)
  }

  const nextLabel = nextReminder
    ? `${nextReminder.slot.title} · ${formatScheduleTime12(nextReminder.slot.time)}${
        nextReminder.isToday ? '' : ' (tomorrow)'
      }`
    : null

  return (
    <div className="exercise-reminder-bell-wrap" ref={rootRef}>
      <button
        type="button"
        className={`icon-button exercise-reminder-bell ${enabled ? 'is-on' : ''}`}
        aria-label={enabled ? 'Workout reminders on' : 'Turn on workout reminders'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} className={enabled ? 'bell-ring' : undefined} />
        {enabled && <span className="exercise-reminder-dot" aria-hidden />}
      </button>

      {open && (
        <div className="exercise-reminder-panel" role="dialog" aria-label="Workout reminders">
          <p className="eyebrow">DAILY EXERCISE</p>
          <strong>Scheduled reminders</strong>
          <p className="exercise-reminder-copy">
            Get a notification at each workout time on your plan (India Standard Time).
          </p>

          {schedule.length === 0 ? (
            <p className="exercise-reminder-empty">
              Complete onboarding or edit your plan in{' '}
              <Link href="/assistant" onClick={() => setOpen(false)}>
                Assistant
              </Link>{' '}
              to set exercise times.
            </p>
          ) : (
            <ul className="exercise-reminder-list">
              {schedule.map((slot) => (
                <li key={slot.id}>
                  <span>{formatScheduleTime12(slot.time)}</span>
                  <span>{slot.title}</span>
                </li>
              ))}
            </ul>
          )}

          {nextLabel && (
            <p className="exercise-reminder-next">
              <small>Next up</small>
              {nextLabel}
            </p>
          )}

          {message && <p className="exercise-reminder-msg">{message}</p>}
          {permission === 'denied' && (
            <p className="exercise-reminder-msg">Notifications are blocked — enable them in browser settings.</p>
          )}

          <button
            type="button"
            className={enabled ? 'outline-button exercise-reminder-toggle' : 'primary-button exercise-reminder-toggle'}
            onClick={handleToggle}
            disabled={schedule.length === 0 && !enabled}
          >
            {enabled ? 'Turn off reminders' : 'Enable reminders'}
          </button>
        </div>
      )}
    </div>
  )
}
