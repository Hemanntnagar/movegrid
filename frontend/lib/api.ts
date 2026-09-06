import { demoApi } from './demoApi'

const configured = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '')

/**
 * Production with no NEXT_PUBLIC_API_URL → full in-browser demo (zero Vercel env).
 * Local/dev with no URL → localhost API for normal backend work.
 */
export const isDemoMode =
  configured.length === 0 && process.env.NODE_ENV === 'production'

const API_URL = configured
  ? configured.endsWith('/api/v1')
    ? configured
    : `${configured}/api/v1`
  : isDemoMode
    ? ''
    : 'http://localhost:8000/api/v1'

export type ApiMission = { id: number; title: string; description: string; zone: string; move_reward: number; minutes: number; kind: string }
export type ApiUser = {
  id: number
  name: string
  email: string
  role: string
  fitness_level?: string
  team_id?: number | null
  total_points: number
  streak: number
  streak_score?: number
  streak_month?: string
  active_minutes: number
  avatar: string
}

export type ApiLeaderboardEntry = {
  rank: number
  id: number
  name: string
  avatar: string
  points: number
  movement: number
  is_current_user: boolean
  meta?: Record<string, unknown>
}

export type ApiLeaderboard = {
  board: 'move' | 'streak' | 'competition' | string
  title: string
  metric_label: string
  limit: number
  total_participants: number
  entries: ApiLeaderboardEntry[]
  me: ApiLeaderboardEntry | null
}
export type ApiToken = { access_token: string; token_type: string }

export type ApiExercise = {
  id: number
  name: string
  description: string
  category: string
  difficulty: string
  duration_minutes: number
  target_reps: number
  instructions: string
  points: number
}

export type ApiDailyAssignment = {
  id: number
  user_id: number
  exercise_id: number
  assigned_at: string
  expires_at: string
  status: 'ASSIGNED' | 'COMPLETED' | 'EXPIRED' | string
  points: number
  completed_at: string | null
  seconds_remaining: number
  exercise: ApiExercise
}

export type ApiTodayFitness = {
  fitness_level: string
  total_points: number
  progress: {
    completed: number
    total: number
    percent: number
    points_available: number
    points_earned: number
  }
  expires_at: string | null
  seconds_remaining: number
  expired_just_now: number
  assignments: ApiDailyAssignment[]
  assigned: ApiDailyAssignment[]
  completed: ApiDailyAssignment[]
}

export type ApiCompleteFitness = {
  status: string
  assignment_id: number
  points_awarded: number
  total_points: number
  streak?: number
  streak_score?: number
  streak_gained?: number
  exercise_name: string | null
  completed_at: string | null
}

export type ApiFitnessHistory = {
  total_points: number
  items: ApiDailyAssignment[]
  completed: ApiDailyAssignment[]
  expired: ApiDailyAssignment[]
  assigned: ApiDailyAssignment[]
}

export type ApiReward = {
  id: number
  title: string
  description: string
  category: string
  points_required: number
  stock: number
  image: string
  active: boolean
}

export type ApiRewardRedemption = {
  id: number
  user_id: number
  reward_id: number
  points_spent: number
  redeemed_at: string
  status: string
  reward?: ApiReward | null
}

export type ApiRedeemResult = {
  status: string
  redemption_id: number
  reward_id: number
  reward_title: string
  points_spent: number
  total_points: number
  stock_remaining: number
  redeemed_at: string
}

export type ApiNearbyUser = {
  id: number
  name: string
  avatar: string
  initials: string
  latitude: number
  longitude: number
  distance_m: number
  distance_label: string
  total_points: number
  streak: number
  updated_at: string
  is_current_user: boolean
}

export type ApiNearbyPresence = {
  latitude: number
  longitude: number
  radius_m: number
  count: number
  me: ApiNearbyUser | null
  nearby: ApiNearbyUser[]
}

export type ApiPresence = {
  user_id: number
  latitude: number
  longitude: number
  is_sharing: boolean
  updated_at: string
}

const TOKEN_KEY = 'movegrid_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/** Start a local demo session when no backend URL is configured. */
export function ensureDemoSession() {
  if (!isDemoMode) return
  demoApi.ensureSession()
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? 'MOVEGRID API request failed')
  }
  return response.json()
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

function asPromise<T>(value: T): Promise<T> {
  return Promise.resolve(value)
}

export const movegridApi = {
  login: (email: string, password: string) =>
    isDemoMode
      ? asPromise(demoApi.login(email, password))
      : request<ApiToken>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) =>
    isDemoMode ? asPromise(demoApi.me(token)) : request<ApiUser>('/auth/me', { headers: authHeaders(token) }),
  missions: () =>
    isDemoMode ? asPromise(demoApi.missions()) : request<ApiMission[]>('/missions'),
  leaderboard: (token?: string | null, limit = 20) =>
    isDemoMode
      ? asPromise(demoApi.leaderboardMove(limit))
      : request<ApiLeaderboard>(`/leaderboard/move?limit=${limit}`, {
          headers: token ? authHeaders(token) : undefined,
        }),
  leaderboardMove: (token?: string | null, limit = 20) =>
    isDemoMode
      ? asPromise(demoApi.leaderboardMove(limit))
      : request<ApiLeaderboard>(`/leaderboard/move?limit=${limit}`, {
          headers: token ? authHeaders(token) : undefined,
        }),
  leaderboardStreak: (token?: string | null, limit = 20) =>
    isDemoMode
      ? asPromise(demoApi.leaderboardStreak(limit))
      : request<ApiLeaderboard>(`/leaderboard/streak?limit=${limit}`, {
          headers: token ? authHeaders(token) : undefined,
        }),
  leaderboardCompetition: (token?: string | null, limit = 20) =>
    isDemoMode
      ? asPromise(demoApi.leaderboardCompetition(limit))
      : request<ApiLeaderboard>(`/leaderboard/competition?limit=${limit}`, {
          headers: token ? authHeaders(token) : undefined,
        }),
  completeMission: (id: number, code = 'movegrid-demo') =>
    isDemoMode
      ? asPromise(demoApi.completeMission(id, code))
      : request(`/missions/${id}/complete`, { method: 'POST', body: JSON.stringify({ code }) }),
  todayFitness: (token: string) =>
    isDemoMode
      ? asPromise(demoApi.todayFitness(token))
      : request<ApiTodayFitness>('/daily-fitness/today', { headers: authHeaders(token) }),
  completeFitness: (token: string, assignmentId: number) =>
    isDemoMode
      ? asPromise(demoApi.completeFitness(token, assignmentId))
      : request<ApiCompleteFitness>(`/daily-fitness/${assignmentId}/complete`, {
          method: 'POST',
          headers: authHeaders(token),
        }),
  fitnessHistory: (token: string) =>
    isDemoMode
      ? asPromise(demoApi.fitnessHistory(token))
      : request<ApiFitnessHistory>('/daily-fitness/history', { headers: authHeaders(token) }),
  rewards: () => (isDemoMode ? asPromise(demoApi.rewards()) : request<ApiReward[]>('/rewards')),
  reward: (id: number) =>
    isDemoMode ? asPromise(demoApi.reward(id)) : request<ApiReward>(`/rewards/${id}`),
  redeemReward: (token: string, id: number) =>
    isDemoMode
      ? asPromise(demoApi.redeemReward(token, id))
      : request<ApiRedeemResult>(`/rewards/${id}/redeem`, {
          method: 'POST',
          headers: authHeaders(token),
        }),
  rewardHistory: (token: string) =>
    isDemoMode
      ? asPromise(demoApi.rewardHistory(token))
      : request<ApiRewardRedemption[]>('/rewards/history', { headers: authHeaders(token) }),
  updatePresence: (token: string, latitude: number, longitude: number, isSharing = true) =>
    isDemoMode
      ? asPromise(demoApi.updatePresence(token, latitude, longitude, isSharing))
      : request<ApiPresence>('/presence', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ latitude, longitude, is_sharing: isSharing }),
        }),
  nearbyPresence: (latitude: number, longitude: number, token?: string | null, radiusM = 800) =>
    isDemoMode
      ? asPromise(demoApi.nearbyPresence(latitude, longitude, token, radiusM))
      : request<ApiNearbyPresence>(
          `/presence/nearby?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radius_m=${radiusM}`,
          { headers: token ? authHeaders(token) : undefined },
        ),
}
