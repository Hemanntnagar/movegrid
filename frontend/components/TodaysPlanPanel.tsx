import type { TodaysPlanView } from '../lib/todaysPlan'

type TodaysPlanPanelProps = {
  planView: TodaysPlanView
}

export function TodaysPlanPanel({ planView }: TodaysPlanPanelProps) {
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
                  <small>{exercise.prescription}</small>
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
            <small>
              {slot.duration} min · {slot.notes || slot.category}
            </small>
          </li>
        ))}
      </ol>
    </section>
  )
}
