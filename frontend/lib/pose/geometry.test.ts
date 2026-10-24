import { describe, expect, it } from 'vitest'
import { angleAt, clamp, dist } from './geometry'

describe('geometry', () => {
  it('measures a right angle', () => {
    expect(angleAt({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90, 5)
  })

  it('measures a straight line as 180', () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180, 5)
  })

  it('measures 45 degrees', () => {
    expect(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45, 5)
  })

  it('is scale-invariant', () => {
    const small = angleAt({ x: 0, y: 0.1 }, { x: 0, y: 0 }, { x: 0.1, y: 0 })
    const large = angleAt({ x: 0, y: 4 }, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(small).toBeCloseTo(large, 5)
  })

  it('clamps and measures distance', () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
