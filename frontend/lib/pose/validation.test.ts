import { describe, expect, it } from 'vitest'
import { buildValidationClips } from './clips'
import { createExerciseAnalyzer } from './factory'
import { evaluateClips } from './replay'
import type { ExerciseAnalyzer } from './types'

function analyzer(exercise: string): ExerciseAnalyzer {
  const created = createExerciseAnalyzer(exercise, { smoothingHalfLifeMs: 0 })
  if (!created) throw new Error(`No analyzer for ${exercise}`)
  return created
}

describe('validation clips', () => {
  const report = evaluateClips(buildValidationClips(), analyzer)

  it('records zero false increments on invalid sequences', () => {
    const invalid = report.clips.filter((row) => row.groundTruthReps === 0)
    expect(invalid.every((row) => row.predictedReps === 0)).toBe(true)
    expect(report.zeroRepFalsePositives).toBe(0)
  })

  it('does not duplicate a completed repetition', () => {
    const singles = report.clips.filter((row) => row.groundTruthReps === 1)
    expect(singles.every((row) => row.predictedReps === 1)).toBe(true)
  })

  it('does not count during zero-rep standing or unrelated movement', () => {
    expect(report.totalFalsePositives).toBe(0)
  })

  it('meets the synthetic count-accuracy target', () => {
    expect(report.overallAccuracy).not.toBeNull()
    expect(report.overallAccuracy ?? 0).toBeGreaterThanOrEqual(0.95)
    expect(report.totalMisses).toBe(0)
  })
})
