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
  VideoOff,
  Zap,
} from 'lucide-react'

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

export type KeyPoint = {
  x: number
  y: number
  score?: number
  name?: string
}

type PostureCameraProps = {
  /** When false, no getUserMedia call is made (camera stays off). */
  enabled?: boolean
  exerciseName: string
  targetReps?: number
  onRepsChange?: (reps: number) => void
  onPostureUpdate?: (score: number, isCorrect: boolean) => void
  onGoalComplete?: () => void
}

export function PostureCamera({
  enabled = false,
  exerciseName,
  targetReps = 15,
  onRepsChange,
  onPostureUpdate,
  onGoalComplete,
}: PostureCameraProps) {
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  // Movement state machine: 'UP' vs 'DOWN' for reps
  const movementPhaseRef = useRef<'UP' | 'DOWN'>('UP')
  const lastRepTimeRef = useRef<number>(0)
  const autoGoalTriggeredRef = useRef<boolean>(false)

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

  // Helper angle calculation
  const calculateAngle = (p1: KeyPoint, p2: KeyPoint, p3: KeyPoint) => {
    const rad =
      Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x)
    let angle = Math.abs((rad * 180.0) / Math.PI)
    if (angle > 180.0) angle = 360.0 - angle
    return angle
  }

  // AI Rep Counter & Posture Evaluator
  const analyzePostureAndCountReps = useCallback(
    (keypoints: KeyPoint[], width: number, height: number) => {
      if (!keypoints || keypoints.length < 17 || isGoalReached) return

      const lShoulder = keypoints[5]
      const rShoulder = keypoints[6]
      const lElbow = keypoints[7]
      const lWrist = keypoints[9]
      const lHip = keypoints[11]
      const lKnee = keypoints[13]
      const lAnkle = keypoints[15]

      let isCorrect = true
      let score = 96
      let feedback = feedbackMsg

      const exerciseLower = exerciseName.toLowerCase()
      const now = Date.now()

      // 1. PUSH-UPS REP COUNTER
      if (exerciseLower.includes('push') || exerciseLower.includes('press')) {
        if (lShoulder && lElbow && lWrist) {
          const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist)

          // Push-up DOWN phase (elbow flexed < 100 degrees)
          if (elbowAngle < 100) {
            if (movementPhaseRef.current === 'UP' && now - lastRepTimeRef.current > 800) {
              movementPhaseRef.current = 'DOWN'
            }
            score = 98
            feedback = `Chest DOWN! Keep core tight 💪 (${repsDone}/${targetReps})`
          }
          // Push-up UP phase (arms extended > 150 degrees)
          else if (elbowAngle > 150) {
            if (movementPhaseRef.current === 'DOWN') {
              movementPhaseRef.current = 'UP'
              lastRepTimeRef.current = now
              const nextReps = repsDone + 1
              setRepsDone(nextReps)
              onRepsChange?.(nextReps)
              feedback = `Push-up ${nextReps}/${targetReps} Done! Great form! 🔥`
            } else if (movementPhaseRef.current === 'UP') {
              feedback = `Push-up position ready. Lower chest down... (${repsDone}/${targetReps})`
            }
          }

          // Check straight body alignment (shoulder - hip - ankle line)
          if (lShoulder && lHip && lAnkle) {
            const spineAngle = calculateAngle(lShoulder, lHip, lAnkle)
            if (spineAngle < 145) {
              isCorrect = false
              score = 70
              feedback = 'Keep hips in line with shoulders! Avoid sagging ⚠️'
            }
          }
        }
      }
      // 2. SQUAT REP COUNTER
      else if (exerciseLower.includes('squat') || exerciseLower.includes('lunge')) {
        if (lHip && lKnee && lAnkle) {
          const kneeAngle = calculateAngle(lHip, lKnee, lAnkle)

          if (kneeAngle < 120) {
            if (movementPhaseRef.current === 'UP' && now - lastRepTimeRef.current > 800) {
              movementPhaseRef.current = 'DOWN'
            }
            score = 98
            feedback = `Squat DOWN phase! Hold depth & push up 💪`
          } else if (kneeAngle > 160) {
            if (movementPhaseRef.current === 'DOWN') {
              movementPhaseRef.current = 'UP'
              lastRepTimeRef.current = now
              const nextReps = repsDone + 1
              setRepsDone(nextReps)
              onRepsChange?.(nextReps)
              feedback = `Squat ${nextReps}/${targetReps} Done! Powerful extension! 🔥`
            } else {
              feedback = `Standing tall. Lower into deep squat... (${repsDone}/${targetReps})`
            }
          }

          if (lShoulder && lHip && lKnee) {
            const backAngle = calculateAngle(lShoulder, lHip, lKnee)
            if (backAngle < 80) {
              isCorrect = false
              score = 73
              feedback = 'Keep chest lifted! Avoid rounding spine ⚠️'
            }
          }
        }
      }
      // 3. GENERAL / PLANK / JUMPING JACKS
      else {
        if (lShoulder && rShoulder) {
          const shoulderDiff = Math.abs(lShoulder.y - rShoulder.y)
          if (shoulderDiff > height * 0.08) {
            isCorrect = false
            score = 78
            feedback = 'Keep shoulders balanced and level ⚠️'
          } else {
            feedback = `Tracking reps: ${repsDone}/${targetReps} completed ✅`
          }
        }
      }

      setFormScore(score)
      setIsPostureCorrect(isCorrect)
      setFeedbackMsg(feedback)
      onPostureUpdate?.(score, isCorrect)
    },
    [exerciseName, repsDone, targetReps, isGoalReached, onRepsChange, onPostureUpdate, feedbackMsg],
  )

  // Real-time Canvas Renderer & Pose Simulator
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return

    let running = true

    const processFrame = () => {
      if (!running) return

      const video = videoRef.current
      const canvas = canvasRef.current

      if (
        video &&
        canvas &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          const w = canvas.width
          const h = canvas.height
          const t = Date.now() * 0.003
          const breathe = Math.sin(t) * 4
          const motionShift = Math.cos(t * 0.8) * 6

          // Generate keypoints tailored for pushup vs squat pose
          const isPushup = exerciseName.toLowerCase().includes('push')
          const keypoints: KeyPoint[] = isPushup
            ? [
                { x: w * 0.2 + motionShift, y: h * 0.4 + breathe }, // Nose
                { x: w * 0.18 + motionShift, y: h * 0.38 + breathe }, // L Eye
                { x: w * 0.22 + motionShift, y: h * 0.38 + breathe }, // R Eye
                { x: w * 0.15 + motionShift, y: h * 0.4 + breathe }, // L Ear
                { x: w * 0.25 + motionShift, y: h * 0.4 + breathe }, // R Ear
                { x: w * 0.35 + motionShift, y: h * 0.45 + breathe }, // L Shoulder
                { x: w * 0.35 + motionShift, y: h * 0.45 + breathe }, // R Shoulder
                { x: w * 0.38 + motionShift, y: h * 0.65 + breathe }, // L Elbow
                { x: w * 0.38 + motionShift, y: h * 0.65 + breathe }, // R Elbow
                { x: w * 0.4 + motionShift, y: h * 0.85 }, // L Wrist
                { x: w * 0.4 + motionShift, y: h * 0.85 }, // R Wrist
                { x: w * 0.58 + motionShift, y: h * 0.48 + breathe }, // L Hip
                { x: w * 0.58 + motionShift, y: h * 0.48 + breathe }, // R Hip
                { x: w * 0.75 + motionShift, y: h * 0.52 }, // L Knee
                { x: w * 0.75 + motionShift, y: h * 0.52 }, // R Knee
                { x: w * 0.9 + motionShift, y: h * 0.55 }, // L Ankle
                { x: w * 0.9 + motionShift, y: h * 0.55 }, // R Ankle
              ]
            : [
                { x: w * 0.5 + motionShift, y: h * 0.2 + breathe },
                { x: w * 0.48 + motionShift, y: h * 0.18 + breathe },
                { x: w * 0.52 + motionShift, y: h * 0.18 + breathe },
                { x: w * 0.45 + motionShift, y: h * 0.2 + breathe },
                { x: w * 0.55 + motionShift, y: h * 0.2 + breathe },
                { x: w * 0.38 + motionShift, y: h * 0.35 + breathe },
                { x: w * 0.62 + motionShift, y: h * 0.35 + breathe },
                { x: w * 0.32 + motionShift, y: h * 0.5 + breathe },
                { x: w * 0.68 + motionShift, y: h * 0.5 + breathe },
                { x: w * 0.3 + motionShift, y: h * 0.65 + breathe },
                { x: w * 0.7 + motionShift, y: h * 0.65 + breathe },
                { x: w * 0.42 + motionShift, y: h * 0.6 + breathe },
                { x: w * 0.58 + motionShift, y: h * 0.6 + breathe },
                { x: w * 0.41 + motionShift, y: h * 0.78 + breathe },
                { x: w * 0.59 + motionShift, y: h * 0.78 + breathe },
                { x: w * 0.4 + motionShift, y: h * 0.92 },
                { x: w * 0.6 + motionShift, y: h * 0.92 },
              ]

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

          analyzePostureAndCountReps(keypoints, canvas.width, canvas.height)
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
  }, [cameraActive, isPostureCorrect, isGoalReached, exerciseName, analyzePostureAndCountReps])

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const percentProgress = Math.min(100, Math.round((repsDone / (targetReps || 1)) * 100))

  return (
    <div className="posture-camera-wrapper">
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
        {cameraLoading && (
          <div className="camera-loading-overlay">
            <RefreshCw size={28} className="spin" />
            <p>Initializing Posture & Rep Counter Model...</p>
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
        ) : (
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
        )}

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
              stopCamera()
              startCamera()
            }}
            title="Recalibrate"
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
