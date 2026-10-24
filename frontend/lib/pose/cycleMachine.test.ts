import { describe, expect, it } from 'vitest'
import { DepthCycleMachine } from './cycleMachine'

function run(
  machine: DepthCycleMachine,
  frames: Array<{ t: number; start?: boolean; end?: boolean; towardEnd?: boolean; towardStart?: boolean }>,
) {
  return frames.map((frame) =>
    machine.update(frame.t, {
      atStart: !!frame.start,
      atEnd: !!frame.end,
      towardEnd: !!frame.towardEnd,
      towardStart: !!frame.towardStart,
      valid: true,
    }),
  )
}

describe('DepthCycleMachine', () => {
  it('counts one complete cycle exactly once', () => {
    const machine = new DepthCycleMachine({
      minStartHoldMs: 150,
      minEndHoldMs: 80,
      minRepMs: 600,
      maxRepMs: 4000,
      cooldownMs: 300,
    })
    const ticks = run(machine, [
      ...range(0, 200, true, false),
      ...range(200, 400, false, false, true, false),
      ...range(400, 520, false, true, true, false),
      ...range(520, 800, false, false, false, true),
      ...range(800, 1000, true, false, false, true),
    ])
    const completions = ticks.filter((tick) => tick.repCompleted)
    expect(completions).toHaveLength(1)
    expect(machine.completedReps).toBe(1)
  })

  it('rejects an incomplete return to start', () => {
    const machine = new DepthCycleMachine({
      minStartHoldMs: 100,
      minEndHoldMs: 80,
      minRepMs: 600,
      maxRepMs: 4000,
      cooldownMs: 200,
    })
    run(machine, [
      ...range(0, 160, true, false),
      ...range(160, 300, false, false, true, false),
      ...range(300, 500, true, false),
    ])
    expect(machine.completedReps).toBe(0)
  })

  it('does not double-count when held at the finish', () => {
    const machine = new DepthCycleMachine({
      minStartHoldMs: 100,
      minEndHoldMs: 80,
      minRepMs: 500,
      maxRepMs: 4000,
      cooldownMs: 200,
    })
    run(machine, [
      ...range(0, 160, true, false),
      ...range(160, 360, false, false, true, false),
      ...range(360, 460, false, true),
      ...range(460, 700, false, false, false, true),
      ...range(700, 1600, true, false),
    ])
    expect(machine.completedReps).toBe(1)
  })

  it('ignores duplicate timestamps', () => {
    const machine = new DepthCycleMachine({
      minStartHoldMs: 100,
      minEndHoldMs: 50,
      minRepMs: 200,
      maxRepMs: 2000,
      cooldownMs: 100,
    })
    machine.update(0, { atStart: true, atEnd: false, towardEnd: false, towardStart: false, valid: true })
    const first = machine.update(150, { atStart: true, atEnd: false, towardEnd: false, towardStart: false, valid: true })
    const dup = machine.update(150, { atStart: true, atEnd: false, towardEnd: false, towardStart: false, valid: true })
    expect(dup).toEqual(first)
  })

  it('abandons an in-progress attempt when pose is unreliable and keeps the count', () => {
    const machine = new DepthCycleMachine({
      minStartHoldMs: 80,
      minEndHoldMs: 50,
      minRepMs: 400,
      maxRepMs: 3000,
      cooldownMs: 100,
    })
    run(machine, [
      ...range(0, 120, true, false),
      ...range(120, 260, false, false, true, false),
    ])
    machine.notifyUnreliable(300)
    expect(machine.completedReps).toBe(0)
    expect(machine.phase).toBe('idle')
  })
})

function range(
  from: number,
  to: number,
  start: boolean,
  end: boolean,
  towardEnd = false,
  towardStart = false,
  step = 40,
) {
  const frames = []
  for (let t = from; t <= to; t += step) {
    frames.push({ t, start, end, towardEnd, towardStart })
  }
  return frames
}
