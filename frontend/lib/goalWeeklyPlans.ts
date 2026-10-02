import type { FitnessGoal, FitnessLevel } from './fitnessPlan'
import planCatalog from '../../shared/goal_weekly_plans.json'

export type WeeklyPlanExercise = {
  name: string
  prescription: string
}

export type WeeklyPlanDay = {
  id: string
  day: string
  focus: string
  durationLabel: string
  exercises: WeeklyPlanExercise[]
  isRest?: boolean
}

export type GoalWeeklyPlanVariant = {
  days: WeeklyPlanDay[]
}

export type GoalWeeklyPlanTemplate = {
  goal: FitnessGoal
  headline: string
  subtitle: string
  variants?: Record<string, GoalWeeklyPlanVariant>
  /** @deprecated Use variants + resolvePlanVariantKey */
  days?: WeeklyPlanDay[]
}

export function resolvePlanVariantKey(fitnessLevel: FitnessLevel | string, dailyMinutes: number): string {
  const raw = String(fitnessLevel ?? 'Beginner').trim().toLowerCase()
  const level = raw === 'beginner' || raw === 'intermediate' || raw === 'advanced' ? raw : 'beginner'
  const duration = dailyMinutes > 45 ? '60' : '30'
  return `${level}_${duration}`
}

function variantFallbackKeys(fitnessLevel: FitnessLevel | string, dailyMinutes: number): string[] {
  const raw = String(fitnessLevel ?? 'Beginner').trim().toLowerCase()
  const level =
    raw === 'beginner' || raw === 'intermediate' || raw === 'advanced' ? raw : 'beginner'
  const duration = dailyMinutes > 45 ? '60' : '30'
  const keys = [`${level}_${duration}`]
  if (level === 'advanced') keys.push(`intermediate_${duration}`)
  if (level === 'advanced' || level === 'intermediate') keys.push(`beginner_${duration}`)
  return keys
}

function resolveTemplateDays(
  template: GoalWeeklyPlanTemplate,
  fitnessLevel: FitnessLevel | string,
  dailyMinutes: number,
): WeeklyPlanDay[] {
  const variants = template.variants
  for (const key of variantFallbackKeys(fitnessLevel, dailyMinutes)) {
    const days = variants?.[key]?.days
    if (days?.length) return days
  }
  return template.days ?? []
}

const GOAL_WEEKLY_PLANS = planCatalog as Record<FitnessGoal, GoalWeeklyPlanTemplate>

const LEGACY_GOAL_IDS: Record<string, FitnessGoal> = {
  weight: 'weight_loss',
  active: 'daily_fitness',
  flexibility: 'height',
}

export function getGoalWeeklyPlan(
  goal: string,
  fitnessLevel: FitnessLevel = 'Beginner',
  dailyMinutes = 30,
): GoalWeeklyPlanTemplate | null {
  let base: GoalWeeklyPlanTemplate | undefined
  if (goal in GOAL_WEEKLY_PLANS) {
    base = GOAL_WEEKLY_PLANS[goal as FitnessGoal]
  } else {
    const mapped = LEGACY_GOAL_IDS[goal]
    base = mapped ? GOAL_WEEKLY_PLANS[mapped] : undefined
  }
  if (!base) return null
  const days = resolveTemplateDays(base, fitnessLevel, dailyMinutes)
  return { ...base, days }
}

export function formatWeeklyDayNotes(day: WeeklyPlanDay): string {
  if (day.isRest) return 'Rest day — recovery and nutrition support your progress.'
  if (!day.exercises.length) return day.focus
  return day.exercises.map((ex) => `${ex.name} — ${ex.prescription}`).join(' · ')
}

export type WeeklyPlanApiPayload = {
  fitness_level: string
  goal: string
  daily_minutes: number
  preferred_windows: string[]
  focus_areas: string[]
  schedule: []
  weekly_schedule: WeeklyPlanDay[]
  plan_layout: 'weekly'
  plan_headline: string
  plan_subtitle: string
  source: 'template'
}

export function buildWeeklyPlanApiResponse(answers: {
  fitness_level: string
  goal: string
  daily_minutes: number
  preferred_windows: string[]
  focus_areas: string[]
}): WeeklyPlanApiPayload | null {
  const template = getGoalWeeklyPlan(
    answers.goal,
    answers.fitness_level as FitnessLevel,
    answers.daily_minutes,
  )
  if (!template?.days?.length) return null
  return {
    fitness_level: answers.fitness_level,
    goal: answers.goal,
    daily_minutes: answers.daily_minutes,
    preferred_windows: answers.preferred_windows,
    focus_areas: answers.focus_areas,
    schedule: [],
    weekly_schedule: template.days,
    plan_layout: 'weekly',
    plan_headline: template.headline,
    plan_subtitle: template.subtitle,
    source: 'template',
  }
}
