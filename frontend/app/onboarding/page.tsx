'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react'
import { WeeklyPlanSchedule } from '../../components/WeeklyPlanSchedule'
import {
  FitnessGoal,
  FitnessLevel,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  MINUTE_OPTIONS,
  OnboardingAnswers,
  TimetableSlot,
  createPlanFromGenerated,
  getStoredPlan,
  goalLabel,
  hasCompletedOnboarding,
  saveFitnessPlan,
} from '../../lib/fitnessPlan'
import { ApiFitnessPlanGenerateResult, getStoredToken, movegridApi } from '../../lib/api'

const STEPS = ['Level', 'Goal', 'Duration', 'Your plan'] as const
const PLAN_STEP = STEPS.length - 1

const DEFAULT_ANSWERS: OnboardingAnswers = {
  fitnessLevel: 'Beginner',
  goal: 'daily_fitness',
  dailyMinutes: 30,
  preferredWindows: ['Morning', 'Evening'],
  focusAreas: ['Walking', 'Strength'],
}

function answersFromStoredPlan(): OnboardingAnswers {
  const plan = getStoredPlan()
  if (!plan) return DEFAULT_ANSWERS
  return {
    fitnessLevel: plan.fitnessLevel,
    goal: plan.goal,
    dailyMinutes: plan.dailyMinutes,
    preferredWindows: plan.preferredWindows.length ? plan.preferredWindows : DEFAULT_ANSWERS.preferredWindows,
    focusAreas: plan.focusAreas.length ? plan.focusAreas : DEFAULT_ANSWERS.focusAreas,
  }
}

function OnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = searchParams.get('edit') === '1' || searchParams.get('retake') === '1'
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>(() =>
    isEdit ? answersFromStoredPlan() : DEFAULT_ANSWERS,
  )
  const [generatedPlan, setGeneratedPlan] = useState<ApiFitnessPlanGenerateResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit && hasCompletedOnboarding()) {
      router.replace('/')
    }
  }, [router, isEdit])

  const generatePlan = useCallback(async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      const token = getStoredToken()
      const generated = await movegridApi.generateFitnessPlan(
        {
          fitness_level: answers.fitnessLevel,
          goal: answers.goal,
          daily_minutes: answers.dailyMinutes,
          preferred_windows: answers.preferredWindows,
          focus_areas: answers.focusAreas,
        },
        token,
      )
      setGeneratedPlan(generated)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Could not generate your plan')
      setGeneratedPlan(null)
    } finally {
      setGenerating(false)
    }
  }, [answers])

  useEffect(() => {
    if (step === PLAN_STEP) {
      void generatePlan()
    }
  }, [step, generatePlan])

  const isWeeklyPlan = generatedPlan?.plan_layout === 'weekly' || (generatedPlan?.weekly_schedule?.length ?? 0) > 0
  const planReady = Boolean(
    isWeeklyPlan ? generatedPlan?.weekly_schedule?.length : generatedPlan?.schedule?.length,
  )

  function finish() {
    if (!generatedPlan || !planReady) return
    const plan = createPlanFromGenerated(answers, {
      fitness_level: generatedPlan.fitness_level,
      goal: generatedPlan.goal,
      daily_minutes: generatedPlan.daily_minutes,
      preferred_windows: generatedPlan.preferred_windows,
      focus_areas: generatedPlan.focus_areas,
      schedule: generatedPlan.schedule as TimetableSlot[],
      weekly_schedule: generatedPlan.weekly_schedule,
      plan_layout: generatedPlan.plan_layout,
      plan_headline: generatedPlan.plan_headline,
      plan_subtitle: generatedPlan.plan_subtitle,
      source: generatedPlan.source,
    })
    saveFitnessPlan(plan)
    router.replace(isEdit ? '/profile' : '/')
  }

  return (
    <div className="app-shell onboarding-shell">
      <main className="onboarding-main">
        <div className="onboarding-card">
          <p className="eyebrow">{isEdit ? 'MOVEGRID SETUP · RE-CUSTOMIZE' : 'MOVEGRID SETUP · ONE TIME'}</p>
          <h1>
            {isEdit ? (
              <>
                Update your <span>daily timetable</span>
              </>
            ) : (
              <>
                Build your <span>daily timetable</span>
              </>
            )}
          </h1>
          <p className="subhead">
            {isEdit
              ? 'Retake the questionnaire to regenerate a schedule that matches your current goals.'
              : 'Answer three questions once. Our AI coach designs a schedule from your goals. Customize later in Assistant.'}
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
              <h2>1. What&apos;s your fitness level?</h2>
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
              <h2>2. What&apos;s your main goal?</h2>
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
              <h2>3. How much time can you commit daily?</h2>
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
            </section>
          )}

          {step === PLAN_STEP && (
            <section className="onboarding-section">
              <div className="timetable-summary">
                <div>
                  <p className="eyebrow">YOUR PLAN</p>
                  <h2>{isWeeklyPlan ? 'Weekly schedule' : 'Daily timetable'}</h2>
                  <p className="subhead">
                    {answers.fitnessLevel} · {goalLabel(answers.goal)} · {answers.dailyMinutes} min/day
                  </p>
                </div>
                <CalendarDays size={22} />
              </div>

              {generating && (
                <p className="subhead" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={16} className="spin" /> Generating your personalized plan…
                </p>
              )}

              {generateError && (
                <p className="subhead" style={{ color: 'var(--danger, #f87171)' }}>
                  {generateError}
                </p>
              )}

              {!generating && planReady && isWeeklyPlan && generatedPlan?.weekly_schedule && (
                <>
                  <WeeklyPlanSchedule
                    headline={generatedPlan.plan_headline ?? goalLabel(answers.goal)}
                    subtitle={generatedPlan.plan_subtitle ?? ''}
                    days={generatedPlan.weekly_schedule}
                  />
                  <p className="onboarding-note">
                    <Sparkles size={14} /> Goal-based weekly schedule — no fixed times. Review anytime in Assistant.
                  </p>
                  <button type="button" className="outline-button" onClick={() => void generatePlan()} disabled={generating}>
                    Reload schedule
                  </button>
                </>
              )}

              {!generating && planReady && !isWeeklyPlan && generatedPlan?.schedule && (
                <>
                  <ol className="timetable-list">
                    {generatedPlan.schedule.map((slot) => (
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
                    <Sparkles size={14} />{' '}
                    {generatedPlan.source === 'ai'
                      ? 'Built by AI from your answers. Customize anytime in Assistant.'
                      : 'Personalized from your answers. Add GEMINI_API_KEY for full AI coaching.'}
                  </p>
                  <button type="button" className="outline-button" onClick={() => void generatePlan()} disabled={generating}>
                    Regenerate plan
                  </button>
                </>
              )}
            </section>
          )}

          <div className="onboarding-actions">
            {step > 0 ? (
              <button type="button" className="outline-button" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft size={15} /> Back
              </button>
            ) : isEdit ? (
              <button type="button" className="outline-button" onClick={() => router.push('/profile')}>
                <ArrowLeft size={15} /> Cancel
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => setStep((s) => s + 1)}
              >
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={finish}
                disabled={generating || !planReady}
              >
                <Target size={15} /> {isEdit ? 'Save updated plan' : 'Start MOVEGRID'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell fitness-loading">
          <p>Loading…</p>
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  )
}
