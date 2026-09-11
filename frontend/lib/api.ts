const configured = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '')

const API_URL = configured
  ? configured.endsWith('/api/v1')
    ? configured
    : `${configured}/api/v1`
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
  steps?: number
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

export type ApiCompetition = {
  id: number
  name: string
  company_name?: string
  venue?: string
  description: string
  reward?: string
  eligibility: string
  min_points: number
  min_streak: number
  starts_at: string
  ends_at: string | null
  is_active: boolean
  status: 'upcoming' | 'live' | 'ended' | string
  eligible: boolean
  is_participating: boolean
  participant_count: number | null
}

export type ApiCompetitionCreate = {
  company_name?: string
  venue?: string
  name: string
  description?: string
  reward?: string
  eligibility?: string
  starts_at?: string
  ends_at: string
  min_points?: number
  min_streak?: number
}

export type ApiParticipateResult = {
  status: string
  competition: ApiCompetition
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

export type ApiMissionComplete = {
  status: string
  move_awarded: number
  move_points: number
  streak: number
  streak_score: number
  streak_gained: number
}

export const MOVEGRID_USER_UPDATED = 'movegrid:user-updated'

export function notifyUserUpdated(detail?: { total_points?: number }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MOVEGRID_USER_UPDATED, { detail }))
  }
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

export type ApiBuddy = {
  id: number
  name: string
  avatar: string
  initials: string
  total_points: number
  streak: number
  fitness_level: string
  connected_at?: string
}

export type ApiBuddyInvite = {
  id: number
  from_user_id: number
  to_user_id: number
  message: string
  status: string
  created_at: string
  from_user: ApiBuddy
  to_user: ApiBuddy
}

export type ApiBuddyConnectResult = {
  status: string
  invite: ApiBuddyInvite
  buddy: ApiBuddy
}

export type ApiFitnessPlanGeneratePayload = {
  fitness_level: string
  goal: string
  daily_minutes: number
  preferred_windows: string[]
  focus_areas: string[]
}

export type ApiFitnessPlanSlot = {
  id: string
  time: string
  title: string
  duration: number
  category: string
  notes: string
}

export type ApiFitnessPlanGenerateResult = {
  fitness_level: string
  goal: string
  daily_minutes: number
  preferred_windows: string[]
  focus_areas: string[]
  schedule: ApiFitnessPlanSlot[]
  source: string
}

export type ApiCoachChatContext = {
  fitness_level?: string
  goal?: string
  daily_minutes?: number
  focus_areas?: string[]
}

export type ApiCoachChatPayload = {
  message: string
  history?: { role: string; content: string }[]
  context?: ApiCoachChatContext
}

export type ApiCoachChatResult = {
  reply: string
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    const hint =
      process.env.NODE_ENV === 'production'
        ? 'Check that the API is up, NEXT_PUBLIC_API_URL is set on Vercel, and Render CORS_ORIGINS includes your Vercel URL.'
        : 'Make sure your local backend is running (uvicorn app.main:app --reload on port 8000).'
    throw new Error(`Cannot connect to backend server at ${API_URL}. ${hint}`)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    let errorMsg = 'MOVEGRID API request failed'
    if (typeof body?.detail === 'string') {
      errorMsg = body.detail
    } else if (Array.isArray(body?.detail)) {
      const messages = body.detail.map((err: any) => {
        const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : ''
        if (field === 'password' && err.msg?.includes('at least 8')) {
          return 'Password must be at least 8 characters long'
        }
        if (field === 'email') {
          return 'Please enter a valid email address'
        }
        return err.msg || JSON.stringify(err)
      })
      errorMsg = messages.join('. ')
    }
    throw new Error(errorMsg)
  }
  return response.json()
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export const movegridApi = {
  register: (name: string, email: string, password: string, fitness_level?: string) =>
    request<ApiUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, full_name: name, email, password, fitness_level }),
    }),
  login: (email: string, password: string) =>
    request<ApiToken>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<ApiUser>('/auth/me', { headers: authHeaders(token) }),
  missions: () => request<ApiMission[]>('/missions'),
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
  competitions: (token?: string | null) =>
    request<ApiCompetition[]>('/competitions', {
      headers: token ? authHeaders(token) : undefined,
    }),
  createCompetition: (data: ApiCompetitionCreate, token?: string | null) =>
    request<ApiCompetition>('/competitions', {
      method: 'POST',
      headers: token ? authHeaders(token) : { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  participateCompetition: (token: string, id: number) =>
    request<ApiParticipateResult>(`/competitions/${id}/participate`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  startMission: (id: number, steps = 0, token?: string | null) =>
    request(`/missions/${id}/start`, {
      method: 'POST',
      headers: token ? authHeaders(token) : undefined,
      body: JSON.stringify({ steps }),
    }),
  syncSteps: (token: string, steps: number, active_minutes?: number) =>
    request<{ steps: number; total_points: number; streak: number; streak_score: number; streak_gained: number }>(
      '/daily-fitness/steps',
      {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ steps, active_minutes }),
      },
    ),
  completeMission: (token: string, id: number) =>
    request<ApiMissionComplete>(`/missions/${id}/complete`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  todayFitness: (token: string) =>
    request<ApiTodayFitness>('/daily-fitness/today', { headers: authHeaders(token) }),
  completeFitness: (token: string, assignmentId: number) =>
    request<ApiCompleteFitness>(`/daily-fitness/${assignmentId}/complete`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  fitnessHistory: (token: string) =>
    request<ApiFitnessHistory>('/daily-fitness/history', { headers: authHeaders(token) }),
  rewards: () => request<ApiReward[]>('/rewards'),
  reward: (id: number) => request<ApiReward>(`/rewards/${id}`),
  redeemReward: (token: string, id: number) =>
    request<ApiRedeemResult>(`/rewards/${id}/redeem`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  rewardHistory: (token: string) =>
    request<ApiRewardRedemption[]>('/rewards/history', { headers: authHeaders(token) }),
  updatePresence: (token: string, latitude: number, longitude: number, isSharing = true) =>
    request<ApiPresence>('/presence', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ latitude, longitude, is_sharing: isSharing }),
    }),
  nearbyPresence: (latitude: number, longitude: number, token?: string | null, radiusM = 800) =>
    request<ApiNearbyPresence>(
      `/presence/nearby?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radius_m=${radiusM}`,
      { headers: token ? authHeaders(token) : undefined },
    ),
  listBuddies: (token: string) => request<ApiBuddy[]>('/buddies', { headers: authHeaders(token) }),
  buddyInvitesIncoming: (token: string) =>
    request<ApiBuddyInvite[]>('/buddies/invites/incoming', { headers: authHeaders(token) }),
  sendBuddyInvite: (token: string, toUserId: number, message: string) =>
    request<ApiBuddyInvite>('/buddies/invite', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ to_user_id: toUserId, message }),
    }),
  acceptBuddyInvite: (token: string, inviteId: number) =>
    request<ApiBuddyConnectResult>(`/buddies/invites/${inviteId}/accept`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  declineBuddyInvite: (token: string, inviteId: number) =>
    request<{ status: string; invite_id: number }>(`/buddies/invites/${inviteId}/decline`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  generateFitnessPlan: (payload: ApiFitnessPlanGeneratePayload, token?: string | null) =>
    request<ApiFitnessPlanGenerateResult>('/fitness-plan/generate', {
      method: 'POST',
      headers: token ? authHeaders(token) : undefined,
      body: JSON.stringify(payload),
    }),
  coachChat: (payload: ApiCoachChatPayload, token?: string | null) =>
    request<ApiCoachChatResult>('/coach/chat', {
      method: 'POST',
      headers: token ? authHeaders(token) : undefined,
      body: JSON.stringify(payload),
    }),
}
