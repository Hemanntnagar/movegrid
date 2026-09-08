'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  Clock3,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { AppChrome } from '../../components/AppChrome'
import {
  CUSTOM_EXERCISE_PRESETS,
  FOCUS_OPTIONS,
  FitnessPlan,
  FocusArea,
  TimetableSlot,
  getStoredPlan,
  hasCompletedOnboarding,
  newSlotFromPreset,
  saveFitnessPlan,
} from '../../lib/fitnessPlan'

export default function AssistantPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<FitnessPlan | null>(null)
  const [schedule, setSchedule] = useState<TimetableSlot[]>([])
  const [saved, setSaved] = useState(false)
  const [presetIndex, setPresetIndex] = useState(0)

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      router.replace('/onboarding')
      return
    }
    const stored = getStoredPlan()
    if (!stored) {
      router.replace('/onboarding')
      return
    }
    setPlan(stored)
    setSchedule(stored.schedule.map((slot) => ({ ...slot })))
  }, [router])

  const totalMinutes = useMemo(
    () => schedule.reduce((sum, slot) => sum + (Number(slot.duration) || 0), 0),
    [schedule]
  )

  function updateSlot(id: string, patch: Partial<TimetableSlot>) {
    setSchedule((prev) => prev.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)))
    setSaved(false)
  }

  function removeSlot(id: string) {
    setSchedule((prev) => prev.filter((slot) => slot.id !== id))
    setSaved(false)
  }

  function addSlot() {
    const next = newSlotFromPreset(presetIndex)
    setPresetIndex((i) => i + 1)
    setSchedule((prev) => [...prev, next].sort((a, b) => a.time.localeCompare(b.time)))
    setSaved(false)
  }

  function applyPreset(title: string) {
    const preset = CUSTOM_EXERCISE_PRESETS.find((item) => item.title === title)
    if (!preset) return
    setSchedule((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: newSlotFromPreset(0).id,
            time: '18:00',
            title: preset.title,
            duration: preset.duration,
            category: preset.category,
            notes: preset.notes,
          },
        ]
      }
      const last = prev[prev.length - 1]
      return prev.map((slot) =>
        slot.id === last.id
          ? {
              ...slot,
              title: preset.title,
              duration: preset.duration,
              category: preset.category,
              notes: preset.notes,
            }
          : slot
      )
    })
    setSaved(false)
  }

  function save() {
    if (!plan) return
    const next: FitnessPlan = {
      ...plan,
      dailyMinutes: totalMinutes || plan.dailyMinutes,
      schedule: [...schedule].sort((a, b) => a.time.localeCompare(b.time)),
    }
    saveFitnessPlan(next)
    setPlan(next)
    setSchedule(next.schedule)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  if (!plan) {
    return (
      <div className="app-shell fitness-loading">
        <p>Loading assistant…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AppChrome
        rightSlot={
          <Link href="/" className="outline-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={15} /> Home
          </Link>
        }
      />

      <main className="main-content">
        <div className="welcome" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow">ASSISTANT</p>
            <h1>
              Customize your <span>daily exercises</span>
            </h1>
            <p className="subhead">
              Edit times, swap moves, or add slots to the timetable you set during onboarding.
            </p>
          </div>
        </div>

        <section className="assistant-meta">
          <div>
            <p className="eyebrow">CURRENT PLAN</p>
            <strong>
              {plan.fitnessLevel} · {totalMinutes} min/day · {schedule.length} sessions
            </strong>
          </div>
          <button type="button" className="primary-button" onClick={save}>
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Saved' : 'Save timetable'}
          </button>
        </section>

        <section className="section-heading compact">
          <div>
            <p className="eyebrow">QUICK PRESETS</p>
            <h2>Tap to fill the last slot</h2>
          </div>
        </section>
        <div className="choice-grid assistant-presets">
          {CUSTOM_EXERCISE_PRESETS.map((preset) => (
            <button key={preset.title} type="button" className="choice-chip" onClick={() => applyPreset(preset.title)}>
              {preset.title}
            </button>
          ))}
        </div>

        <section className="section-heading compact">
          <div>
            <p className="eyebrow">DAILY TIMETABLE</p>
            <h2>Your schedule</h2>
          </div>
          <button type="button" className="outline-button" onClick={addSlot}>
            <Plus size={15} /> Add exercise
          </button>
        </section>

        <div className="assistant-slots">
          {schedule.map((slot) => (
            <article key={slot.id} className="assistant-slot">
              <label>
                Time
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
                />
              </label>
              <label>
                Exercise
                <input
                  type="text"
                  value={slot.title}
                  onChange={(e) => updateSlot(slot.id, { title: e.target.value })}
                />
              </label>
              <label>
                Minutes
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={slot.duration}
                  onChange={(e) => updateSlot(slot.id, { duration: Number(e.target.value) || 5 })}
                />
              </label>
              <label>
                Focus
                <select
                  value={slot.category}
                  onChange={(e) => updateSlot(slot.id, { category: e.target.value as FocusArea })}
                >
                  {FOCUS_OPTIONS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
              <label className="assistant-notes">
                Notes
                <input
                  type="text"
                  value={slot.notes}
                  onChange={(e) => updateSlot(slot.id, { notes: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="assistant-remove"
                onClick={() => removeSlot(slot.id)}
                aria-label={`Remove ${slot.title}`}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
          {schedule.length === 0 && (
            <div className="fitness-empty">
              <Clock3 size={22} />
              <strong>No exercises yet</strong>
              <span>Add a slot or pick a preset to rebuild your day.</span>
            </div>
          )}
        </div>

        <p className="onboarding-note" style={{ marginTop: '1.2rem' }}>
          <Sparkles size={14} /> Changes apply to your daily timetable immediately after you save.
        </p>
      </main>
    </div>
  )
}
