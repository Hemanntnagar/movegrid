import { getIstWeekdayName } from './ist'
import type { FitnessPlan, TimetableSlot, WeeklyPlanDay } from './fitnessPlan'
import { goalLabel } from './fitnessPlan'

export type TodaysWeeklyPlanView = {
  kind: 'weekly'
  weekday: string
  day: WeeklyPlanDay
  fitnessLevel: string
  goalLabel: string
  headline?: string
  subtitle?: string
}

export type TodaysDailyPlanView = {
  kind: 'daily'
  fitnessLevel: string
  goalLabel: string
  slots: TimetableSlot[]
}

export type TodaysPlanView = TodaysWeeklyPlanView | TodaysDailyPlanView

export type PlanExerciseItem = {
  id: string
  name: string
  prescription: string
}

export function getTodaysPlanExercises(planView: TodaysPlanView | null): PlanExerciseItem[] {
  if (!planView) return []
  if (planView.kind === 'weekly') {
    if (planView.day.isRest) return []
    return planView.day.exercises.map((exercise, index) => ({
      id: `${planView.day.id}_${index}`,
      name: exercise.name,
      prescription: exercise.prescription,
    }))
  }
  return planView.slots.map((slot) => ({
    id: slot.id,
    name: slot.title,
    prescription: `${slot.duration} min · ${slot.notes || slot.category}`,
  }))
}

function normalizePlanLayout(plan: FitnessPlan): 'weekly' | 'daily' {
  if (plan.planLayout === 'weekly' || (plan.weeklySchedule?.length ?? 0) > 0) return 'weekly'
  return 'daily'
}

export function getTodayWeeklyPlanDay(plan: FitnessPlan, now = new Date()): WeeklyPlanDay | null {
  const schedule = plan.weeklySchedule
  if (!schedule?.length) return null
  const weekday = getIstWeekdayName(now)
  return schedule.find((entry) => entry.day.toLowerCase() === weekday.toLowerCase()) ?? null
}

export function getTodaysPlanView(plan: FitnessPlan | null, now = new Date()): TodaysPlanView | null {
  if (!plan) return null
  const goal = goalLabel(plan.goal)
  const fitnessLevel = plan.fitnessLevel

  if (normalizePlanLayout(plan) === 'weekly') {
    const day = getTodayWeeklyPlanDay(plan, now)
    if (!day) return null
    return {
      kind: 'weekly',
      weekday: getIstWeekdayName(now),
      day,
      fitnessLevel,
      goalLabel: goal,
      headline: plan.planHeadline,
      subtitle: plan.planSubtitle,
    }
  }

  if (plan.schedule.length > 0) {
    return {
      kind: 'daily',
      fitnessLevel,
      goalLabel: goal,
      slots: plan.schedule,
    }
  }

  return null
}
