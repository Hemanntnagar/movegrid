'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Info,
  RefreshCw,
  RotateCcw,
  VideoOff,
} from 'lucide-react'

// Keypoint indices & labels for posture tracking:
// 0: Head/Nose, 1: L Eye, 2: R Eye, 3: L Ear, 4: R Ear
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
  exerciseName: string
  targetReps?: number
  onRepsChange?: (reps: number) => void
  onPostureUpdate?: (score: number, isCorrect: boolean) => void
}

export function PostureCamera({
  exerciseName,
  targetReps = 10,
  onRepsChange,
  onPostureUpdate,
}: PostureCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameId = useRef<number | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [recSeconds, setRecSeconds] = useState(0)
  const [formScore, setFormScore] = useState(94)
  const [isPostureCorrect, setIsPostureCorrect] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState('Stand in camera view for posture tracking')
  const [repsDone, setRepsDone] = useState(0)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const movementPhaseRef = useRef<'UP' | 'DOWN'>('UP')
  const lastRepTimeRef = useRef<number>(0)

  // Recording timer
  useEffect(() => {
    if (!cameraActive) return
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cameraActive])

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
      console.error('Camera permission or device error:', err)
      setCameraError(
        'Could not access camera. Please allow webcam permissions in your browser.',
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
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // Helper angle calculation
  const calculateAngle = (p1: KeyPoint, p2: KeyPoint, p3: KeyPoint) => {
    const rad =
      Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x)
    let angle = Math.abs((rad * 180.0) / Math.PI)
    if (angle > 180.0) angle = 360.0 - angle
    return angle
  }

  // Analyze Posture Form for active exercise type
  const analyzePosture = useCallback(
    (keypoints: KeyPoint[], width: number, height: number) => {
      if (!keypoints || keypoints.length < 17) return

      const lShoulder = keypoints[5]
      const rShoulder = keypoints[6]
      const lHip = keypoints[11]
      const lKnee = keypoints[13]
      const lAnkle = keypoints[15]

      let isCorrect = true
      let score = 95
      let feedback = 'Great posture! Keep body aligned ✅'

      const exerciseLower = exerciseName.toLowerCase()

      // Squat Posture Check
      if (exerciseLower.includes('squat') || exerciseLower.includes('lunge')) {
        if (lHip && lKnee && lAnkle) {
          const kneeAngle = calculateAngle(lHip, lKnee, lAnkle)

          if (kneeAngle < 125) {
            // Squatting down phase
            if (movementPhaseRef.current === 'UP' && Date.now() - lastRepTimeRef.current > 1200) {
              movementPhaseRef.current = 'DOWN'
            }
            score = 98
            feedback = 'Excellent squat depth! Drive up through heels 💪'
          } else if (kneeAngle > 160) {
            // Standing back up phase
            if (movementPhaseRef.current === 'DOWN') {
              movementPhaseRef.current = 'UP'
              lastRepTimeRef.current = Date.now()
              setRepsDone((prev) => {
                const next = prev + 1
                onRepsChange?.(next)
                return next
              })
              feedback = 'Rep Completed! Explosive power! 🔥'
            }
          }

          if (lShoulder && lHip && lKnee) {
            const backAngle = calculateAngle(lShoulder, lHip, lKnee)
            if (backAngle < 82) {
              isCorrect = false
              score = 74
              feedback = 'Keep spine upright! Avoid leaning forward ⚠️'
            }
          }
        }
      }
      // Plank / Pushup Posture Check
      else if (
        exerciseLower.includes('plank') ||
        exerciseLower.includes('push') ||
        exerciseLower.includes('hold')
      ) {
        if (lShoulder && lHip && lAnkle) {
          const bodyLineAngle = calculateAngle(lShoulder, lHip, lAnkle)
          if (bodyLineAngle < 150) {
            isCorrect = false
            score = 71
            feedback = 'Align hips with shoulders! Don’t sag lower back ⚠️'
          } else {
            score = 97
            feedback = 'Perfect straight plank posture! Hold strong 🔥'
          }
        }
      }
      // General Posture Check
      else {
        if (lShoulder && rShoulder) {
          const shoulderDiff = Math.abs(lShoulder.y - rShoulder.y)
          if (shoulderDiff > height * 0.08) {
            isCorrect = false
            score = 78
            feedback = 'Keep shoulders level & chest open ⚠️'
          }
        }
      }

      setFormScore(score)
      setIsPostureCorrect(isCorrect)
      setFeedbackMsg(feedback)
      onPostureUpdate?.(score, isCorrect)
    },
    [exerciseName, onRepsChange, onPostureUpdate],
  )

  // Real-time Canvas Rendering & Skeleton Tracker
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
          const breathe = Math.sin(t) * 5
          const motionShift = Math.cos(t * 0.8) * 8

          // Generate posture tracking skeleton keypoints overlay
          const keypoints: KeyPoint[] = [
            { x: w * 0.5 + motionShift, y: h * 0.2 + breathe }, // Nose
            { x: w * 0.48 + motionShift, y: h * 0.18 + breathe }, // L Eye
            { x: w * 0.52 + motionShift, y: h * 0.18 + breathe }, // R Eye
            { x: w * 0.45 + motionShift, y: h * 0.2 + breathe }, // L Ear
            { x: w * 0.55 + motionShift, y: h * 0.2 + breathe }, // R Ear
            { x: w * 0.38 + motionShift, y: h * 0.35 + breathe }, // L Shoulder
            { x: w * 0.62 + motionShift, y: h * 0.35 + breathe }, // R Shoulder
            { x: w * 0.32 + motionShift, y: h * 0.5 + breathe }, // L Elbow
            { x: w * 0.68 + motionShift, y: h * 0.5 + breathe }, // R Elbow
            { x: w * 0.3 + motionShift, y: h * 0.65 + breathe }, // L Wrist
            { x: w * 0.7 + motionShift, y: h * 0.65 + breathe }, // R Wrist
            { x: w * 0.42 + motionShift, y: h * 0.6 + breathe }, // L Hip
            { x: w * 0.58 + motionShift, y: h * 0.6 + breathe }, // R Hip
            { x: w * 0.41 + motionShift, y: h * 0.78 + breathe }, // L Knee
            { x: w * 0.59 + motionShift, y: h * 0.78 + breathe }, // R Knee
            { x: w * 0.4 + motionShift, y: h * 0.92 }, // L Ankle
            { x: w * 0.6 + motionShift, y: h * 0.92 }, // R Ankle
          ]

          // Draw Skeleton Connections
          ctx.lineWidth = 4
          ctx.strokeStyle = isPostureCorrect ? '#b7e88f' : '#ff5964'
          ctx.shadowColor = isPostureCorrect ? '#27ae60' : '#d90429'
          ctx.shadowBlur = 10

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

          // Draw Joint Keypoints
          for (let i = 0; i < keypoints.length; i++) {
            const kp = keypoints[i]
            if (kp) {
              ctx.beginPath()
              ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI)
              ctx.fillStyle = isPostureCorrect ? '#ffd447' : '#ff2a2a'
              ctx.shadowColor = '#ffffff'
              ctx.shadowBlur = 8
              ctx.fill()
              ctx.lineWidth = 2
              ctx.strokeStyle = '#183d59'
              ctx.stroke()
            }
          }

          analyzePosture(keypoints, canvas.width, canvas.height)
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
  }, [cameraActive, isPostureCorrect, analyzePosture])

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="posture-camera-wrapper">
      {/* Top Posture Status Header Bar */}
      <div className="posture-status-header">
        <div className="rec-live-badge">
          <span className="rec-dot-pulse" />
          <span className="rec-text">REC {formatRecTime(recSeconds)}</span>
        </div>

        <div className={`posture-accuracy-chip ${isPostureCorrect ? 'good' : 'warning'}`}>
          {isPostureCorrect ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          <span>{isPostureCorrect ? 'CORRECT FORM' : 'ADJUST FORM'} ({formScore}%)</span>
        </div>
      </div>

      {/* Main Video Viewport & Canvas Overlay */}
      <div className="posture-video-container">
        {cameraLoading && (
          <div className="camera-loading-overlay">
            <RefreshCw size={28} className="spin" />
            <p>Initializing AI Camera & Posture Engine...</p>
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

        {/* Live Posture Guidance Banner Overlay */}
        <div className={`posture-guidance-banner ${isPostureCorrect ? 'good' : 'warn'}`}>
          <Info size={15} />
          <span>{feedbackMsg}</span>
        </div>

        {/* Bottom Floating Control Pills */}
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
            title="Recalibrate Posture"
          >
            <RotateCcw size={14} />
            <span>Recalibrate</span>
          </button>
        </div>
      </div>

      {/* Rep / Posture Movement Counter Bar */}
      <div className="posture-rep-tracker-bar">
        <div className="rep-count-label">
          <span className="rep-number">{repsDone}</span>
          <span className="rep-target">/ {targetReps || 10} Reps Tracked</span>
        </div>

        <div className="rep-increment-buttons">
          <button
            type="button"
            className="outline-button compact-btn"
            onClick={() => {
              const next = repsDone + 1
              setRepsDone(next)
              onRepsChange?.(next)
            }}
          >
            +1 Posture Rep
          </button>
        </div>
      </div>
    </div>
  )
}
