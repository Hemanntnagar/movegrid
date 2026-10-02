import type { WeeklyPlanDay } from '../lib/goalWeeklyPlans'

type WeeklyPlanScheduleProps = {
  headline: string
  subtitle: string
  days: WeeklyPlanDay[]
}

export function WeeklyPlanSchedule({ headline, subtitle, days }: WeeklyPlanScheduleProps) {
  return (
    <div className="weekly-plan">
      <div className="weekly-plan-intro">
        <h3>{headline}</h3>
        <p>{subtitle}</p>
        <p className="weekly-plan-timing-note">No fixed clock times — train whenever fits your day.</p>
      </div>
      <ol className="weekly-plan-list">
        {days.map((day) => (
          <li key={day.id} className={day.isRest ? 'rest-day' : ''}>
            <div className="weekly-plan-day-label">
              <strong>{day.day}</strong>
              <span>{day.durationLabel}</span>
            </div>
            <div className="weekly-plan-day-body">
              <p className="weekly-plan-focus">{day.focus}</p>
              {!day.isRest && day.exercises.length > 0 && (
                <ul>
                  {day.exercises.map((exercise) => (
                    <li key={`${day.id}_${exercise.name}`}>
                      <span>{exercise.name}</span>
                      <small>{exercise.prescription}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
