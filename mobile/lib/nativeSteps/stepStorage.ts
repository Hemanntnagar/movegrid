import AsyncStorage from '@react-native-async-storage/async-storage'
import { emptySnapshot, type StepSnapshot } from './stepMath'

const STORAGE_KEY = 'movegrid.native_steps.v1'

export async function loadStepSnapshot(): Promise<StepSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StepSnapshot>
    if (typeof parsed.dateKey !== 'string' || typeof parsed.steps !== 'number') {
      return null
    }
    return {
      dateKey: parsed.dateKey,
      steps: parsed.steps,
      sessionBase: typeof parsed.sessionBase === 'number' ? parsed.sessionBase : 0,
      lastWatchSteps: typeof parsed.lastWatchSteps === 'number' ? parsed.lastWatchSteps : 0,
    }
  } catch {
    return null
  }
}

export async function saveStepSnapshot(snapshot: StepSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export async function loadOrInitSnapshot(dateKey: string): Promise<StepSnapshot> {
  const loaded = await loadStepSnapshot()
  if (!loaded) return emptySnapshot(dateKey)
  if (loaded.dateKey !== dateKey) return emptySnapshot(dateKey)
  return loaded
}
