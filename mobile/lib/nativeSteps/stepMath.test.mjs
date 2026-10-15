/**
 * Edge-case tests for step reconciliation (mirrors stepMath.ts).
 * Run: node lib/nativeSteps/stepMath.test.mjs
 */
import assert from 'node:assert/strict'

function emptySnapshot(dateKey) {
  return { dateKey, steps: 0, sessionBase: 0, lastWatchSteps: 0 }
}

function clampSteps(n) {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(Math.floor(n), 999_999)
}

function ensureDate(snapshot, dateKey) {
  if (snapshot.dateKey === dateKey) return snapshot
  return emptySnapshot(dateKey)
}

function applyDayQuery(snapshot, dateKey, queriedSteps) {
  const base = ensureDate(snapshot, dateKey)
  const safe = clampSteps(queriedSteps)
  return { ...base, steps: Math.max(base.steps, safe) }
}

function applyWatchUpdate(snapshot, dateKey, watchSteps) {
  let next = ensureDate(snapshot, dateKey)
  const safeWatch = clampSteps(watchSteps)
  if (safeWatch < next.lastWatchSteps) {
    next = { ...next, sessionBase: next.steps, lastWatchSteps: 0 }
  }
  const candidate = next.sessionBase + safeWatch
  return {
    ...next,
    lastWatchSteps: safeWatch,
    steps: Math.max(next.steps, clampSteps(candidate)),
  }
}

function beginWatchSession(snapshot, dateKey) {
  const base = ensureDate(snapshot, dateKey)
  return { ...base, sessionBase: base.steps, lastWatchSteps: 0 }
}

{
  const rolled = ensureDate(
    { dateKey: '2026-10-15', steps: 8000, sessionBase: 7000, lastWatchSteps: 100 },
    '2026-10-16',
  )
  assert.equal(rolled.steps, 0)
  assert.equal(rolled.dateKey, '2026-10-16')
}

{
  let s = emptySnapshot('2026-10-16')
  s = applyWatchUpdate(s, '2026-10-16', 120)
  s = applyDayQuery(s, '2026-10-16', 50)
  assert.equal(s.steps, 120)
  s = applyDayQuery(s, '2026-10-16', 500)
  assert.equal(s.steps, 500)
}

{
  let s = beginWatchSession(emptySnapshot('2026-10-16'), '2026-10-16')
  s = applyWatchUpdate(s, '2026-10-16', 200)
  s = applyDayQuery(s, '2026-10-16', 200)
  assert.equal(s.steps, 200)
  s = applyWatchUpdate(s, '2026-10-16', 210)
  assert.equal(s.steps, 210)
}

{
  let s = applyDayQuery(emptySnapshot('2026-10-16'), '2026-10-16', 3000)
  s = beginWatchSession(s, '2026-10-16')
  s = applyWatchUpdate(s, '2026-10-16', 40)
  assert.equal(s.steps, 3040)
}

{
  let s = beginWatchSession(
    applyDayQuery(emptySnapshot('2026-10-16'), '2026-10-16', 1000),
    '2026-10-16',
  )
  s = applyWatchUpdate(s, '2026-10-16', 500)
  assert.equal(s.steps, 1500)
  s = applyWatchUpdate(s, '2026-10-16', 3)
  assert.equal(s.sessionBase, 1500)
  assert.equal(s.steps, 1503)
}

{
  let s = applyWatchUpdate(emptySnapshot('2026-10-15'), '2026-10-15', 9000)
  s = applyWatchUpdate(s, '2026-10-16', 20)
  assert.equal(s.dateKey, '2026-10-16')
  assert.equal(s.steps, 20)
}

console.log('stepMath tests: all passed')
