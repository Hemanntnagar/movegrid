import { getStoredUserId, userStorageInfix } from './userStorageScope'
import { resolveTrackingModeFromPlan } from './exerciseTracking'

export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type FitnessGoal =
  | 'height'
  | 'weight_gain'
  | 'weight_loss'
  | 'strength'
  | 'daily_fitness'
export type FocusArea = 'Cardio' | 'Strength' | 'Core' | 'Walking' | 'Mobility'
export type TimeWindow = 'Morning' | 'Midday' | 'Evening'

export type TimetableSlot = {
  id: string
  time: string
  title: string
  duration: number
  category: FocusArea
  notes: string
}

export type WeeklyPlanDay = {
  id: string
  day: string
  focus: string
  durationLabel: string
  exercises: { name: string; prescription: string; tracking_mode?: string }[]
  isRest?: boolean
}

export type FitnessPlan = {
  version: 1
  completedAt: string
  fitnessLevel: FitnessLevel
  goal: FitnessGoal
  dailyMinutes: number
  preferredWindows: TimeWindow[]
  focusAreas: FocusArea[]
  schedule: TimetableSlot[]
  planLayout?: 'daily' | 'weekly'
  weeklySchedule?: WeeklyPlanDay[]
  planHeadline?: string
  planSubtitle?: string
  planSource?: 'ai' | 'personalized' | 'template'
}

export type OnboardingAnswers = {
  fitnessLevel: FitnessLevel
  goal: FitnessGoal
  dailyMinutes: number
  preferredWindows: TimeWindow[]
  focusAreas: FocusArea[]
}

export type ApiGeneratedPlan = {
  fitness_level: string
  goal: string
  daily_minutes: number
  preferred_windows: string[]
  focus_areas: string[]
  schedule: TimetableSlot[]
  weekly_schedule?: WeeklyPlanDay[]
  plan_layout?: 'daily' | 'weekly'
  plan_headline?: string
  plan_subtitle?: string
  source: string
}

const PLAN_KEY = 'movegrid_fitness_plan'

function planStorageKey() {
  const infix = userStorageInfix()
  return infix ? `${PLAN_KEY}_${infix.slice(0, -1)}` : PLAN_KEY
}

function readStoredPlanRaw(): string | null {
  if (typeof window === 'undefined') return null
  const key = planStorageKey()
  const scoped = localStorage.getItem(key)
  if (scoped) return scoped
  if (getStoredUserId() != null) {
    const legacy = localStorage.getItem(PLAN_KEY)
    if (legacy) {
      localStorage.setItem(key, legacy)
      return legacy
    }
  }
  return null
}

const GOAL_LABELS: Record<FitnessGoal, string> = {
  height: 'Height increase',
  weight_gain: 'Weight gain',
  weight_loss: 'Weight loss',
  strength: 'Strength',
  daily_fitness: 'Daily fitness',
}

const LEGACY_GOAL_LABELS: Record<string, string> = {
  weight: 'Weight loss',
  active: 'Daily fitness',
  flexibility: 'Daily fitness',
}

function uid() {
  return `slot_${Math.random().toString(36).slice(2, 9)}`
}

export function goalLabel(goal: FitnessGoal | string) {
  if (goal in GOAL_LABELS) return GOAL_LABELS[goal as FitnessGoal]
  return LEGACY_GOAL_LABELS[goal] ?? String(goal)
}

export function getStoredPlan(): FitnessPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = readStoredPlanRaw()
    if (!raw) return null
    const parsed = JSON.parse(raw) as FitnessPlan
    if (!parsed?.completedAt) return null
    if (Array.isArray(parsed.weeklySchedule) && parsed.weeklySchedule.length > 0) {
      return {
        ...parsed,
        planLayout: parsed.planLayout ?? 'weekly',
        schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      }
    }
    if (!Array.isArray(parsed.schedule)) return null
    return parsed
  } catch {
    return null
  }
}

export function hasCompletedOnboarding(): boolean {
  return Boolean(getStoredPlan()?.completedAt)
}

export function saveFitnessPlan(plan: FitnessPlan) {
  localStorage.setItem(planStorageKey(), JSON.stringify(plan))
}

export function clearFitnessPlan() {
  localStorage.removeItem(planStorageKey())
}

export function createPlanFromGenerated(answers: OnboardingAnswers, generated: ApiGeneratedPlan): FitnessPlan {
  const isWeekly =
    generated.plan_layout === 'weekly' || (generated.weekly_schedule?.length ?? 0) > 0
  const source =
    generated.source === 'ai' ? 'ai' : generated.source === 'template' ? 'template' : 'personalized'
  return {
    version: 1,
    completedAt: new Date().toISOString(),
    fitnessLevel: answers.fitnessLevel,
    goal: answers.goal,
    dailyMinutes: answers.dailyMinutes,
    preferredWindows: answers.preferredWindows,
    focusAreas: answers.focusAreas,
    schedule: isWeekly
      ? []
      : generated.schedule.map((slot) => ({
          ...slot,
          id: slot.id || uid(),
          category: slot.category as FocusArea,
        })),
    planLayout: isWeekly ? 'weekly' : 'daily',
    weeklySchedule: generated.weekly_schedule?.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        tracking_mode: resolveTrackingModeFromPlan(exercise.name, exercise.prescription),
      })),
    })),
    planHeadline: generated.plan_headline,
    planSubtitle: generated.plan_subtitle,
    planSource: source,
  }
}

export const FOCUS_OPTIONS: FocusArea[] = ['Cardio', 'Strength', 'Core', 'Walking', 'Mobility']
export const WINDOW_OPTIONS: TimeWindow[] = ['Morning', 'Midday', 'Evening']
export const LEVEL_OPTIONS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced']
export const GOAL_OPTIONS: { id: FitnessGoal; label: string }[] = [
  { id: 'height', label: 'Height increase' },
  { id: 'weight_gain', label: 'Weight gain' },
  { id: 'weight_loss', label: 'Weight loss' },
  { id: 'strength', label: 'Strength' },
  { id: 'daily_fitness', label: 'Daily fitness' },
]
export const MINUTE_OPTIONS = [30, 60]

export function newEmptySlot(): TimetableSlot {
  return {
    id: uid(),
    time: '18:00',
    title: 'Custom movement block',
    duration: 15,
    category: 'Walking',
    notes: 'Add your own exercise details.',
  }
}
