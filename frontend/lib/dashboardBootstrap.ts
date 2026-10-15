/**
 * Post-login dashboard prefetch + request coalescing.
 * Overlaps home data fetches with client-side navigation after sign-in.
 */
import {
  ApiLeaderboard,
  ApiMission,
  ApiTodayFitness,
  movegridApi,
} from './api'

type Entry<T> = { token: string; promise: Promise<T>; at: number }

const TTL_MS = 30_000

let todayEntry: Entry<ApiTodayFitness> | null = null
let boardEntry: Entry<ApiLeaderboard | null> | null = null
let missionsEntry: Entry<ApiMission[]> | null = null

function fresh<T>(entry: Entry<T> | null, token: string): entry is Entry<T> {
  return Boolean(entry && entry.token === token && Date.now() - entry.at < TTL_MS)
}

export function clearDashboardBootstrap() {
  todayEntry = null
  boardEntry = null
  missionsEntry = null
}

/** Fire essential home fetches without awaiting (call right after login). */
export function prefetchDashboard(token: string) {
  void loadTodayFitness(token)
  void loadLeaderboardMove(token)
  void loadMissions()
}

export function loadTodayFitness(token: string): Promise<ApiTodayFitness> {
  if (fresh(todayEntry, token)) return todayEntry.promise
  const promise = movegridApi.todayFitness(token)
  todayEntry = { token, promise, at: Date.now() }
  promise.catch(() => {
    if (todayEntry?.promise === promise) todayEntry = null
  })
  return promise
}

export function loadLeaderboardMove(token: string): Promise<ApiLeaderboard | null> {
  if (fresh(boardEntry, token)) return boardEntry.promise
  const promise = movegridApi.leaderboardMove(token, 20).catch(() => null)
  boardEntry = { token, promise, at: Date.now() }
  return promise
}

export function loadMissions(): Promise<ApiMission[]> {
  // Missions are public; reuse any in-flight/recent result.
  if (missionsEntry && Date.now() - missionsEntry.at < TTL_MS) return missionsEntry.promise
  const promise = movegridApi.missions().catch(() => [] as ApiMission[])
  missionsEntry = { token: '', promise, at: Date.now() }
  return promise
}

export function invalidateTodayFitness() {
  todayEntry = null
}
