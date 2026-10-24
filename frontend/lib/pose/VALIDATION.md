# Live exercise counting — validation report

Measured on 24 Oct 2026 against the synthetic landmark replay harness in this repository.

## 1. Root cause of false repetitions

The previous camera pipeline treated almost any joint-angle flicker as a repetition.

1. A generic `UP → DOWN → UP` trigger used one knee or elbow angle. Any movement that crossed two loose thresholds counted.
2. Unrelated exercises were aliased onto squat/push-up logic (curls, rows, deadlifts, calf raises, hip thrusts).
3. `analyzePostureAndCountReps` ran on every animation frame, including skipped-inference frames, so `MIN_PHASE_FRAMES` advanced on stale keypoints.
4. The `requestAnimationFrame` effect depended on `isPostureCorrect` and `isGoalReached`, so the loop restarted on every form update.
5. Jumping jacks used ankle spread only: no arm check, no dwell time, no cooldown, no visibility gate.
6. Squat depth was `knee < 105°` with no hip-flexion or hip-drop requirement.
7. Landmark loss did not pause counting; the last skeleton kept driving the state machine.
8. The UI showed an invented 95% “form accuracy” number.

## 2. Architecture

Pose estimation and repetition validation are now separate.

| Layer | Role |
| --- | --- |
| `poseLandmarker.ts` | MediaPipe Pose Landmarker, one person, VIDEO mode. Lite on mobile / low-core devices, full otherwise. |
| `LandmarkSmoother` | Timestamp-aware exponential smoothing. |
| `assessFraming` | Visibility, in-frame, distance, lighting, side-view prompts. |
| Exercise analyzers | Finite-state machines with hysteresis, dwell time, min/max duration, cooldown. |
| `RepCounter` | Duplicate-event guard. Count is preserved across tracking gaps. |
| `replayLandmarkSequence` | Camera-free replay of timestamped landmark clips. |

Supported auto-count modes: squat, push-up (floor or wall), biceps curl, jumping jack, lunge, mountain climber, burpee. Other catalog moves keep the pose overlay and require manual `+1`.

MediaPipe inference stays on the main thread with backpressure (`video.currentTime` + busy flag). VIDEO mode needs the `HTMLVideoElement`, so a worker is not used.

## 3. Tests that actually ran

```
pnpm --dir frontend test
```

Result: **6 files, 45 tests, all passed.**

Covered scenarios:

1. Complete valid repetition
2. Incomplete / shallow repetition
3. Unrelated movement (arm wave, squat fed to curl/jack, curl fed to push-up)
4. Partial movement then reset
5. Rapid jitter
6. Temporary landmark loss
7. Leave and re-enter frame, then a full rep
8. Hold at the finish without extra increments
9. Repeated timestamps / duplicate events
10. Different body scales (camera distance)

## 4. Synthetic validation set

Accuracy for clips with at least one ground-truth rep:

`1 - (|predicted - truth| / truth)`

| Clip | Exercise | Truth | Predicted | FP | Miss | Accuracy |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| squat-complete-1 | squat | 1 | 1 | 0 | 0 | 1.00 |
| squat-complete-2 | squat | 2 | 2 | 0 | 0 | 1.00 |
| squat-complete-small | squat | 1 | 1 | 0 | 0 | 1.00 |
| squat-complete-large | squat | 1 | 1 | 0 | 0 | 1.00 |
| squat-hold-top | squat | 1 | 1 | 0 | 0 | 1.00 |
| squat-jittered-valid | squat | 1 | 1 | 0 | 0 | 1.00 |
| pushup-complete-2 | pushup | 2 | 2 | 0 | 0 | 1.00 |
| curl-complete-2 | bicep_curl | 2 | 2 | 0 | 0 | 1.00 |
| jack-complete-2 | jumping_jack | 2 | 2 | 0 | 0 | 1.00 |
| squat-incomplete | squat | 0 | 0 | 0 | — | n/a |
| squat-random | squat | 0 | 0 | 0 | — | n/a |
| squat-jitter | squat | 0 | 0 | 0 | — | n/a |
| pushup-false-curl | pushup | 0 | 0 | 0 | — | n/a |
| curl-not-squat | bicep_curl | 0 | 0 | 0 | — | n/a |
| jack-not-squat | jumping_jack | 0 | 0 | 0 | — | n/a |

Totals on clips with ≥1 ground-truth rep: 13 predicted / 13 truth, **0 false positives, 0 misses, accuracy 1.00**.

Zero-rep clips: **0 false positives**.

These clips are kinematic landmark sequences, not labeled camera video. The 95% live-video target is **not claimed**.

To add labeled video later, export MediaPipe landmarks to `AnnotatedClip` JSON (`id`, `exercise`, `groundTruthReps`, `frames[]`) and pass them through `evaluateClips()`.

## 5. How to run

```bash
pnpm install
pnpm --dir frontend test
pnpm dev
```

Open a live camera session from today’s workout. Grant camera permission. Auto-count starts only after the required starting position is held.

## 6. Known limitations

- No annotated webcam dataset is in the repo, so live-video false-positive/miss rates are unmeasured.
- Unsupported views: top-down, extreme close-up, seated-only, multi-person, heavy occlusion.
- Push-ups need a recognizable plank (or a wall-push variant). Standing punches do not count.
- Jumping jacks need **both** wide feet and both arms overhead.
- Squats need hip drop plus knee and hip flexion. A shallow knee bend does not count.
- Pike push-ups, rows, deadlifts, presses, and similar lifts are overlay-only (`manual`).
- Burpees require stand → squat → plank → stand. A squat or a push-up alone does not count.
- Front-facing push-ups can under-count if elbows are foreshortened.
- Selfie preview is mirrored; rear camera is not. Landmark left/right stay anatomical.
- Inference is main-thread with frame skipping. Slow devices drop frames rather than overlapping jobs.
- Manual `+1` remains available. It is an explicit user override, not a model guess.
