'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  FOCUS_OPTIONS,
  FitnessGoal,
  FitnessLevel,
  FocusArea,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  MINUTE_OPTIONS,
  OnboardingAnswers,
  TimeWindow,
  WINDOW_OPTIONS,
  buildTimetable,
  createPlanFromAnswers,
  goalLabel,
  hasCompletedOnboarding,
  saveFitnessPlan,
} from '../../lib/fitnessPlan'

const STEPS = ['Level', 'Goal', 'Time', 'Focus', 'Timetable'] as const

function toggleItem<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    fitnessLevel: 'Beginner',
    goal: 'active',
    dailyMinutes: 30,
    preferredWindows: ['Morning', 'Evening'],
    focusAreas: ['Walking', 'Strength'],
  })

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      router.replace('/')
    }
  }, [router])

  const previewSchedule = useMemo(() => buildTimetable(answers), [answers])

  const canContinue = useMemo(() => {
    if (step === 3) return answers.focusAreas.length > 0 && answers.preferredWindows.length > 0
    return true
  }, [answers.focusAreas.length, answers.preferredWindows.length, step])

  function finish() {
    const plan = createPlanFromAnswers(answers)
    saveFitnessPlan(plan)
    router.replace('/')
  }

  return (
    <div className="app-shell onboarding-shell">
      <main className="onboarding-main">
        <div className="onboarding-card">
          <p className="eyebrow">MOVEGRID SETUP · ONE TIME</p>
          <h1>
            Build your <span>daily timetable</span>
          </h1>
          <p className="subhead">
            Answer a few questions once. We&apos;ll design a schedule you follow every day. Customize later in Assistant.
          </p>

          <div className="onboarding-steps" aria-label="Onboarding progress">
            {STEPS.map((label, index) => (
              <div key={label} className={`onboarding-step ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}>
                <span>{index < step ? <Check size={12} /> : index + 1}</span>
                <small>{label}</small>
              </div>
            ))}
          </div>

          {step === 0 && (
            <section className="onboarding-section">
              <h2>What&apos;s your fitness level?</h2>
              <div className="choice-grid">
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`choice-chip ${answers.fitnessLevel === level ? 'selected' : ''}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, fitnessLevel: level as FitnessLevel }))}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="onboarding-section">
              <h2>What&apos;s your main goal?</h2>
              <div className="choice-grid">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={`choice-chip ${answers.goal === goal.id ? 'selected' : ''}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, goal: goal.id as FitnessGoal }))}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="onboarding-section">
              <h2>How much time can you commit daily?</h2>
              <div className="choice-grid">
                {MINUTE_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`choice-chip ${answers.dailyMinutes === mins ? 'selected' : ''}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, dailyMinutes: mins }))}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <h2 style={{ marginTop: '1.4rem' }}>When do you prefer to move?</h2>
              <div className="choice-grid">
                {WINDOW_OPTIONS.map((window) => (
                  <button
                    key={window}
                    type="button"
                    className={`choice-chip ${answers.preferredWindows.includes(window) ? 'selected' : ''}`}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        preferredWindows: toggleItem(prev.preferredWindows, window as TimeWindow),
                      }))
                    }
                  >
                    {window}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="onboarding-section">
              <h2>Which focus areas matter most?</h2>
              <p className="subhead" style={{ marginBottom: '0.9rem' }}>
                Pick at least one. We&apos;ll mix these into your daily timetable.
              </p>
              <div className="choice-grid">
                {FOCUS_OPTIONS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    className={`choice-chip ${answers.focusAreas.includes(area) ? 'selected' : ''}`}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        focusAreas: toggleItem(prev.focusAreas, area as FocusArea),
                      }))
                    }
                  >
                    {area}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="onboarding-section">
              <div className="timetable-summary">
                <div>
                  <p className="eyebrow">YOUR PLAN</p>
                  <h2>Daily timetable</h2>
                  <p className="subhead">
                    {answers.fitnessLevel} · {goalLabel(answers.goal)} · {answers.dailyMinutes} min/day
                  </p>
                </div>
                <CalendarDays size={22} />
              </div>
              <ol className="timetable-list">
                {previewSchedule.map((slot) => (
                  <li key={slot.id}>
                    <div className="timetable-time">
                      <Clock3 size={14} />
                      {slot.time}
                    </div>
                    <div>
                      <strong>{slot.title}</strong>
                      <small>
                        {slot.duration} min · {slot.category}
                      </small>
                      <span>{slot.notes}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="onboarding-note">
                <Sparkles size={14} /> You can customize exercises anytime in the Assistant menu.
              </p>
            </section>
          )}

          <div className="onboarding-actions">
            {step > 0 ? (
              <button type="button" className="outline-button" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft size={15} /> Back
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="primary-button"
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={finish}>
                <Target size={15} /> Start MOVEGRID
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
