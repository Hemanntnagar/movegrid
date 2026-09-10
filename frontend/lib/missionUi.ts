import type { ApiMission } from './api'

export type UiMissionKind = 'Walk' | 'Climb' | 'Run' | 'Bike' | 'Hydration' | string

export type UiMission = {
  id: number
  title: string
  zone: string
  distance: string
  minutes: number
  move: number
  kind: UiMissionKind
  color: string
  description: string
}

const KIND_COLORS: Record<string, string> = {
  Walk: 'mint',
  Run: 'orange',
  Bike: 'blue',
  Climb: 'orange',
  Stairs: 'purple',
  Hydration: 'blue',
}

function estimateDistanceMiles(minutes: number, kind: string): string {
  const pace =
    kind === 'Run' ? 0.15 : kind === 'Bike' ? 0.2 : kind === 'Hydration' ? 0 : 0.08
  const miles = Math.max(0, minutes * pace)
  return `${miles.toFixed(1)} mi`
}

export function apiMissionToUi(m: ApiMission, index = 0): UiMission {
  const kind = (m.kind || 'Walk') as UiMissionKind
  const minutes = m.minutes || 15
  return {
    id: m.id,
    title: m.title,
    zone: m.zone,
    distance: estimateDistanceMiles(minutes, kind),
    minutes,
    move: m.move_reward || 100,
    kind,
    color: KIND_COLORS[kind] ?? (index % 3 === 0 ? 'mint' : index % 3 === 1 ? 'orange' : 'blue'),
    description: m.description,
  }
}

/** Prefer step-style daily quest when present; otherwise first mission. */
export function pickDailyStepMission(missions: ApiMission[]): ApiMission | null {
  if (!missions.length) return null
  const stepLike = missions.find((m) =>
    /step|10[\s,]?000|daily/i.test(`${m.title} ${m.description}`),
  )
  return stepLike ?? missions[0]
}

export function streakBadgeDetail(streak: number): string {
  const milestones = [7, 14, 21, 30]
  const next = milestones.find((m) => m > streak)
  if (!next) return 'Top streak tier unlocked'
  const remaining = next - streak
  return `${remaining} day${remaining === 1 ? '' : 's'} to ${next}-day badge`
}

export function rankMovementDetail(delta: number | undefined | null): string {
  if (delta == null || delta === 0) return 'Holding steady'
  if (delta > 0) return `↑ ${delta} place${delta === 1 ? '' : 's'}`
  return `↓ ${Math.abs(delta)} place${Math.abs(delta) === 1 ? '' : 's'}`
}
