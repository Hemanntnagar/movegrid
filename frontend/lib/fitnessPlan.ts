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
}

export type OnboardingAnswers = {
  fitnessLevel: FitnessLevel
  goal: FitnessGoal
  dailyMinutes: number
  preferredWindows: TimeWindow[]
  focusAreas: FocusArea[]
}

const PLAN_KEY = 'movegrid_fitness_plan'

const GOAL_LABELS: Record<FitnessGoal, string> = {
  strength: 'Build strength',
  weight: 'Lose weight / burn',
  active: 'Stay active',
  flexibility: 'Improve flexibility',
}

const EXERCISE_BANK: Record<FocusArea, { title: string; notes: string }[]> = {
  Cardio: [
    { title: 'Jumping Jacks Circuit', notes: 'Keep a steady rhythm, land softly.' },
    { title: 'Brisk Interval Walk', notes: 'Alternate easy and fast walking.' },
    { title: 'Standing Marches', notes: 'Lift knees and swing arms.' },
  ],
  Strength: [
    { title: 'Bodyweight Squats', notes: 'Control the descent, push through heels.' },
    { title: 'Push-up Set', notes: 'Wall, knee, or floor based on level.' },
    { title: 'Lunges', notes: 'Alternate legs, keep torso upright.' },
  ],
  Core: [
    { title: 'Plank Hold', notes: 'Brace core, keep hips level.' },
    { title: 'Dead Bug', notes: 'Slow opposite arm/leg reaches.' },
    { title: 'Glute Bridge', notes: 'Squeeze at the top for 1 second.' },
  ],
  Walking: [
    { title: 'Campus Loop Walk', notes: 'Steady pace you can still talk through.' },
    { title: 'Recovery Stroll', notes: 'Easy steps to reset energy.' },
    { title: 'Steps Sprint Goal', notes: 'Aim for a chunk of your 10k steps.' },
  ],
  Mobility: [
    { title: 'Morning Mobility Flow', notes: 'Hips, shoulders, and spine openers.' },
    { title: 'Desk Stretch Break', notes: 'Neck, chest, and hip flexors.' },
    { title: 'Cool-down Stretch', notes: 'Hold each stretch calmly.' },
  ],
}

const WINDOW_DEFAULT_TIMES: Record<TimeWindow, string[]> = {
  Morning: ['07:00', '07:30', '08:00'],
  Midday: ['12:00', '12:30', '13:00'],
  Evening: ['17:30', '18:00', '18:30'],
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

function pickExercise(area: FocusArea, index: number) {
  const bank = EXERCISE_BANK[area]
  return bank[index % bank.length]
}

function distributeMinutes(total: number, slots: number): number[] {
  if (slots <= 0) return []
  const base = Math.max(5, Math.floor(total / slots))
  const parts = Array.from({ length: slots }, () => base)
  let leftover = total - base * slots
  let i = 0
  while (leftover > 0) {
    parts[i % parts.length] += 5
    leftover -= 5
    i += 1
  }
  return parts
}

/** Build a weekday-style daily timetable from onboarding answers. */
export function buildTimetable(answers: OnboardingAnswers): TimetableSlot[] {
  const windows =
    answers.preferredWindows.length > 0 ? answers.preferredWindows : (['Morning', 'Evening'] as TimeWindow[])
  const areas =
    answers.focusAreas.length > 0
      ? answers.focusAreas
      : (['Walking', 'Strength', 'Mobility'] as FocusArea[])

  const slotCount = Math.min(4, Math.max(windows.length, areas.length >= 3 ? 3 : areas.length))
  const durations = distributeMinutes(answers.dailyMinutes, slotCount)
  const schedule: TimetableSlot[] = []

  for (let i = 0; i < slotCount; i += 1) {
    const window = windows[i % windows.length]
    const area = areas[i % areas.length]
    const exercise = pickExercise(area, i + answers.fitnessLevel.length)
    const timeOptions = WINDOW_DEFAULT_TIMES[window]
    const time = timeOptions[Math.min(i, timeOptions.length - 1)]
    schedule.push({
      id: uid(),
      time,
      title: exercise.title,
      duration: durations[i] ?? 15,
      category: area,
      notes: `${window} · ${exercise.notes}`,
    })
  }

  return schedule.sort((a, b) => a.time.localeCompare(b.time))
}

export function createPlanFromAnswers(answers: OnboardingAnswers): FitnessPlan {
  return {
    version: 1,
    completedAt: new Date().toISOString(),
    fitnessLevel: answers.fitnessLevel,
    goal: answers.goal,
    dailyMinutes: answers.dailyMinutes,
    preferredWindows: answers.preferredWindows,
    focusAreas: answers.focusAreas,
    schedule: buildTimetable(answers),
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

export const CUSTOM_EXERCISE_PRESETS: { title: string; category: FocusArea; duration: number; notes: string }[] = [
  { title: 'Bodyweight Squats', category: 'Strength', duration: 10, notes: '20 controlled reps.' },
  { title: 'Push-up Set', category: 'Strength', duration: 10, notes: 'Match your fitness level.' },
  { title: 'Plank Hold', category: 'Core', duration: 5, notes: 'Accumulate hold time.' },
  { title: 'Campus Loop Walk', category: 'Walking', duration: 15, notes: 'Brisk conversational pace.' },
  { title: 'Jumping Jacks Circuit', category: 'Cardio', duration: 8, notes: '3 short rounds.' },
  { title: 'Morning Mobility Flow', category: 'Mobility', duration: 10, notes: 'Full-body openers.' },
  { title: 'Lunges', category: 'Strength', duration: 10, notes: '20 total alternating reps.' },
  { title: 'Cool-down Stretch', category: 'Mobility', duration: 8, notes: 'Slow breathing stretches.' },
]

export function newSlotFromPreset(index = 0): TimetableSlot {
  const preset = CUSTOM_EXERCISE_PRESETS[index % CUSTOM_EXERCISE_PRESETS.length]
  return {
    id: uid(),
    time: '18:00',
    title: preset.title,
    duration: preset.duration,
    category: preset.category,
    notes: preset.notes,
  }
}
