import { concatFrames, holdFrames, withJitter } from './fixtures'
import type { AnnotatedClip } from './replay'
import {
  completeCurlSequence,
  completeJackSequence,
  completePushUpSequence,
  completeSquatSequence,
  incompleteSquatSequence,
  jitteredStanding,
  randomArmWaveSequence,
  standingPose,
} from './sequences'

function clip(
  id: string,
  exercise: string,
  groundTruthReps: number,
  frames: AnnotatedClip['frames'],
  notes?: string,
): AnnotatedClip {
  return { id, exercise, groundTruthReps, frames, notes }
}

export function buildValidationClips(): AnnotatedClip[] {
  const twoSquats = concatFrames(completeSquatSequence(0), completeSquatSequence(2200))
  const twoPush = concatFrames(completePushUpSequence(0), completePushUpSequence(2000))
  const twoCurls = concatFrames(completeCurlSequence(0), completeCurlSequence(1800))
  const twoJacks = concatFrames(completeJackSequence(0), completeJackSequence(1400))

  return [
    clip('squat-complete-1', 'squat', 1, completeSquatSequence(), 'single valid squat'),
    clip('squat-complete-2', 'squat', 2, twoSquats, 'two valid squats'),
    clip('squat-complete-small', 'squat', 1, completeSquatSequence(0, 0.7), 'farther from camera'),
    clip('squat-complete-large', 'squat', 1, completeSquatSequence(0, 1.3), 'closer to camera'),
    clip('squat-incomplete', 'squat', 0, incompleteSquatSequence(), 'shallow bend'),
    clip('squat-random', 'squat', 0, randomArmWaveSequence(), 'arm wave while standing'),
    clip('squat-jitter', 'squat', 0, jitteredStanding(), 'landmark jitter'),
    clip(
      'squat-hold-top',
      'squat',
      1,
      concatFrames(completeSquatSequence(), holdFrames(standingPose(), 2000, 1200)),
      'hold after finish',
    ),
    clip('pushup-complete-2', 'pushup', 2, twoPush, 'two valid push-ups'),
    clip('pushup-false-curl', 'pushup', 0, completeCurlSequence(), 'standing curls are not push-ups'),
    clip('curl-complete-2', 'bicep_curl', 2, twoCurls, 'two valid curls'),
    clip('curl-not-squat', 'bicep_curl', 0, completeSquatSequence(), 'squat is not a curl'),
    clip('jack-complete-2', 'jumping_jack', 2, twoJacks, 'two valid jumping jacks'),
    clip('jack-not-squat', 'jumping_jack', 0, completeSquatSequence(), 'squat is not a jack'),
    clip(
      'squat-jittered-valid',
      'squat',
      1,
      withJitter(completeSquatSequence(), 0.006, 11),
      'valid squat with mild jitter',
    ),
  ]
}
