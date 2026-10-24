import type { AnalysisTick, ExerciseAnalyzer, PoseFrame } from './types'
import { RepCounter } from './repCounter'

export type ReplayResult = {
  predictedReps: number
  ticks: AnalysisTick[]
  completedAt: number[]
  attempts: number
  abandoned: number
}

export type AnnotatedClip = {
  id: string
  exercise: string
  groundTruthReps: number
  frames: PoseFrame[]
  notes?: string
}

export type ClipMetrics = {
  id: string
  exercise: string
  groundTruthReps: number
  predictedReps: number
  falsePositives: number
  misses: number
  countError: number
  accuracy: number | null
  notes?: string
}

export type ValidationReport = {
  clips: ClipMetrics[]
  totalGroundTruthReps: number
  totalPredictedReps: number
  totalFalsePositives: number
  totalMisses: number
  overallAccuracy: number | null
  zeroRepFalsePositives: number
}

export function replayLandmarkSequence(
  analyzer: ExerciseAnalyzer,
  frames: PoseFrame[],
): ReplayResult {
  const counter = new RepCounter(analyzer)
  const ticks: AnalysisTick[] = []
  const completedAt: number[] = []

  let lastTs = Number.NEGATIVE_INFINITY
  for (const frame of frames) {
    if (frame.timestampMs === lastTs) {
      continue
    }
    lastTs = frame.timestampMs
    const tick = counter.ingest(frame)
    ticks.push(tick)
    if (tick.repCompleted) completedAt.push(frame.timestampMs)
  }

  const events = counter.getEvents()
  return {
    predictedReps: counter.getCompletedReps(),
    ticks,
    completedAt,
    attempts: events.filter((event) => event.type === 'attempt_started').length,
    abandoned: events.filter((event) => event.type === 'attempt_abandoned').length,
  }
}

export function evaluateClip(analyzer: ExerciseAnalyzer, clip: AnnotatedClip): ClipMetrics {
  analyzer.resetAll()
  const result = replayLandmarkSequence(analyzer, clip.frames)
  const predicted = result.predictedReps
  const truth = clip.groundTruthReps
  const falsePositives = Math.max(0, predicted - truth)
  const misses = Math.max(0, truth - predicted)
  const countError = Math.abs(predicted - truth)
  const accuracy = truth > 0 ? 1 - countError / truth : null

  return {
    id: clip.id,
    exercise: clip.exercise,
    groundTruthReps: truth,
    predictedReps: predicted,
    falsePositives,
    misses,
    countError,
    accuracy,
    notes: clip.notes,
  }
}

export function evaluateClips(
  clips: AnnotatedClip[],
  createAnalyzer: (exercise: string) => ExerciseAnalyzer,
): ValidationReport {
  const results = clips.map((clip) => evaluateClip(createAnalyzer(clip.exercise), clip))
  const counted = results.filter((row) => row.groundTruthReps > 0)
  const zeroRep = results.filter((row) => row.groundTruthReps === 0)
  const totalGroundTruthReps = counted.reduce((sum, row) => sum + row.groundTruthReps, 0)
  const totalError = counted.reduce((sum, row) => sum + row.countError, 0)

  return {
    clips: results,
    totalGroundTruthReps,
    totalPredictedReps: results.reduce((sum, row) => sum + row.predictedReps, 0),
    totalFalsePositives: results.reduce((sum, row) => sum + row.falsePositives, 0),
    totalMisses: results.reduce((sum, row) => sum + row.misses, 0),
    overallAccuracy: totalGroundTruthReps > 0 ? 1 - totalError / totalGroundTruthReps : null,
    zeroRepFalsePositives: zeroRep.reduce((sum, row) => sum + row.falsePositives, 0),
  }
}
