import { AppState, type AppStateStatus, Platform } from 'react-native'
import { Pedometer } from 'expo-sensors'
import { istDateKey, istDayStartDate } from '@/lib/ist'
import {
  readTodayStepCount as readHealthConnectToday,
  requestHealthConnectStepsAccess,
  resolveHealthConnectSupport,
} from '@/lib/healthConnectSteps'
import {
  applyDayQuery,
  applyWatchUpdate,
  beginWatchSession,
  emptySnapshot,
  type StepSnapshot,
} from './stepMath'
import { loadOrInitSnapshot, saveStepSnapshot } from './stepStorage'

type PedometerSubscription = { remove: () => void }

export type NativeStepSupport =
  | { kind: 'checking' }
  | { kind: 'unavailable' }
  | { kind: 'permission_denied'; canAskAgain: boolean }
  | { kind: 'ready' }

export type NativeStepListener = (steps: number) => void

/**
 * Cross-platform daily step tracker backed by:
 * - Android: Sensor.TYPE_STEP_COUNTER (expo-sensors Pedometer) + Health Connect for background fill
 * - iOS: CMPedometer query + live updates (expo-sensors Pedometer)
 *
 * No timers or simulated steps. Persist daily totals; reconcile with max() to avoid duplicates.
 */
class NativeStepCounter {
  private snapshot: StepSnapshot = emptySnapshot(istDateKey())
  private support: NativeStepSupport = { kind: 'checking' }
  private watchSub: PedometerSubscription | null = null
  private appStateSub: { remove: () => void } | null = null
  private listeners = new Set<NativeStepListener>()
  private supportListeners = new Set<(s: NativeStepSupport) => void>()
  private started = false
  private hcPrompted = false
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private lastPersistMs = 0

  getSteps(): number {
    return this.snapshot.steps
  }

  getSupport(): NativeStepSupport {
    return this.support
  }

  subscribe(listener: NativeStepListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot.steps)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeSupport(listener: (s: NativeStepSupport) => void): () => void {
    this.supportListeners.add(listener)
    listener(this.support)
    return () => {
      this.supportListeners.delete(listener)
    }
  }

  async start(): Promise<void> {
    if (this.started) {
      await this.reconcileFromPlatform()
      return
    }
    this.started = true

    const dateKey = istDateKey()
    this.snapshot = await loadOrInitSnapshot(dateKey)
    this.emit()

    const available = await Pedometer.isAvailableAsync()
    if (!available) {
      this.setSupport({ kind: 'unavailable' })
      // Still try Health Connect on Android for a day total without live pedometer.
      if (Platform.OS === 'android') {
        await this.reconcileFromPlatform()
      }
      this.attachAppState()
      return
    }

    const perm = await Pedometer.getPermissionsAsync()
    if (!perm.granted) {
      this.setSupport({
        kind: 'permission_denied',
        canAskAgain: perm.canAskAgain,
      })
      this.attachAppState()
      return
    }

    this.setSupport({ kind: 'ready' })
    await this.ensureAndroidBackgroundSource()
    await this.reconcileFromPlatform()
    this.startWatch()
    this.attachAppState()
  }

  async requestPermission(): Promise<NativeStepSupport> {
    const available = await Pedometer.isAvailableAsync()
    if (!available) {
      this.setSupport({ kind: 'unavailable' })
      return this.support
    }

    const result = await Pedometer.requestPermissionsAsync()
    if (!result.granted) {
      this.setSupport({
        kind: 'permission_denied',
        canAskAgain: result.canAskAgain,
      })
      return this.support
    }

    this.setSupport({ kind: 'ready' })
    await this.ensureAndroidBackgroundSource()
    if (!this.started) {
      await this.start()
    } else {
      await this.reconcileFromPlatform()
      this.startWatch()
    }
    return this.support
  }

  async refresh(): Promise<number> {
    await this.reconcileFromPlatform()
    return this.snapshot.steps
  }

  stop(): void {
    this.stopWatch()
    this.appStateSub?.remove()
    this.appStateSub = null
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    void saveStepSnapshot(this.snapshot)
    this.started = false
  }

  private setSupport(next: NativeStepSupport) {
    this.support = next
    for (const listener of this.supportListeners) listener(next)
  }

  private emit() {
    for (const listener of this.listeners) listener(this.snapshot.steps)
    this.schedulePersist()
  }

  /** Debounced persist — avoids hammering flash on every step (battery + wear). */
  private schedulePersist() {
    const now = Date.now()
    if (now - this.lastPersistMs < 2_000) {
      if (this.persistTimer) return
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null
        this.lastPersistMs = Date.now()
        void saveStepSnapshot(this.snapshot)
      }, 2_000)
      return
    }
    this.lastPersistMs = now
    void saveStepSnapshot(this.snapshot)
  }

  private attachAppState() {
    if (this.appStateSub) return
    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void this.onForeground()
      } else if (state === 'background' || state === 'inactive') {
        void saveStepSnapshot(this.snapshot)
        // Expo stops pedometer delivery in background; drop the watch to save battery.
        this.stopWatch()
      }
    })
  }

  private async onForeground() {
    const dateKey = istDateKey()
    if (this.snapshot.dateKey !== dateKey) {
      this.snapshot = emptySnapshot(dateKey)
      this.emit()
    }
    if (this.support.kind === 'ready') {
      await this.reconcileFromPlatform()
      this.startWatch()
    } else if (this.support.kind === 'permission_denied') {
      const perm = await Pedometer.getPermissionsAsync()
      if (perm.granted) {
        this.setSupport({ kind: 'ready' })
        await this.reconcileFromPlatform()
        this.startWatch()
      }
    } else if (Platform.OS === 'android') {
      await this.reconcileFromPlatform()
    }
  }

  private startWatch() {
    if (this.watchSub || this.support.kind !== 'ready') return
    this.snapshot = beginWatchSession(this.snapshot, istDateKey())
    void saveStepSnapshot(this.snapshot)

    this.watchSub = Pedometer.watchStepCount((result) => {
      this.snapshot = applyWatchUpdate(this.snapshot, istDateKey(), result.steps)
      this.emit()
    })
  }

  private stopWatch() {
    this.watchSub?.remove()
    this.watchSub = null
  }

  /** One Health Connect permission prompt per process — fills steps while the app is killed. */
  private async ensureAndroidBackgroundSource() {
    if (Platform.OS !== 'android' || this.hcPrompted) return
    this.hcPrompted = true
    await requestHealthConnectStepsAccess().catch(() => undefined)
  }

  /**
   * Pull authoritative day totals:
   * - iOS: CMPedometer.getStepCountAsync(dayStart, now)
   * - Android: Health Connect aggregate (covers steps while app was dead)
   */
  private async reconcileFromPlatform() {
    const dateKey = istDateKey()
    if (this.snapshot.dateKey !== dateKey) {
      this.snapshot = emptySnapshot(dateKey)
    }

    if (Platform.OS === 'ios') {
      try {
        const { steps } = await Pedometer.getStepCountAsync(istDayStartDate(), new Date())
        this.snapshot = applyDayQuery(this.snapshot, dateKey, steps)
        this.emit()
      } catch {
        /* query can fail if motion permission revoked mid-session */
      }
      return
    }

    if (Platform.OS === 'android') {
      try {
        const support = await resolveHealthConnectSupport()
        if (support.kind === 'ready') {
          const steps = await readHealthConnectToday()
          this.snapshot = applyDayQuery(this.snapshot, dateKey, steps)
          this.emit()
        }
      } catch {
        /* HC optional — TYPE_STEP_COUNTER watch still tracks foreground */
      }
    }
  }
}

export const nativeStepCounter = new NativeStepCounter()
