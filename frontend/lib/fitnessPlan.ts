export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type FitnessGoal = 'strength' | 'weight' | 'active' | 'flexibility'
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

export type FitnessPlan = {
  version: 1
  completedAt: string
  fitnessLevel: FitnessLevel
  goal: FitnessGoal
  dailyMinutes: number
  preferredWindows: TimeWindow[]
  focusAreas: FocusArea[]
  schedule: TimetableSlot[]
  planSource?: 'ai' | 'personalized'
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
  source: string
}

const PLAN_KEY = 'movegrid_fitness_plan'

const GOAL_LABELS: Record<FitnessGoal, string> = {
  strength: 'Build strength',
  weight: 'Lose weight / burn',
  active: 'Stay active',
  flexibility: 'Improve flexibility',
}

function uid() {
  return `slot_${Math.random().toString(36).slice(2, 9)}`
}

export function goalLabel(goal: FitnessGoal) {
  return GOAL_LABELS[goal]
}

export function getStoredPlan(): FitnessPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FitnessPlan
    if (!parsed?.completedAt || !Array.isArray(parsed.schedule)) return null
    return parsed
  } catch {
    return null
  }
}

export function hasCompletedOnboarding(): boolean {
  return Boolean(getStoredPlan()?.completedAt)
}

export function saveFitnessPlan(plan: FitnessPlan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
}

export function clearFitnessPlan() {
  localStorage.removeItem(PLAN_KEY)
}

export function createPlanFromGenerated(answers: OnboardingAnswers, generated: ApiGeneratedPlan): FitnessPlan {
  const source = generated.source === 'ai' ? 'ai' : 'personalized'
  return {
    version: 1,
    completedAt: new Date().toISOString(),
    fitnessLevel: answers.fitnessLevel,
    goal: answers.goal,
    dailyMinutes: answers.dailyMinutes,
    preferredWindows: answers.preferredWindows,
    focusAreas: answers.focusAreas,
    schedule: generated.schedule.map((slot) => ({
      ...slot,
      id: slot.id || uid(),
      category: slot.category as FocusArea,
    })),
    planSource: source,
  }
}

export const FOCUS_OPTIONS: FocusArea[] = ['Cardio', 'Strength', 'Core', 'Walking', 'Mobility']
export const WINDOW_OPTIONS: TimeWindow[] = ['Morning', 'Midday', 'Evening']
export const LEVEL_OPTIONS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced']
export const GOAL_OPTIONS: { id: FitnessGoal; label: string }[] = [
  { id: 'strength', label: 'Build strength' },
  { id: 'weight', label: 'Lose weight / burn' },
  { id: 'active', label: 'Stay active daily' },
  { id: 'flexibility', label: 'Improve flexibility' },
]
export const MINUTE_OPTIONS = [15, 30, 45, 60]

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
