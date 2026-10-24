export class SignalSmoother {
  private value: number | null = null
  private timestampMs: number | null = null

  constructor(private readonly halfLifeMs: number) {}

  update(next: number, timestampMs: number): number {
    if (!Number.isFinite(next)) {
      return this.value ?? next
    }
    if (this.halfLifeMs <= 0 || this.value == null || this.timestampMs == null) {
      this.value = next
      this.timestampMs = timestampMs
      return next
    }

    const dt = Math.max(0, timestampMs - this.timestampMs)
    this.timestampMs = timestampMs
    if (dt === 0) return this.value

    const alpha = 1 - Math.exp((-Math.LN2 * dt) / this.halfLifeMs)
    this.value = alpha * next + (1 - alpha) * this.value
    return this.value
  }

  peek(): number | null {
    return this.value
  }

  reset() {
    this.value = null
    this.timestampMs = null
  }
}

export class LandmarkSmoother {
  private readonly filters = new Map<string, SignalSmoother>()

  constructor(private readonly halfLifeMs: number) {}

  update<T extends { x: number; y: number }>(landmarks: T[], timestampMs: number): T[] {
    if (this.halfLifeMs <= 0) return landmarks

    return landmarks.map((landmark, index) => {
      const x = this.filter(`${index}:x`).update(landmark.x, timestampMs)
      const y = this.filter(`${index}:y`).update(landmark.y, timestampMs)
      return { ...landmark, x, y }
    })
  }

  reset() {
    this.filters.clear()
  }

  private filter(key: string): SignalSmoother {
    let existing = this.filters.get(key)
    if (!existing) {
      existing = new SignalSmoother(this.halfLifeMs)
      this.filters.set(key, existing)
    }
    return existing
  }
}
