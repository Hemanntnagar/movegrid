const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "")

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
  board: "move" | "streak" | "competition" | string
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
  status: "ASSIGNED" | "COMPLETED" | "EXPIRED" | string
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

const TOKEN_KEY = "movegrid_token"

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function apiBase(): string {
  if (API_URL.endsWith("/api/v1")) return API_URL
  return `${API_URL}/api/v1`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? "MOVEGRID API request failed")
  }
  return response.json()
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export const movegridApi = {
  login: (email: string, password: string) =>
    request<ApiToken>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<ApiUser>("/auth/me", { headers: authHeaders(token) }),
  missions: () => request<ApiMission[]>("/missions"),
  leaderboard: (token?: string | null, limit = 20) =>
    request<ApiLeaderboard>(`/leaderboard/move?limit=${limit}`, {
      headers: token ? authHeaders(token) : undefined,
    }),
  leaderboardMove: (token?: string | null, limit = 20) =>
    request<ApiLeaderboard>(`/leaderboard/move?limit=${limit}`, {
      headers: token ? authHeaders(token) : undefined,
    }),
  leaderboardStreak: (token?: string | null, limit = 20) =>
    request<ApiLeaderboard>(`/leaderboard/streak?limit=${limit}`, {
      headers: token ? authHeaders(token) : undefined,
    }),
  leaderboardCompetition: (token?: string | null, limit = 20) =>
    request<ApiLeaderboard>(`/leaderboard/competition?limit=${limit}`, {
      headers: token ? authHeaders(token) : undefined,
    }),
  analytics: () =>
    request<{ movement_generated: number; active_students: number; missions_completed: number; engagement_rate: number }>(
      "/admin/analytics",
    ),
  completeMission: (id: number, code = "movegrid-demo") =>
    request(`/missions/${id}/complete`, { method: "POST", body: JSON.stringify({ code }) }),
  todayFitness: (token: string) =>
    request<ApiTodayFitness>("/daily-fitness/today", { headers: authHeaders(token) }),
  completeFitness: (token: string, assignmentId: number) =>
    request<ApiCompleteFitness>(`/daily-fitness/${assignmentId}/complete`, {
      method: "POST",
      headers: authHeaders(token),
    }),
  fitnessHistory: (token: string) =>
    request<ApiFitnessHistory>("/daily-fitness/history", { headers: authHeaders(token) }),
  rewards: () => request<ApiReward[]>("/rewards"),
  reward: (id: number) => request<ApiReward>(`/rewards/${id}`),
  redeemReward: (token: string, id: number) =>
    request<ApiRedeemResult>(`/rewards/${id}/redeem`, {
      method: "POST",
      headers: authHeaders(token),
    }),
  rewardHistory: (token: string) =>
    request<ApiRewardRedemption[]>("/rewards/history", { headers: authHeaders(token) }),
  updatePresence: (token: string, latitude: number, longitude: number, isSharing = true) =>
    request<ApiPresence>("/presence", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ latitude, longitude, is_sharing: isSharing }),
    }),
  nearbyPresence: (latitude: number, longitude: number, token?: string | null, radiusM = 800) =>
    request<ApiNearbyPresence>(
      `/presence/nearby?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radius_m=${radiusM}`,
      { headers: token ? authHeaders(token) : undefined },
    ),
}
