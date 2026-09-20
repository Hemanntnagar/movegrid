'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Check,
  Flame,
  Info,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  Maximize2,
  Minimize2,
  VideoOff,
  Zap,
} from 'lucide-react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { ApiExercise } from '../lib/api'
import type { KeyPoint } from '../lib/poseLandmarker'
import { getPoseLandmarker, landmarksToKeypoints } from '../lib/poseLandmarker'
import {
  type ExerciseTrackingMode,
  repCounterLabel,
  resolveTrackingMode,
  usesPoseRepCounter,
} from '../lib/exerciseTracking'

export type { KeyPoint } from '../lib/poseLandmarker'

// Keypoint indices:
// 0: Nose, 1: L Eye, 2: R Eye, 3: L Ear, 4: R Ear
// 5: L Shoulder, 6: R Shoulder, 7: L Elbow, 8: R Elbow, 9: L Wrist, 10: R Wrist
// 11: L Hip, 12: R Hip, 13: L Knee, 14: R Knee, 15: L Ankle, 16: R Ankle
const SKELETON_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 6], [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
]

const VISIBILITY_MIN = 0.4
const EMA_ALPHA = 0.32
const MIN_PHASE_FRAMES = 5
const MIN_REP_MS = 900
const POSE_FRAME_SKIP = 2
const PUSH_DOWN_DEG = 100
const PUSH_UP_DEG = 145
const SQUAT_DOWN_DEG = 105
const SQUAT_UP_DEG = 150

function landmarkVisible(kp: KeyPoint | undefined): kp is KeyPoint {
  return !!kp && (kp.score ?? 0) >= VISIBILITY_MIN
}

function calculateAngle(p1: KeyPoint, p2: KeyPoint, p3: KeyPoint) {
  const rad =
    Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x)
  let angle = Math.abs((rad * 180.0) / Math.PI)
  if (angle > 180.0) angle = 360.0 - angle
  return angle
}

function jointAngle(keypoints: KeyPoint[], a: number, b: number, c: number): number | null {
  const p1 = keypoints[a]
  const p2 = keypoints[b]
  const p3 = keypoints[c]
  if (!landmarkVisible(p1) || !landmarkVisible(p2) || !landmarkVisible(p3)) return null
  return calculateAngle(p1, p2, p3)
}

function averageVisibleAngle(left: number | null, right: number | null): number | null {
  if (left !== null && right !== null) return (left + right) / 2
  return left ?? right ?? null
}

type PostureCameraProps = {
  /** When false, no getUserMedia call is made (camera stays off). */
  enabled?: boolean
  /** Scheduled exercise from daily assignment (drives rep counter mode). */
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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameId = useRef<number | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [recSeconds, setRecSeconds] = useState(0)
  const [formScore, setFormScore] = useState(95)
  const [isPostureCorrect, setIsPostureCorrect] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState('Get into position to start counting reps')
  const [repsDone, setRepsDone] = useState(0)
  const [isGoalReached, setIsGoalReached] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isEnlarged, setIsEnlarged] = useState(false)
  const [poseModelLoading, setPoseModelLoading] = useState(false)
  const [poseModelReady, setPoseModelReady] = useState(false)
  const [poseModelError, setPoseModelError] = useState<string | null>(null)

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const lastKeypointsRef = useRef<KeyPoint[] | null>(null)
  const poseFrameCounterRef = useRef(0)
  const poseSkipRef = useRef(POSE_FRAME_SKIP)
  const lastVideoTimestampRef = useRef(-1)
  const repsDoneRef = useRef(0)
  const smoothedAngleRef = useRef<number | null>(null)
  const downConfirmRef = useRef(0)
  const upConfirmRef = useRef(0)
  const isGoalReachedRef = useRef(false)

  // Movement state machine: 'UP' vs 'DOWN' for reps
  const movementPhaseRef = useRef<'UP' | 'DOWN'>('UP')
  const lastRepTimeRef = useRef<number>(0)
  const autoGoalTriggeredRef = useRef<boolean>(false)

  useEffect(() => {
    repsDoneRef.current = repsDone
  }, [repsDone])

  useEffect(() => {
    isGoalReachedRef.current = isGoalReached
  }, [isGoalReached])

  const resetRepTracking = useCallback(() => {
    movementPhaseRef.current = 'UP'
    lastRepTimeRef.current = 0
    smoothedAngleRef.current = null
    downConfirmRef.current = 0
    upConfirmRef.current = 0
    lastKeypointsRef.current = null
    lastVideoTimestampRef.current = -1
    jackPhaseRef.current = 'NARROW'
  }, [])

  useEffect(() => {
    if (!enabled) {
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
  }, [enabled])

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

  // Recording timer
  useEffect(() => {
    if (!cameraActive || isGoalReached) return
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cameraActive, isGoalReached])

  // Check goal completion
  useEffect(() => {
    if (repsDone >= targetReps && targetReps > 0 && !autoGoalTriggeredRef.current) {
      autoGoalTriggeredRef.current = true
      setIsGoalReached(true)
      setFeedbackMsg(`🎉 GOAL COMPLETED! ${repsDone}/${targetReps} Reps Done!`)
      onGoalComplete?.()
    }
  }, [repsDone, targetReps, onGoalComplete])

  // Start WebRTC Camera
  const startCamera = useCallback(async () => {
    setCameraLoading(true)
    setCameraError(null)

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setCameraActive(true)
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

  // Stop WebRTC Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopCamera()
      setCameraLoading(false)
      setCameraError(null)
      return
    }
    startCamera()
    return () => stopCamera()
  }, [enabled, facingMode, startCamera, stopCamera])

  const exerciseNameRef = useRef(exerciseName)
  const trackingModeRef = useRef<ExerciseTrackingMode>(trackingMode)
  const assignmentIdRef = useRef(assignmentId)
  const scheduledExerciseRef = useRef(scheduledExercise)
  const targetRepsRef = useRef(targetReps)
  const autoRepCountRef = useRef(autoRepCountEnabled)
  const jackPhaseRef = useRef<'NARROW' | 'WIDE'>('NARROW')
  const onRepsChangeRef = useRef(onRepsChange)
  const onPostureUpdateRef = useRef(onPostureUpdate)

  useEffect(() => {
    exerciseNameRef.current = exerciseName
    trackingModeRef.current = trackingMode
    assignmentIdRef.current = assignmentId
    scheduledExerciseRef.current = scheduledExercise
    targetRepsRef.current = targetReps
    autoRepCountRef.current = autoRepCountEnabled
    jackPhaseRef.current = 'NARROW'
  }, [exerciseName, trackingMode, assignmentId, scheduledExercise, targetReps, autoRepCountEnabled])

  useEffect(() => {
    onRepsChangeRef.current = onRepsChange
    onPostureUpdateRef.current = onPostureUpdate
  }, [onRepsChange, onPostureUpdate])

  useEffect(() => {
    resetRepTracking()
  }, [assignmentId, scheduledExercise.id, resetRepTracking])

  const applyRepPhase = useCallback(
    (
      angle: number,
      downDeg: number,
      upDeg: number,
      repsLabel: string,
      downFeedback: string,
      upFeedback: string,
    ) => {
      const now = Date.now()
      const reps = repsDoneRef.current
      const target = targetRepsRef.current
      let feedback = `Tracking ${reps}/${target} reps — keep full body in frame`

      if (angle < downDeg) {
        downConfirmRef.current += 1
        upConfirmRef.current = 0
        if (
          movementPhaseRef.current === 'UP' &&
          downConfirmRef.current >= MIN_PHASE_FRAMES &&
          now - lastRepTimeRef.current > MIN_REP_MS
        ) {
          movementPhaseRef.current = 'DOWN'
        }
        feedback = `${downFeedback} (${reps}/${target})`
      } else if (angle > upDeg) {
        upConfirmRef.current += 1
        downConfirmRef.current = 0
        if (movementPhaseRef.current === 'DOWN' && upConfirmRef.current >= MIN_PHASE_FRAMES) {
          movementPhaseRef.current = 'UP'
          lastRepTimeRef.current = now
          const nextReps = reps + 1
          repsDoneRef.current = nextReps
          setRepsDone(nextReps)
          onRepsChangeRef.current?.(nextReps)
          feedback = `${repsLabel} ${nextReps}/${target} Done! 🔥`
        } else if (movementPhaseRef.current === 'UP') {
          feedback = `${upFeedback} (${reps}/${target})`
        }
      } else {
        downConfirmRef.current = 0
        upConfirmRef.current = 0
      }

      return feedback
    },
    [],
  )

  const analyzePostureAndCountReps = useCallback((keypoints: KeyPoint[], width: number, height: number) => {
    if (!keypoints || keypoints.length < 17 || isGoalReachedRef.current) return

    const lShoulder = keypoints[5]
    const rShoulder = keypoints[6]
    const lHip = keypoints[11]
    const rHip = keypoints[12]
    const lKnee = keypoints[13]
    const rKnee = keypoints[14]
    const lAnkle = keypoints[15]
    const rAnkle = keypoints[16]

    let isCorrect = true
    let score = 96
    let feedback = 'Align your body in frame — side view works best on mobile'

    const mode = trackingModeRef.current
    const reps = repsDoneRef.current
    const target = targetRepsRef.current
    const label = repCounterLabel(mode, exerciseNameRef.current)

    const leftElbow = jointAngle(keypoints, 5, 7, 9)
    const rightElbow = jointAngle(keypoints, 6, 8, 10)
    const elbowAngle = averageVisibleAngle(leftElbow, rightElbow)

    const leftKnee = jointAngle(keypoints, 11, 13, 15)
    const rightKnee = jointAngle(keypoints, 12, 14, 16)
    const kneeAngle = averageVisibleAngle(leftKnee, rightKnee)

    if (!autoRepCountRef.current) {
      if (mode === 'timed') {
        feedback = `Timed session: finish ${scheduledExerciseRef.current.duration_minutes} min, then tap Complete`
      } else if (mode === 'plank_hold') {
        feedback = `Hold ${exerciseNameRef.current} — use +1 or Complete when done`
      } else {
        feedback = `Tracking ${exerciseNameRef.current} — use +1 for reps (${reps}/${target})`
      }
    } else if (mode === 'pushup' || mode === 'burpee') {
      if (elbowAngle === null) {
        feedback = 'Show your arms and torso — step back or use rear camera'
        score = 82
      } else {
        const smoothed =
          smoothedAngleRef.current === null
            ? elbowAngle
            : EMA_ALPHA * elbowAngle + (1 - EMA_ALPHA) * smoothedAngleRef.current
        smoothedAngleRef.current = smoothed
        feedback = applyRepPhase(
          smoothed,
          PUSH_DOWN_DEG,
          PUSH_UP_DEG,
          label,
          'Chest DOWN! Keep core tight 💪',
          'Top position — lower with control',
        )

        const spineLeft = jointAngle(keypoints, 5, 11, 15)
        const spineRight = jointAngle(keypoints, 6, 12, 16)
        const spine = averageVisibleAngle(spineLeft, spineRight)
        if (spine !== null && spine < 145) {
          isCorrect = false
          score = 70
          feedback = 'Keep hips in line with shoulders! Avoid sagging ⚠️'
        }
      }
    } else if (mode === 'squat' || mode === 'lunge' || mode === 'mountain_climber') {
      if (kneeAngle === null) {
        feedback = 'Frame your legs from hip to ankle — rear camera, side view'
        score = 82
      } else {
        const downDeg = mode === 'mountain_climber' ? 115 : SQUAT_DOWN_DEG
        const upDeg = mode === 'mountain_climber' ? 155 : SQUAT_UP_DEG
        const smoothed =
          smoothedAngleRef.current === null
            ? kneeAngle
            : EMA_ALPHA * kneeAngle + (1 - EMA_ALPHA) * smoothedAngleRef.current
        smoothedAngleRef.current = smoothed
        feedback = applyRepPhase(
          smoothed,
          downDeg,
          upDeg,
          label,
          mode === 'mountain_climber' ? 'Drive knee in 💪' : 'Squat DOWN — hold depth 💪',
          mode === 'mountain_climber' ? 'Extend back to plank' : 'Standing tall — lower into squat',
        )

        if (mode !== 'mountain_climber') {
          const backLeft = jointAngle(keypoints, 5, 11, 13)
          const backRight = jointAngle(keypoints, 6, 12, 14)
          const back = averageVisibleAngle(backLeft, backRight)
          if (back !== null && back < 80) {
            isCorrect = false
            score = 73
            feedback = 'Keep chest lifted! Avoid rounding spine ⚠️'
          }
        }
      }
    } else if (mode === 'jumping_jack' && lShoulder && rShoulder && lAnkle && rAnkle) {
      const shoulderWidth = Math.abs(rShoulder.x - lShoulder.x) || width * 0.2
      const ankleSpread = Math.abs(rAnkle.x - lAnkle.x)
      const wide = ankleSpread > shoulderWidth * 1.35
      const narrow = ankleSpread < shoulderWidth * 1.05
      if (wide && jackPhaseRef.current === 'NARROW') {
        jackPhaseRef.current = 'WIDE'
      } else if (narrow && jackPhaseRef.current === 'WIDE') {
        jackPhaseRef.current = 'NARROW'
        const nextReps = reps + 1
        repsDoneRef.current = nextReps
        setRepsDone(nextReps)
        onRepsChangeRef.current?.(nextReps)
        feedback = `${label} ${nextReps}/${target} Done! 🔥`
      } else {
        feedback = wide ? 'Jump feet in to finish rep' : 'Jump feet out and arms up'
      }
    } else if (lShoulder && rShoulder) {
      const shoulderDiff = Math.abs(lShoulder.y - rShoulder.y)
      if (shoulderDiff > height * 0.08) {
        isCorrect = false
        score = 78
        feedback = 'Keep shoulders balanced and level ⚠️'
      } else {
        feedback = `Pose tracked: ${reps}/${target} — use +1 if auto-count misses a rep`
      }
    }

    setFormScore(score)
    setIsPostureCorrect(isCorrect)
    setFeedbackMsg(feedback)
    onPostureUpdateRef.current?.(score, isCorrect)
  }, [applyRepPhase])

  // Real-time pose overlay (MediaPipe Lite)
  useEffect(() => {
    if (!cameraActive || !poseModelReady || !videoRef.current || !canvasRef.current) return

    let running = true

    const processFrame = () => {
      if (!running) return

      if (document.visibilityState === 'hidden') {
        animationFrameId.current = requestAnimationFrame(processFrame)
        return
      }

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

          poseFrameCounterRef.current += 1
          const shouldRunPose = poseFrameCounterRef.current % poseSkipRef.current === 0

          if (shouldRunPose) {
            const inferenceStart = performance.now()
            let timestamp = performance.now()
            if (timestamp <= lastVideoTimestampRef.current) {
              timestamp = lastVideoTimestampRef.current + 1
            }
            lastVideoTimestampRef.current = timestamp

            try {
              const result = landmarker.detectForVideo(video, timestamp)
              const landmarks = result.landmarks[0]
              if (landmarks?.length) {
                lastKeypointsRef.current = landmarksToKeypoints(
                  landmarks,
                  canvas.width,
                  canvas.height,
                )
              }
            } catch (err) {
              console.warn('Pose inference skipped:', err)
            }

            const inferenceMs = performance.now() - inferenceStart
            poseSkipRef.current = inferenceMs > 85 ? 3 : POSE_FRAME_SKIP
          }

          const keypoints = lastKeypointsRef.current

          if (keypoints?.length) {
            analyzePostureAndCountReps(keypoints, canvas.width, canvas.height)

          // Draw Skeleton Lines
          ctx.lineWidth = 4
          ctx.strokeStyle = isGoalReached
            ? '#ffd447'
            : isPostureCorrect
            ? '#b7e88f'
            : '#ff5964'
          ctx.shadowColor = isGoalReached
            ? '#ffb703'
            : isPostureCorrect
            ? '#27ae60'
            : '#d90429'
          ctx.shadowBlur = 12

          for (const [i1, i2] of SKELETON_CONNECTIONS) {
            const kp1 = keypoints[i1]
            const kp2 = keypoints[i2]
            if (kp1 && kp2) {
              ctx.beginPath()
              ctx.moveTo(kp1.x, kp1.y)
              ctx.lineTo(kp2.x, kp2.y)
              ctx.stroke()
            }
          }

          // Draw Keypoint Joint Dots
          for (let i = 0; i < keypoints.length; i++) {
            const kp = keypoints[i]
            if (kp) {
              ctx.beginPath()
              ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI)
              ctx.fillStyle = isGoalReached
                ? '#ffffff'
                : isPostureCorrect
                ? '#ffd447'
                : '#ff2a2a'
              ctx.shadowColor = '#ffffff'
              ctx.shadowBlur = 8
              ctx.fill()
              ctx.lineWidth = 2
              ctx.strokeStyle = '#183d59'
              ctx.stroke()
            }
          }
          } else {
            setFeedbackMsg('No body detected — step back so your full body is visible')
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(processFrame)
    }

    animationFrameId.current = requestAnimationFrame(processFrame)

    return () => {
      running = false
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [cameraActive, poseModelReady, isPostureCorrect, isGoalReached, analyzePostureAndCountReps])

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const percentProgress = Math.min(100, Math.round((repsDone / (targetReps || 1)) * 100))

  return (
    <div className={`posture-camera-wrapper${isEnlarged ? ' is-enlarged' : ''}`}>
      {/* Header Bar */}
      <div className="posture-status-header">
        <div className="rec-live-badge">
          <span className="rec-dot-pulse" />
          <span className="rec-text">REC {formatRecTime(recSeconds)}</span>
        </div>

        <div className={`posture-accuracy-chip ${isGoalReached ? 'goal' : isPostureCorrect ? 'good' : 'warning'}`}>
          {isGoalReached ? (
            <Trophy size={15} />
          ) : isPostureCorrect ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          <span>
            {isGoalReached ? 'GOAL COMPLETED!' : isPostureCorrect ? 'CORRECT FORM' : 'ADJUST FORM'} ({formScore}%)
          </span>
        </div>
      </div>

      {/* Main Video Viewport & Canvas Overlay */}
      <div className="posture-video-container">
        {(cameraLoading || poseModelLoading) && (
          <div className="camera-loading-overlay">
            <RefreshCw size={28} className="spin" />
            <p>
              {poseModelLoading
                ? 'Loading pose model (MediaPipe Lite)…'
                : 'Starting camera…'}
            </p>
          </div>
        )}

        {poseModelError && !cameraError && (
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
        ) : !poseModelError ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="posture-video-feed"
            />
            <canvas ref={canvasRef} className="posture-canvas-overlay" />
          </>
        ) : null}

        {/* Goal Completion Celebration Overlay */}
        {isGoalReached && (
          <div className="goal-complete-overlay">
            <div className="goal-trophy-badge">
              <Trophy size={38} className="bounce" />
            </div>
            <h3>{targetReps} {exerciseName} COMPLETED!</h3>
            <p>Target Goal Achieved with Great Posture! 🎉</p>
          </div>
        )}

        {/* Live Posture Guidance Banner Overlay */}
        {!isGoalReached && cameraActive && poseModelReady && (
          <div className="posture-mobile-tip">
            <Camera size={14} />
            <span>Mobile tip: rear camera, side view, full body in frame</span>
          </div>
        )}

        {!isGoalReached && (
          <div className={`posture-guidance-banner ${isPostureCorrect ? 'good' : 'warn'}`}>
            <Info size={15} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Camera Control Pills */}
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
              resetRepTracking()
              stopCamera()
              startCamera()
            }}
            title="Recalibrate rep counter"
          >
            <RotateCcw size={14} />
            <span>Recalibrate</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="rep-progress-track">
        <div
          className={`rep-progress-fill ${isGoalReached ? 'complete' : ''}`}
          style={{ width: `${percentProgress}%` }}
        />
      </div>

      {/* Rep / Movement Counter Bar */}
      <div className="posture-rep-tracker-bar">
        <div className="rep-count-label">
          <span className="rep-number">{repsDone}</span>
          <span className="rep-target">/ {targetReps} Reps Tracked</span>
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
    </div>
  )
}
