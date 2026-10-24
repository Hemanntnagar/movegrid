import type { ExerciseAnalyzer } from './types'
import { SquatAnalyzer } from './analyzers/squat'
import { PushUpAnalyzer } from './analyzers/pushUp'
import { BicepCurlAnalyzer } from './analyzers/bicepCurl'
import { JumpingJackAnalyzer } from './analyzers/jumpingJack'
import { LungeAnalyzer } from './analyzers/lunge'
import { MountainClimberAnalyzer } from './analyzers/mountainClimber'
import { BurpeeAnalyzer } from './analyzers/burpee'

export function createExerciseAnalyzer(
  mode: string,
  options: { exerciseName?: string; smoothingHalfLifeMs?: number } = {},
): ExerciseAnalyzer | null {
  const name = (options.exerciseName ?? '').toLowerCase()
  const config = { smoothingHalfLifeMs: options.smoothingHalfLifeMs }

  switch (mode) {
    case 'squat':
      return new SquatAnalyzer(config)
    case 'pushup':
      return new PushUpAnalyzer({
        ...config,
        variant: name.includes('wall') ? 'wall' : 'floor',
      })
    case 'bicep_curl':
      return new BicepCurlAnalyzer(config)
    case 'jumping_jack':
      return new JumpingJackAnalyzer(config)
    case 'lunge':
      return new LungeAnalyzer(config)
    case 'mountain_climber':
      return new MountainClimberAnalyzer(config)
    case 'burpee':
      return new BurpeeAnalyzer(config)
    default:
      return null
  }
}

export function isAutoCountMode(mode: string): boolean {
  return createExerciseAnalyzer(mode) != null
}
