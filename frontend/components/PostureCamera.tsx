'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Check,
  Info,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trophy,
  Maximize2,
  Minimize2,
  VideoOff,
} from 'lucide-react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { ApiExercise } from '../lib/api'
import type { KeyPoint } from '../lib/poseLandmarker'
import { getPoseLandmarker, landmarksToKeypoints, toPoseFrame } from '../lib/poseLandmarker'
import {
  type ExerciseTrackingMode,
  liveCameraStartHint,
  repCounterLabel,
  resolveTrackingMode,
  usesPoseRepCounter,
} from '../lib/exerciseTracking'
import { createExerciseAnalyzer } from '../lib/pose/factory'
import { RepCounter } from '../lib/pose/repCounter'
import type { AnalysisTick, CyclePhase, TrackingStatus } from '../lib/pose/types'

export type { KeyPoint } from '../lib/poseLandmarker'

const SKELETON_CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
  [0, 11],
  [0, 12],
]

const DRAW_VISIBILITY_MIN = 0.35
const UI_THROTTLE_MS = 100

type PostureCameraProps = {
  enabled?: boolean
  scheduledExercise: ApiExercise
  assignmentId?: number
  targetReps?: number
  onRepsChange?: (reps: number) => void
  onPostureUpdate?: (score: number, isCorrect: boolean) => void
  onGoalComplete?: () => void
}

export function PostureCamera({
  enabled = false,
  scheduledExercise,
  assignmentId,
  targetReps: targetRepsProp,
  onRepsChange,
  onPostureUpdate,
  onGoalComplete,
}: PostureCameraProps) {
  const exerciseName = scheduledExercise.name
  const trackingMode = resolveTrackingMode(scheduledExercise)
  const targetReps =
    targetRepsProp ??
    (scheduledExercise.target_reps > 0
      ? scheduledExercise.target_reps
      : scheduledExercise.duration_minutes > 0
        ? Math.max(10, scheduledExercise.duration_minutes * 10)
        : 15)
  const autoRepCountEnabled = usesPoseRepCounter(trackingMode)
  const isManualCatalogExercise = trackingMode === 'manual'
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameId = useRef<number | null>(null)

  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [analysisPaused, setAnalysisPaused] = useState(false)
  const [sessionStopped, setSessionStopped] = useState(false)

  const [recSeconds, setRecSeconds] = useState(0)
  const [isPostureCorrect, setIsPostureCorrect] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState('Get into position to start counting reps')
  const [movementPhase, setMovementPhase] = useState<CyclePhase>('idle')
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('searching')
  const [formFeedback, setFormFeedback] = useState<string | null>(null)
  const [repsDone, setRepsDone] = useState(0)
  const [isGoalReached, setIsGoalReached] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isEnlarged, setIsEnlarged] = useState(false)
  const [poseModelLoading, setPoseModelLoading] = useState(false)
  const [poseModelReady, setPoseModelReady] = useState(false)
  const [poseModelError, setPoseModelError] = useState<string | null>(null)
  const [inferenceMs, setInferenceMs] = useState<number | null>(null)

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const lastKeypointsRef = useRef<KeyPoint[] | null>(null)
  const lastMediaTimeRef = useRef(-1)
  const lastMpTimestampRef = useRef(-1)
  const inferBusyRef = useRef(false)
  const lastUiUpdateRef = useRef(0)
  const inferenceMsRef = useRef<number | null>(null)
  const repsDoneRef = useRef(0)
  const goodFormRepsRef = useRef(0)
  const isGoalReachedRef = useRef(false)
  const analysisPausedRef = useRef(false)
  const formOkRef = useRef(true)
  const counterRef = useRef<RepCounter | null>(null)

  const exerciseNameRef = useRef(exerciseName)
  const trackingModeRef = useRef<ExerciseTrackingMode>(trackingMode)
  const targetRepsRef = useRef(targetReps)
  const autoRepCountRef = useRef(autoRepCountEnabled)
  const onRepsChangeRef = useRef(onRepsChange)
  const onPostureUpdateRef = useRef(onPostureUpdate)
  const autoGoalTriggeredRef = useRef(false)

  useEffect(() => {
    repsDoneRef.current = repsDone
  }, [repsDone])

  useEffect(() => {
    isGoalReachedRef.current = isGoalReached
  }, [isGoalReached])

  useEffect(() => {
    analysisPausedRef.current = analysisPaused
  }, [analysisPaused])

  const rebuildCounter = useCallback(() => {
    const analyzer = autoRepCountEnabled
      ? createExerciseAnalyzer(trackingMode, { exerciseName, smoothingHalfLifeMs: 70 })
      : null
    counterRef.current = analyzer ? new RepCounter(analyzer) : null
  }, [autoRepCountEnabled, trackingMode, exerciseName])

  useEffect(() => {
    rebuildCounter()
  }, [rebuildCounter])

  const resetRepTracking = useCallback(() => {
    counterRef.current?.resetCycle()
    lastKeypointsRef.current = null
    lastMediaTimeRef.current = -1
    lastMpTimestampRef.current = -1
    setMovementPhase('idle')
    setTrackingStatus('searching')
    setFormFeedback(null)
    setFeedbackMsg('Return to the starting position.')
  }, [])

  const resetSessionCount = useCallback(() => {
    counterRef.current?.reset()
    rebuildCounter()
    repsDoneRef.current = 0
    goodFormRepsRef.current = 0
    lastKeypointsRef.current = null
    lastMediaTimeRef.current = -1
    lastMpTimestampRef.current = -1
    setRepsDone(0)
    setIsGoalReached(false)
    autoGoalTriggeredRef.current = false
    setMovementPhase('idle')
    setTrackingStatus('searching')
    setFormFeedback(null)
    setFeedbackMsg('Return to the starting position.')
    onRepsChangeRef.current?.(0)
  }, [rebuildCounter])

  useEffect(() => {
    if (!enabled || !cameraStarted) {
      poseLandmarkerRef.current = null
      setPoseModelReady(false)
      setPoseModelLoading(false)
      return
    }

    let cancelled = false
    setPoseModelLoading(true)
    setPoseModelError(null)

    getPoseLandmarker()
      .then((landmarker) => {
        if (cancelled) return
        poseLandmarkerRef.current = landmarker
        setPoseModelReady(true)
      })
      .catch((err) => {
        console.error('Pose model load error:', err)
        if (!cancelled) {
          setPoseModelError('Could not load pose model. Check your connection and retry.')
        }
      })
      .finally(() => {
        if (!cancelled) setPoseModelLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, cameraStarted])

  useEffect(() => {
    if (!isEnlarged) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEnlarged(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isEnlarged])

  useEffect(() => {
    if (!cameraActive || isGoalReached || analysisPaused) return
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cameraActive, isGoalReached, analysisPaused])

  useEffect(() => {
    if (repsDone >= targetReps && targetReps > 0 && !autoGoalTriggeredRef.current) {
      autoGoalTriggeredRef.current = true
      setIsGoalReached(true)
      setFeedbackMsg(`Goal completed: ${repsDone}/${targetReps} validated reps.`)
      onGoalComplete?.()
    }
  }, [repsDone, targetReps, onGoalComplete])

  const startCamera = useCallback(async () => {
    setCameraLoading(true)
    setCameraError(null)
    setSessionStopped(false)

    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setCameraActive(true)
      } else {
        mediaStream.getTracks().forEach((track) => track.stop())
      }
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraError(
        'Could not access camera. Please enable webcam permissions in your browser.',
      )
      setCameraActive(false)
    } finally {
      setCameraLoading(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    inferBusyRef.current = false
    setCameraActive(false)
  }, [])

  useEffect(() => {
    if (!enabled || !cameraStarted) {
      stopCamera()
      setCameraLoading(false)
      if (!cameraStarted) setCameraError(null)
      return
    }
    startCamera()
    return () => stopCamera()
  }, [enabled, cameraStarted, facingMode, startCamera, stopCamera])

  useEffect(() => {
    if (!enabled) {
      setCameraStarted(false)
      setAnalysisPaused(false)
    }
  }, [enabled])

  useEffect(() => {
    setCameraStarted(false)
    stopCamera()
    setRecSeconds(0)
    setSessionStopped(false)
    setAnalysisPaused(false)
    resetSessionCount()
  }, [scheduledExercise.id, assignmentId, resetSessionCount, stopCamera])

  useEffect(() => {
    exerciseNameRef.current = exerciseName
    trackingModeRef.current = trackingMode
    targetRepsRef.current = targetReps
    autoRepCountRef.current = autoRepCountEnabled
  }, [exerciseName, trackingMode, targetReps, autoRepCountEnabled])

  useEffect(() => {
    onRepsChangeRef.current = onRepsChange
    onPostureUpdateRef.current = onPostureUpdate
  }, [onRepsChange, onPostureUpdate])

  const publishUi = useCallback((tick: AnalysisTick | null, fallback?: string) => {
    const now = performance.now()
    if (tick && !tick.repCompleted && now - lastUiUpdateRef.current < UI_THROTTLE_MS) return
    lastUiUpdateRef.current = now

    if (!tick) {
      setTrackingStatus('searching')
      setMovementPhase('idle')
      setFeedbackMsg(fallback ?? 'Pose not detected — counting paused.')
      setIsPostureCorrect(true)
      setFormFeedback(null)
      return
    }

    setMovementPhase(tick.phase)
    setTrackingStatus(tick.tracking)
    setFeedbackMsg(tick.formFeedback ?? tick.guidance)
    setFormFeedback(tick.formFeedback)
    const formOk = !tick.formFeedback && tick.tracking !== 'unreliable' && tick.tracking !== 'framing'
    formOkRef.current = formOk
    setIsPostureCorrect(formOk)

    if (tick.completedReps > 0) {
      const score = Math.round((goodFormRepsRef.current / tick.completedReps) * 100)
      onPostureUpdateRef.current?.(score, !tick.formFeedback)
    }
  }, [])

  const applyTick = useCallback(
    (tick: AnalysisTick) => {
      if (tick.repCompleted) {
        const next = tick.completedReps
        repsDoneRef.current = next
        if (!tick.formFeedback) goodFormRepsRef.current += 1
        setRepsDone(next)
        onRepsChangeRef.current?.(next)
      }
      publishUi(tick)
    },
    [publishUi],
  )

  useEffect(() => {
    if (!cameraActive || !poseModelReady || !videoRef.current || !canvasRef.current) return

    let running = true

    const processFrame = () => {
      if (!running) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = poseLandmarkerRef.current

      if (
        video &&
        canvas &&
        landmarker &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          const hidden = document.visibilityState === 'hidden'
          const paused = analysisPausedRef.current || hidden || isGoalReachedRef.current
          const newVideoFrame = video.currentTime !== lastMediaTimeRef.current

          if (!paused && newVideoFrame && !inferBusyRef.current) {
            lastMediaTimeRef.current = video.currentTime
            inferBusyRef.current = true

            let timestamp = performance.now()
            if (timestamp <= lastMpTimestampRef.current) {
              timestamp = lastMpTimestampRef.current + 1
            }
            lastMpTimestampRef.current = timestamp

            try {
              const started = performance.now()
              const result = landmarker.detectForVideo(video, timestamp)
              const elapsed = performance.now() - started
              if (elapsed > 0 && Math.abs(elapsed - (inferenceMsRef.current ?? 0)) > 12) {
                inferenceMsRef.current = Math.round(elapsed)
                setInferenceMs(inferenceMsRef.current)
              }

              const landmarks = result.landmarks[0]
              if (landmarks?.length) {
                lastKeypointsRef.current = landmarksToKeypoints(
                  landmarks,
                  canvas.width,
                  canvas.height,
                )
                const counter = counterRef.current
                if (counter && autoRepCountRef.current && !isGoalReachedRef.current) {
                  applyTick(counter.ingest(toPoseFrame(landmarks, timestamp)))
                } else {
                  publishUi(null, autoRepCountRef.current
                    ? 'Pose tracked — waiting for the starting position.'
                    : `${exerciseNameRef.current}: pose locked — tap +1 per rep`)
                }
              } else {
                lastKeypointsRef.current = null
                if (counterRef.current && autoRepCountRef.current) {
                  applyTick(
                    counterRef.current.ingestUnreliable(
                      timestamp,
                      'Pose not detected — counting paused.',
                    ),
                  )
                } else {
                  publishUi(null, 'Pose not detected — counting paused.')
                }
              }
            } catch (err) {
              console.warn('Pose inference skipped:', err)
            } finally {
              inferBusyRef.current = false
            }
          } else if (paused && newVideoFrame && autoRepCountRef.current && counterRef.current) {
            lastMediaTimeRef.current = video.currentTime
            if (!isGoalReachedRef.current) {
              applyTick(
                counterRef.current.ingestUnreliable(
                  performance.now(),
                  analysisPausedRef.current
                    ? 'Counting paused. Resume when you are ready.'
                    : 'Pose not detected — counting paused.',
                ),
              )
            }
          }

          const keypoints = lastKeypointsRef.current
          if (keypoints?.length) {
            drawSkeleton(ctx, keypoints, isGoalReachedRef.current, formOkRef.current)
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(processFrame)
    }

    animationFrameId.current = requestAnimationFrame(processFrame)

    return () => {
      running = false
      inferBusyRef.current = false
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }
  }, [cameraActive, poseModelReady, applyTick, publishUi])

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const percentProgress = Math.min(100, Math.round((repsDone / (targetReps || 1)) * 100))
  const cameraStartHint = liveCameraStartHint(trackingMode)
  const showStartScreen = enabled && !cameraStarted && !cameraError
  const mirrored = facingMode === 'user'
  const statusChip = statusChipCopy({
    isGoalReached,
    analysisPaused,
    trackingStatus,
    movementPhase,
    autoRepCountEnabled,
    trackingMode,
  })

  return (
    <div
      className={`posture-camera-wrapper${isEnlarged ? ' is-enlarged' : ''}${isManualCatalogExercise ? ' tracking-manual' : ''}`}
    >
      <div className="posture-status-header">
        <div className={`rec-live-badge${cameraActive ? '' : ' idle'}`}>
          {cameraActive && !analysisPaused ? <span className="rec-dot-pulse" /> : null}
          <span className="rec-text">
            {cameraActive
              ? `${analysisPaused ? 'PAUSED' : 'REC'} ${formatRecTime(recSeconds)}`
              : 'Camera off'}
          </span>
        </div>

        <div className={`posture-accuracy-chip ${statusChip.tone}`}>
          {statusChip.tone === 'goal' ? (
            <Trophy size={15} />
          ) : statusChip.tone === 'good' ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          <span>{statusChip.label}</span>
        </div>
      </div>

      <div className="posture-video-container">
        {showStartScreen && (
          <div className="camera-start-overlay">
            <Camera size={36} />
            {isManualCatalogExercise && (
              <span className="camera-manual-badge">System exercise · pose model</span>
            )}
            <p className="camera-start-title">{exerciseName}</p>
            <p className="camera-start-subtitle">{repCounterLabel(trackingMode, exerciseName)}</p>
            <p>{cameraStartHint}</p>
            {sessionStopped && (
              <p className="camera-start-subtitle">
                Last session: {repsDone} validated reps in {formatRecTime(recSeconds)}
              </p>
            )}
            <button
              type="button"
              className="primary-button camera-start-btn"
              onClick={() => {
                setSessionStopped(false)
                setCameraStarted(true)
              }}
            >
              <Play size={16} fill="currentColor" /> Start camera
            </button>
          </div>
        )}

        {(cameraLoading || poseModelLoading) && cameraStarted && (
          <div className="camera-loading-overlay">
            <RefreshCw size={28} className="spin" />
            <p>
              {poseModelLoading
                ? 'Loading pose model…'
                : 'Starting camera…'}
            </p>
          </div>
        )}

        {poseModelError && !cameraError && cameraStarted && (
          <div className="camera-error-box">
            <VideoOff size={36} />
            <p>{poseModelError}</p>
            <button
              type="button"
              className="primary-button compact-btn"
              onClick={() => {
                setPoseModelError(null)
                setPoseModelReady(false)
                getPoseLandmarker()
                  .then((landmarker) => {
                    poseLandmarkerRef.current = landmarker
                    setPoseModelReady(true)
                  })
                  .catch(() =>
                    setPoseModelError('Could not load pose model. Check your connection and retry.'),
                  )
              }}
            >
              <RefreshCw size={14} /> Retry Model
            </button>
          </div>
        )}

        {cameraStarted && !cameraError && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`posture-video-feed${mirrored ? ' mirrored' : ''}`}
            />
            <canvas
              ref={canvasRef}
              className={`posture-canvas-overlay${mirrored ? ' mirrored' : ''}`}
            />
          </>
        )}

        {cameraError ? (
          <div className="camera-error-box">
            <VideoOff size={36} />
            <p>{cameraError}</p>
            <button
              type="button"
              className="primary-button compact-btn"
              onClick={startCamera}
            >
              <RefreshCw size={14} /> Retry Camera
            </button>
          </div>
        ) : null}

        {isGoalReached && (
          <div className="goal-complete-overlay">
            <div className="goal-trophy-badge">
              <Trophy size={38} className="bounce" />
            </div>
            <h3>{targetReps} {exerciseName} COMPLETED!</h3>
            <p>
              {repsDone} validated reps in {formatRecTime(recSeconds)}
              {inferenceMs != null ? ` · ${inferenceMs}ms/frame` : ''}
            </p>
          </div>
        )}

        {!isGoalReached && cameraActive && poseModelReady && (
          <div className="posture-mobile-tip">
            <Camera size={14} />
            <span>
              {phaseLabel(movementPhase, trackingMode)}
              {' · '}
              {trackingLabel(trackingStatus, analysisPaused)}
              {inferenceMs != null ? ` · ${inferenceMs}ms` : ''}
            </span>
          </div>
        )}

        {!isGoalReached && cameraStarted && (
          <div className={`posture-guidance-banner ${isPostureCorrect ? 'good' : 'warn'}`}>
            <Info size={15} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {cameraActive && (
        <div className="posture-camera-controls">
          <button
            type="button"
            className="camera-ctrl-pill"
            onClick={() => setIsEnlarged((prev) => !prev)}
            title={isEnlarged ? 'Exit enlarged view' : 'Enlarge camera'}
            aria-pressed={isEnlarged}
          >
            {isEnlarged ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isEnlarged ? 'Shrink' : 'Enlarge'}</span>
          </button>
          <button
            type="button"
            className="camera-ctrl-pill"
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            title="Switch Camera"
          >
            <RefreshCw size={14} />
            <span>Flip</span>
          </button>
          <button
            type="button"
            className="camera-ctrl-pill"
            onClick={() => {
              setAnalysisPaused((prev) => {
                const next = !prev
                analysisPausedRef.current = next
                if (next) resetRepTracking()
                return next
              })
            }}
            title={analysisPaused ? 'Resume counting' : 'Pause counting'}
          >
            {analysisPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{analysisPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            type="button"
            className="camera-ctrl-pill"
            onClick={resetSessionCount}
            title="Reset validated rep count"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="camera-ctrl-pill"
            onClick={() => {
              setSessionStopped(true)
              setCameraStarted(false)
              stopCamera()
            }}
            title="Stop camera session"
          >
            <Square size={14} />
            <span>Stop</span>
          </button>
        </div>
        )}
      </div>

      {cameraStarted && (
      <div className="rep-progress-track">
        <div
          className={`rep-progress-fill ${isGoalReached ? 'complete' : ''}`}
          style={{ width: `${percentProgress}%` }}
        />
      </div>
      )}

      {cameraStarted && (
      <div className="posture-rep-tracker-bar">
        <div className="rep-count-label">
          <span className="rep-number">{repsDone}</span>
          <span className="rep-target">/ {targetReps} Validated reps</span>
        </div>

        <div className="rep-increment-buttons">
          {!isGoalReached ? (
            <button
              type="button"
              className="outline-button compact-btn"
              onClick={() => {
                const next = repsDone + 1
                repsDoneRef.current = next
                setRepsDone(next)
                onRepsChange?.(next)
              }}
            >
              +1 Rep
            </button>
          ) : (
            <span className="goal-done-chip">
              <Check size={14} /> Complete
            </span>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  keypoints: KeyPoint[],
  goalReached: boolean,
  formOk: boolean,
) {
  ctx.lineWidth = 4
  ctx.strokeStyle = goalReached ? '#ffd447' : formOk ? '#b7e88f' : '#ff5964'
  ctx.shadowColor = goalReached ? '#ffb703' : formOk ? '#27ae60' : '#d90429'
  ctx.shadowBlur = 12

  for (const [i1, i2] of SKELETON_CONNECTIONS) {
    const kp1 = keypoints[i1]
    const kp2 = keypoints[i2]
    if (!visible(kp1) || !visible(kp2)) continue
    ctx.beginPath()
    ctx.moveTo(kp1.x, kp1.y)
    ctx.lineTo(kp2.x, kp2.y)
    ctx.stroke()
  }

  for (const kp of keypoints) {
    if (!visible(kp)) continue
    ctx.beginPath()
    ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI)
    ctx.fillStyle = goalReached ? '#ffffff' : formOk ? '#ffd447' : '#ff2a2a'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#183d59'
    ctx.stroke()
  }
}

function visible(kp: KeyPoint | undefined): kp is KeyPoint {
  return !!kp && (kp.score ?? 0) >= DRAW_VISIBILITY_MIN
}

function phaseLabel(phase: CyclePhase, mode: ExerciseTrackingMode): string {
  if (mode === 'bicep_curl') {
    switch (phase) {
      case 'ready':
        return 'Arms extended'
      case 'to_end':
        return 'Curling'
      case 'at_end':
        return 'Top reached'
      case 'to_start':
        return 'Lowering'
      default:
        return 'Waiting for start'
    }
  }
  if (mode === 'jumping_jack') {
    switch (phase) {
      case 'ready':
        return 'Closed stance'
      case 'to_end':
        return 'Opening'
      case 'at_end':
        return 'Open position'
      case 'to_start':
        return 'Closing'
      default:
        return 'Waiting for start'
    }
  }
  switch (phase) {
    case 'ready':
      return 'Ready'
    case 'to_end':
      return 'Descending'
    case 'at_end':
      return 'Depth reached'
    case 'to_start':
      return 'Ascending'
    case 'completed':
      return 'Rep completed'
    default:
      return 'Waiting for start'
  }
}

function trackingLabel(status: TrackingStatus, paused: boolean): string {
  if (paused) return 'Counting paused'
  switch (status) {
    case 'tracking':
      return 'Tracking'
    case 'ready':
      return 'Ready'
    case 'framing':
      return 'Fix framing'
    case 'unreliable':
      return 'Unreliable pose'
    case 'paused':
      return 'Counting paused'
    default:
      return 'Searching'
  }
}

function statusChipCopy(input: {
  isGoalReached: boolean
  analysisPaused: boolean
  trackingStatus: TrackingStatus
  movementPhase: CyclePhase
  autoRepCountEnabled: boolean
  trackingMode: ExerciseTrackingMode
}): { tone: 'goal' | 'good' | 'warning' | 'paused'; label: string } {
  if (input.isGoalReached) return { tone: 'goal', label: 'GOAL COMPLETED' }
  if (input.analysisPaused) return { tone: 'paused', label: 'COUNTING PAUSED' }
  if (!input.autoRepCountEnabled) {
    return { tone: 'good', label: 'POSE OVERLAY · MANUAL COUNT' }
  }
  if (input.trackingStatus === 'framing' || input.trackingStatus === 'unreliable') {
    return { tone: 'warning', label: trackingLabel(input.trackingStatus, false).toUpperCase() }
  }
  if (input.trackingStatus === 'searching' || input.trackingStatus === 'paused') {
    return { tone: 'paused', label: trackingLabel(input.trackingStatus, false).toUpperCase() }
  }
  return {
    tone: 'good',
    label: `${phaseLabel(input.movementPhase, input.trackingMode).toUpperCase()}`,
  }
}
