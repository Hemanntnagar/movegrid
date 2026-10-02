import { Camera, Check } from 'lucide-react'
import type { PlanExerciseItem, TodaysPlanView } from '../lib/todaysPlan'

type TodaysPlanPanelProps = {
  planView: TodaysPlanView
  planExercises?: PlanExerciseItem[]
  doneIds?: Set<string>
  onStartExercise?: (exerciseId: string) => void
  showExerciseActions?: boolean
}

export function TodaysPlanPanel({
  planView,
  planExercises = [],
  doneIds,
  onStartExercise,
  showExerciseActions = false,
}: TodaysPlanPanelProps) {
  const exerciseByName = new Map(planExercises.map((ex) => [ex.name, ex]))

  function renderExerciseAction(name: string) {
    if (!showExerciseActions || !onStartExercise) return null
    const item = exerciseByName.get(name)
    if (!item) return null
    const done = doneIds?.has(item.id)
    if (done) {
      return (
        <span className="plan-exercise-done-badge" aria-label="Completed">
          <Check size={14} /> Done
        </span>
      )
    }
    return (
      <button
        type="button"
        className="plan-exercise-start-btn"
        onClick={() => onStartExercise(item.id)}
      >
        <Camera size={14} />
        Start
      </button>
    )
  }

  if (planView.kind === 'weekly') {
    const { day, weekday, fitnessLevel, goalLabel, headline, subtitle } = planView
    return (
      <section className="todays-plan-panel" aria-label="Today's workout from your plan">
        <div className="todays-plan-panel-head">
          <p className="eyebrow">YOUR PLAN · {weekday.toUpperCase()}</p>
          <strong>
            {fitnessLevel} · {goalLabel}
          </strong>
          {headline && <h3>{headline}</h3>}
          {subtitle && <p className="todays-plan-subtitle">{subtitle}</p>}
        </div>
        <div className={`todays-plan-day-card ${day.isRest ? 'rest' : ''}`}>
          <div className="todays-plan-day-meta">
            <span>{day.focus}</span>
            <em>{day.durationLabel}</em>
          </div>
          {day.isRest ? (
            <p className="todays-plan-rest">Rest day — recovery is part of the program.</p>
          ) : (
            <ol className="todays-plan-exercises">
              {day.exercises.map((exercise) => (
                <li key={`${day.id}_${exercise.name}`}>
                  <span>{exercise.name}</span>
                  <div className="todays-plan-exercise-actions">
                    <small>{exercise.prescription}</small>
                    {renderExerciseAction(exercise.name)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="todays-plan-panel" aria-label="Today's workout from your plan">
      <div className="todays-plan-panel-head">
        <p className="eyebrow">YOUR DAILY TIMETABLE</p>
        <strong>
          {planView.fitnessLevel} · {planView.goalLabel}
        </strong>
      </div>
      <ol className="todays-plan-exercises">
        {planView.slots.map((slot) => (
          <li key={slot.id}>
            <span>{slot.title}</span>
            <div className="todays-plan-exercise-actions">
              <small>
                {slot.duration} min · {slot.notes || slot.category}
              </small>
              {renderExerciseAction(slot.title)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
