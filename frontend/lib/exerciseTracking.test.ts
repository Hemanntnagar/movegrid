import { describe, expect, it } from 'vitest'
import { resolveTrackingMode, resolveTrackingModeFromPlan, usesPoseRepCounter } from './exerciseTracking'

const base = {
  id: 1,
  description: '',
  category: 'Strength',
  difficulty: 'Beginner',
  duration_minutes: 0,
  target_reps: 12,
  instructions: '',
  points: 10,
}

describe('resolveTrackingMode', () => {
  it('maps only explicit squat/push-up/curl families', () => {
    expect(resolveTrackingMode({ ...base, name: 'Squats' })).toBe('squat')
    expect(resolveTrackingMode({ ...base, name: 'Push-ups' })).toBe('pushup')
    expect(resolveTrackingMode({ ...base, name: 'Biceps curl' })).toBe('bicep_curl')
    expect(resolveTrackingMode({ ...base, name: 'Jumping Jacks' })).toBe('jumping_jack')
  })

  it('does not treat unrelated lifts as squat or push-up', () => {
    expect(resolveTrackingMode({ ...base, name: 'Deadlift' })).toBe('manual')
    expect(resolveTrackingMode({ ...base, name: 'Calf raise' })).toBe('manual')
    expect(resolveTrackingMode({ ...base, name: 'Bent-over row' })).toBe('manual')
    expect(resolveTrackingMode({ ...base, name: 'Bench press' })).toBe('manual')
    expect(resolveTrackingMode({ ...base, name: 'Hip thrust' })).toBe('manual')
  })

  it('prefers the exercise name over a stale API tracking_mode', () => {
    expect(resolveTrackingMode({ ...base, name: 'Biceps curl', tracking_mode: 'pushup' })).toBe('bicep_curl')
  })

  it('keeps auto-count only for supported modes', () => {
    expect(usesPoseRepCounter('bicep_curl')).toBe(true)
    expect(usesPoseRepCounter('manual')).toBe(false)
    expect(usesPoseRepCounter('timed')).toBe(false)
  })

  it('infers curls from weekly-plan text', () => {
    expect(resolveTrackingModeFromPlan('Biceps curl', '3 × 12')).toBe('bicep_curl')
  })
})
