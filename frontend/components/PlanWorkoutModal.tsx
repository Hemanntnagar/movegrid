'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Camera, Check, ChevronRight, LoaderCircle, Play, Sparkles, X } from 'lucide-react'
import type { PlanExerciseItem } from '../lib/todaysPlan'
import {
  exerciseSupportsLiveCamera,
  planExerciseToApiExercise,
  repTargetForScheduledExercise,
} from '../lib/exerciseTracking'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'

const PostureCamera = dynamic(
  () => import('./PostureCamera').then((mod) => mod.PostureCamera),
  { ssr: false, loading: () => null },
)

type PlanWorkoutModalProps = {
  exercises: PlanExerciseItem[]
  initialIndex: number
  doneIds: Set<string>
  completing: boolean
  onClose: () => void
  onMarkDone: (exerciseId: string) => void
  onAllComplete: () => Promise<void>
}

export function PlanWorkoutModal({
  exercises,
  initialIndex,
  doneIds,
  completing,
  onClose,
  onMarkDone,
  onAllComplete,
}: PlanWorkoutModalProps) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, exercises.length - 1)))
  const current = exercises[index]
  const doneCount = exercises.filter((ex) => doneIds.has(ex.id)).length

  const scheduledExercise = useMemo(
    () => (current ? planExerciseToApiExercise(current) : null),
    [current],
  )
  const showCamera = scheduledExercise ? exerciseSupportsLiveCamera(scheduledExercise) : false
  const targetReps = scheduledExercise ? repTargetForScheduledExercise(scheduledExercise) : 10

  useBodyScrollLock(Boolean(current))

  if (!current) {
    return null
  }

  const currentDone = doneIds.has(current.id)
  const isLast = index >= exercises.length - 1

  async function handleMarkDone() {
    onMarkDone(current.id)
    if (isLast) {
      await onAllComplete()
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div className="modal-backdrop day-level-backdrop" onClick={onClose}>
      <div className="modal day-level-modal plan-workout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="day-level-modal-scroll">
        <div className="modal-kicker">
          <Play size={15} fill="currentColor" /> TODAY&apos;S WORKOUT
        </div>
        <h2>{current.name}</h2>
        <p className="plan-workout-prescription">{current.prescription}</p>

        {showCamera && scheduledExercise && (
          <div className="plan-workout-camera-section">
            <div className="modal-kicker plan-workout-camera-kicker">
              <Camera size={15} /> LIVE POSTURE TRACKING
            </div>
            <div className="exercise-runner-box posture-runner-box">
              <PostureCamera
                key={current.id}
                enabled
                scheduledExercise={scheduledExercise}
                targetReps={targetReps}
              />
            </div>
          </div>
        )}

        <div className="day-level-progress">
          <strong>
            {doneCount}/{exercises.length} exercises
          </strong>
          <div className="fitness-progress-bar">
            <span style={{ width: `${exercises.length ? (doneCount / exercises.length) * 100 : 0}%` }} />
          </div>
        </div>

        <ol className="plan-workout-queue">
          {exercises.map((exercise, i) => (
            <li key={exercise.id} className={i === index ? 'active' : ''} data-done={doneIds.has(exercise.id) ? '1' : '0'}>
              <span>{exercise.name}</span>
              <small>{doneIds.has(exercise.id) ? 'Done' : exercise.prescription}</small>
            </li>
          ))}
        </ol>

        <div className="plan-workout-actions">
          {!currentDone && (
            <button type="button" className="primary-button full" disabled={completing} onClick={() => void handleMarkDone()}>
              {completing ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Saving…
                </>
              ) : isLast ? (
                <>
                  <Sparkles size={16} /> Finish workout
                </>
              ) : (
                <>
                  <Check size={16} /> Mark done · Next
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          )}
          {currentDone && !isLast && (
            <button type="button" className="primary-button full" onClick={() => setIndex((i) => i + 1)}>
              Next exercise <ChevronRight size={16} />
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
