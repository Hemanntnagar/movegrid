import { describe, expect, it } from 'vitest'
import { LandmarkSmoother, SignalSmoother } from './smoothing'

describe('SignalSmoother', () => {
  it('passes values through when half-life is 0', () => {
    const smoother = new SignalSmoother(0)
    expect(smoother.update(10, 0)).toBe(10)
    expect(smoother.update(20, 50)).toBe(20)
  })

  it('reduces a single-frame spike', () => {
    const smoother = new SignalSmoother(80)
    smoother.update(90, 0)
    smoother.update(90, 40)
    const spiked = smoother.update(20, 80)
    expect(spiked).toBeGreaterThan(20)
    expect(spiked).toBeLessThan(90)
  })

  it('ignores zero-dt updates', () => {
    const smoother = new SignalSmoother(80)
    smoother.update(10, 100)
    expect(smoother.update(80, 100)).toBe(10)
  })
})

describe('LandmarkSmoother', () => {
  it('smooths x/y independently and leaves visibility untouched', () => {
    const smoother = new LandmarkSmoother(80)
    const first = smoother.update([{ x: 0.2, y: 0.2, visibility: 0.9 }], 0)
    expect(first[0].x).toBeCloseTo(0.2)
    const next = smoother.update([{ x: 0.8, y: 0.2, visibility: 0.4 }], 40)
    expect(next[0].x).toBeLessThan(0.8)
    expect(next[0].visibility).toBe(0.4)
  })
})
