import { describe, expect, it } from 'vitest'
import { SquatAnalyzer } from './analyzers/squat'
import { PushUpAnalyzer } from './analyzers/pushUp'
import { BicepCurlAnalyzer } from './analyzers/bicepCurl'
import { JumpingJackAnalyzer } from './analyzers/jumpingJack'
import { replayLandmarkSequence } from './replay'
import { RepCounter } from './repCounter'
import {
  completeCurlSequence,
  completeJackSequence,
  completePushUpSequence,
  completeSquatSequence,
  incompleteSquatSequence,
  jitteredStanding,
  lostTrackingGap,
  offsetSequence,
  randomArmWaveSequence,
  standingPose,
} from './sequences'
import { concatFrames, holdFrames, jumpingJackPose, withJitter } from './fixtures'
import type { ExerciseAnalyzer, PoseFrame } from './types'

const SMOOTH_OFF = { smoothingHalfLifeMs: 0 }

function countReps(analyzer: ExerciseAnalyzer, frames: PoseFrame[]): number {
  analyzer.resetAll()
  return replayLandmarkSequence(analyzer, frames).predictedReps
}

describe('SquatAnalyzer', () => {
  it('counts a complete squat once', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), completeSquatSequence())).toBe(1)
  })

  it('does not count an incomplete squat', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), incompleteSquatSequence())).toBe(0)
  })

  it('does not count random arm movement', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), randomArmWaveSequence())).toBe(0)
  })

  it('does not count a partial movement that resets', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), incompleteSquatSequence())).toBe(0)
  })

  it('does not count standing jitter', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), jitteredStanding())).toBe(0)
  })

  it('pauses on landmark loss and does not increment', () => {
    const start = holdFrames(standingPose(), 0, 250)
    const lost = lostTrackingGap(start, completeSquatSequence(0).slice(0, 8))
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), lost)).toBe(0)
  })

  it('recovers after the person leaves and re-enters, then counts a full squat', () => {
    const left = lostTrackingGap(holdFrames(standingPose(), 0, 200), completeSquatSequence())
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), left)).toBe(1)
  })

  it('does not increment again when the completed stand is held', () => {
    const frames = concatFrames(
      completeSquatSequence(),
      holdFrames(standingPose(), 2000, 1500),
    )
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), frames)).toBe(1)
  })

  it('ignores repeated timestamps', () => {
    const sequence = completeSquatSequence()
    const duplicated: PoseFrame[] = []
    for (const frame of sequence) {
      duplicated.push(frame, { ...frame })
    }
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), duplicated)).toBe(1)
  })

  it('counts at different body scales and camera distances', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), completeSquatSequence(0, 0.7))).toBe(1)
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), completeSquatSequence(0, 1.35))).toBe(1)
  })

  it('never increments on a zero-rep clip', () => {
    expect(countReps(new SquatAnalyzer(SMOOTH_OFF), holdFrames(standingPose(), 0, 2000))).toBe(0)
  })
})

describe('PushUpAnalyzer', () => {
  it('counts a complete floor push-up once', () => {
    expect(countReps(new PushUpAnalyzer(SMOOTH_OFF), completePushUpSequence())).toBe(1)
  })

  it('does not count standing arm bends as push-ups', () => {
    expect(countReps(new PushUpAnalyzer(SMOOTH_OFF), completeCurlSequence())).toBe(0)
    expect(countReps(new PushUpAnalyzer(SMOOTH_OFF), randomArmWaveSequence())).toBe(0)
  })

  it('does not count an incomplete dip', () => {
    const top = completePushUpSequence().slice(0, 6)
    const back = offsetSequence(completePushUpSequence().slice(0, 6), 800)
    expect(countReps(new PushUpAnalyzer(SMOOTH_OFF), concatFrames(top, back))).toBe(0)
  })
})

describe('BicepCurlAnalyzer', () => {
  it('counts a complete curl once', () => {
    expect(countReps(new BicepCurlAnalyzer(SMOOTH_OFF), completeCurlSequence())).toBe(1)
  })

  it('does not count a squat as a curl', () => {
    expect(countReps(new BicepCurlAnalyzer(SMOOTH_OFF), completeSquatSequence())).toBe(0)
  })

  it('does not count a punch-like swing without a full curl cycle from extension', () => {
    const frames = randomArmWaveSequence()
    const reps = countReps(new BicepCurlAnalyzer(SMOOTH_OFF), frames)
    expect(reps).toBeLessThanOrEqual(0)
  })
})

describe('JumpingJackAnalyzer', () => {
  it('counts a complete jumping jack once', () => {
    expect(countReps(new JumpingJackAnalyzer(SMOOTH_OFF), completeJackSequence())).toBe(1)
  })

  it('does not count arms-only or feet-only movement', () => {
    const closed = jumpingJackPose({ open: false })
    const arms = jumpingJackPose({ open: true, armsOnly: true })
    const feet = jumpingJackPose({ open: true, feetOnly: true })
    const armsOnly = concatFrames(
      holdFrames(closed, 0, 200),
      holdFrames(arms, 200, 200),
      holdFrames(closed, 400, 200),
    )
    const feetOnly = concatFrames(
      holdFrames(closed, 0, 200),
      holdFrames(feet, 200, 200),
      holdFrames(closed, 400, 200),
    )
    expect(countReps(new JumpingJackAnalyzer(SMOOTH_OFF), armsOnly)).toBe(0)
    expect(countReps(new JumpingJackAnalyzer(SMOOTH_OFF), feetOnly)).toBe(0)
  })
})

describe('RepCounter', () => {
  it('emits a single rep event for one completed movement', () => {
    const counter = new RepCounter(new SquatAnalyzer(SMOOTH_OFF))
    for (const frame of completeSquatSequence()) counter.ingest(frame)
    const reps = counter.getEvents().filter((event) => event.type === 'rep_completed')
    expect(reps).toHaveLength(1)
    expect(counter.getCompletedReps()).toBe(1)
  })

  it('preserves the count across a tracking gap', () => {
    const counter = new RepCounter(new SquatAnalyzer(SMOOTH_OFF))
    for (const frame of completeSquatSequence()) counter.ingest(frame)
    counter.ingestUnreliable(4000, 'Pose not detected — counting paused.')
    expect(counter.getCompletedReps()).toBe(1)
    for (const frame of offsetSequence(completeSquatSequence(), 4200)) counter.ingest(frame)
    expect(counter.getCompletedReps()).toBe(2)
  })

  it('does not increment from jittered incomplete motion', () => {
    const counter = new RepCounter(new SquatAnalyzer(SMOOTH_OFF))
    for (const frame of withJitter(incompleteSquatSequence(), 0.015, 3)) counter.ingest(frame)
    expect(counter.getCompletedReps()).toBe(0)
  })
})
