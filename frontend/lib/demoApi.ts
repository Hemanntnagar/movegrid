import type {
  ApiCompleteFitness,
  ApiDailyAssignment,
  ApiFitnessHistory,
  ApiLeaderboard,
  ApiNearbyPresence,
  ApiPresence,
  ApiRedeemResult,
  ApiReward,
  ApiRewardRedemption,
  ApiTodayFitness,
  ApiToken,
  ApiUser,
} from './api'
import { FitnessPlan, getStoredPlan } from './fitnessPlan'
import { getIstParts, istDateKey } from './ist'

const DEMO_TOKEN = 'demo.movegrid.local'
const DEMO_USER_KEY = 'movegrid_demo_user'
const DEMO_DAY_KEY = 'movegrid_demo_day'
const DEMO_REDEEM_KEY = 'movegrid_demo_redeems'
const DEMO_PRESENCE_KEY = 'movegrid_demo_presence'

const DEMO_REWARDS: ApiReward[] = [
  {
    id: 1,
    title: 'Smoothie Voucher',
    description: 'One free smoothie from a partner cafe.',
    category: 'Food',
    points_required: 200,
    stock: 24,
    image: 'smoothie',
    active: true,
  },
  {
    id: 2,
    title: 'Gym Day Pass',
    description: 'Guest pass for a partner fitness center.',
    category: 'Fitness',
    points_required: 350,
    stock: 12,
    image: 'gym',
    active: true,
  },
  {
    id: 3,
    title: 'MOVE Sticker Pack',
    description: 'Limited MOVEGRID sticker set.',
    category: 'Merch',
    points_required: 120,
    stock: 40,
    image: 'sticker',
    active: true,
  },
]

type DemoUserState = {
  id: number
  name: string
  email: string
  total_points: number
  streak: number
  streak_score: number
  active_minutes: number
  avatar: string
}

type DemoDayState = {
  date: string
  completedIds: number[]
  assignedAt: string
  expiresAt: string
}

function endOfIstDayIso(): { assignedAt: string; expiresAt: string } {
  const parts = getIstParts()
  const assignedAt = new Date().toISOString()
  const secondsLeft =
    (23 - parts.hour) * 3600 + (59 - parts.minute) * 60 + (60 - parts.second)
  const expiresAt = new Date(Date.now() + Math.max(60, secondsLeft) * 1000).toISOString()
  return { assignedAt, expiresAt }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function defaultUser(email = 'demo@movegrid.demo'): DemoUserState {
  const short = email.split('@')[0] || 'Alex'
  const name =
    short
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Alex Mover'
  return {
    id: 1,
    name,
    email,
    total_points: 2480,
    streak: 7,
    streak_score: 420,
    active_minutes: 86,
    avatar: 'initials:AM:#8bd4f4',
  }
}

function getUser(): DemoUserState {
  return readJson(DEMO_USER_KEY, defaultUser())
}

function saveUser(user: DemoUserState) {
  writeJson(DEMO_USER_KEY, user)
}

function getDayState(plan: FitnessPlan | null): DemoDayState {
  const today = istDateKey()
  const existing = readJson<DemoDayState | null>(DEMO_DAY_KEY, null)
  if (existing?.date === today) return existing
  const window = endOfIstDayIso()
  const next: DemoDayState = {
    date: today,
    completedIds: [],
    assignedAt: window.assignedAt,
    expiresAt: window.expiresAt,
  }
  writeJson(DEMO_DAY_KEY, next)
  void plan
  return next
}

function saveDayState(state: DemoDayState) {
  writeJson(DEMO_DAY_KEY, state)
}

function assignmentFromPlan(plan: FitnessPlan | null, day: DemoDayState): ApiDailyAssignment[] {
  const slots =
    plan?.schedule?.length
      ? plan.schedule
      : [
          {
            id: 'fallback-1',
            time: '08:00',
            title: 'Neighborhood Loop Walk',
            duration: 15,
            category: 'Walking' as const,
            notes: 'Brisk conversational pace.',
          },
          {
            id: 'fallback-2',
            time: '18:00',
            title: 'Bodyweight Squats',
            duration: 10,
            category: 'Strength' as const,
            notes: '20 controlled reps.',
          },
        ]

  return slots.map((slot, index) => {
    const id = index + 1
    const completed = day.completedIds.includes(id)
    const points = 40 + index * 20
    return {
      id,
      user_id: 1,
      exercise_id: id,
      assigned_at: day.assignedAt,
      expires_at: day.expiresAt,
      status: completed ? 'COMPLETED' : 'ASSIGNED',
      points,
      completed_at: completed ? day.assignedAt : null,
      seconds_remaining: Math.max(
        0,
        Math.floor((new Date(day.expiresAt).getTime() - Date.now()) / 1000),
      ),
      exercise: {
        id,
        name: slot.title,
        description: slot.notes,
        category: slot.category,
        difficulty: plan?.fitnessLevel ?? 'Beginner',
        duration_minutes: slot.duration,
        target_reps: 0,
        instructions: slot.notes,
        points,
      },
    }
  })
}

function toApiUser(user: DemoUserState): ApiUser {
  const parts = getIstParts()
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'member',
    fitness_level: getStoredPlan()?.fitnessLevel ?? 'Beginner',
    team_id: 1,
    total_points: user.total_points,
    streak: user.streak,
    streak_score: user.streak_score,
    streak_month: `${parts.year}-${String(parts.month).padStart(2, '0')}`,
    active_minutes: user.active_minutes,
    avatar: user.avatar,
  }
}

function buildToday(): ApiTodayFitness {
  const plan = getStoredPlan()
  const user = getUser()
  const day = getDayState(plan)
  const assignments = assignmentFromPlan(plan, day)
  const completed = assignments.filter((item) => item.status === 'COMPLETED')
  const assigned = assignments.filter((item) => item.status === 'ASSIGNED')
  const pointsEarned = completed.reduce((sum, item) => sum + item.points, 0)
  const pointsAvailable = assignments.reduce((sum, item) => sum + item.points, 0)
  return {
    fitness_level: plan?.fitnessLevel ?? 'Beginner',
    total_points: user.total_points,
    progress: {
      completed: completed.length,
      total: assignments.length,
      percent: assignments.length
        ? Math.round((completed.length / assignments.length) * 100)
        : 0,
      points_available: pointsAvailable,
      points_earned: pointsEarned,
    },
    expires_at: day.expiresAt,
    seconds_remaining: Math.max(
      0,
      Math.floor((new Date(day.expiresAt).getTime() - Date.now()) / 1000),
    ),
    expired_just_now: 0,
    assignments,
    assigned,
    completed,
  }
}

export function isDemoToken(token: string | null | undefined) {
  return Boolean(token && token.startsWith('demo.'))
}

export const demoApi = {
  login(email: string, _password: string): ApiToken {
    const base = defaultUser(email)
    const user = { ...getUser(), ...base, email }
    saveUser(user)
    return { access_token: DEMO_TOKEN, token_type: 'bearer' }
  },

  me(_token: string): ApiUser {
    return toApiUser(getUser())
  },

  missions() {
    return [
      {
        id: 1,
        title: '10,000 Daily Steps Goal',
        description: 'Hit 10,000 steps today.',
        zone: 'Downtown Loop',
        move_reward: 150,
        minutes: 45,
        kind: 'Walk',
      },
      {
        id: 2,
        title: 'Stadium Stairs',
        description: 'Climb the stadium steps.',
        zone: 'Athletics',
        move_reward: 180,
        minutes: 18,
        kind: 'Climb',
      },
    ]
  },

  leaderboardMove(limit = 20): ApiLeaderboard {
    const me = toApiUser(getUser())
    const entries = [
      {
        rank: 1,
        id: 2,
        name: 'Maya Chen',
        avatar: 'initials:MC:#ffd447',
        points: 2840,
        movement: 2840,
        is_current_user: false,
      },
      {
        rank: 2,
        id: 3,
        name: 'Jordan Lee',
        avatar: 'initials:JL:#ff9a61',
        points: 2690,
        movement: 2690,
        is_current_user: false,
      },
      {
        rank: 3,
        id: me.id,
        name: me.name,
        avatar: me.avatar,
        points: me.total_points,
        movement: me.total_points,
        is_current_user: true,
      },
      {
        rank: 4,
        id: 4,
        name: 'Sam Rivera',
        avatar: 'initials:SR:#b7e88f',
        points: 2210,
        movement: 2210,
        is_current_user: false,
      },
    ].slice(0, limit)
    const meEntry = entries.find((entry) => entry.is_current_user) ?? null
    return {
      board: 'move',
      title: 'MOVE leaders',
      metric_label: 'MOVE',
      limit,
      total_participants: entries.length,
      entries,
      me: meEntry,
    }
  },

  leaderboardStreak(limit = 20): ApiLeaderboard {
    const board = this.leaderboardMove(limit)
    return {
      ...board,
      board: 'streak',
      title: 'Streak leaders',
      metric_label: 'Streak score',
      entries: board.entries.map((entry) => ({
        ...entry,
        points: entry.is_current_user ? getUser().streak_score : entry.points - 400,
      })),
      me: board.me ? { ...board.me, points: getUser().streak_score } : null,
    }
  },

  leaderboardCompetition(limit = 20): ApiLeaderboard {
    const board = this.leaderboardMove(limit)
    return {
      ...board,
      board: 'competition',
      title: 'Team competition',
      metric_label: 'Team MOVE',
    }
  },

  todayFitness(_token: string): ApiTodayFitness {
    return buildToday()
  },

  completeFitness(_token: string, assignmentId: number): ApiCompleteFitness {
    const plan = getStoredPlan()
    const day = getDayState(plan)
    const assignments = assignmentFromPlan(plan, day)
    const target = assignments.find((item) => item.id === assignmentId)
    if (!target) throw new Error('Assignment not found')
    if (!day.completedIds.includes(assignmentId)) {
      day.completedIds = [...day.completedIds, assignmentId]
      saveDayState(day)
      const user = getUser()
      user.total_points += target.points
      user.active_minutes += target.exercise.duration_minutes
      user.streak_score += 10
      saveUser(user)
    }
    const user = getUser()
    return {
      status: 'COMPLETED',
      assignment_id: assignmentId,
      points_awarded: target.points,
      total_points: user.total_points,
      streak: user.streak,
      streak_score: user.streak_score,
      streak_gained: 10,
      exercise_name: target.exercise.name,
      completed_at: new Date().toISOString(),
    }
  },

  fitnessHistory(_token: string): ApiFitnessHistory {
    const today = buildToday()
    return {
      total_points: today.total_points,
      items: today.assignments,
      completed: today.completed,
      expired: [],
      assigned: today.assigned,
    }
  },

  rewards(): ApiReward[] {
    return DEMO_REWARDS.map((reward) => ({ ...reward }))
  },

  reward(id: number): ApiReward {
    const found = DEMO_REWARDS.find((reward) => reward.id === id)
    if (!found) throw new Error('Reward not found')
    return { ...found }
  },

  redeemReward(_token: string, id: number): ApiRedeemResult {
    const reward = this.reward(id)
    const user = getUser()
    if (user.total_points < reward.points_required) {
      throw new Error('Not enough MOVE points')
    }
    if (reward.stock <= 0) throw new Error('Out of stock')
    user.total_points -= reward.points_required
    saveUser(user)
    const redemption: ApiRewardRedemption = {
      id: Date.now(),
      user_id: user.id,
      reward_id: reward.id,
      points_spent: reward.points_required,
      redeemed_at: new Date().toISOString(),
      status: 'COMPLETED',
      reward,
    }
    const history = readJson<ApiRewardRedemption[]>(DEMO_REDEEM_KEY, [])
    writeJson(DEMO_REDEEM_KEY, [redemption, ...history])
    return {
      status: 'COMPLETED',
      redemption_id: redemption.id,
      reward_id: reward.id,
      reward_title: reward.title,
      points_spent: reward.points_required,
      total_points: user.total_points,
      stock_remaining: Math.max(0, reward.stock - 1),
      redeemed_at: redemption.redeemed_at,
    }
  },

  rewardHistory(_token: string): ApiRewardRedemption[] {
    return readJson<ApiRewardRedemption[]>(DEMO_REDEEM_KEY, [])
  },

  updatePresence(
    _token: string,
    latitude: number,
    longitude: number,
    isSharing = true,
  ): ApiPresence {
    const presence = {
      user_id: 1,
      latitude,
      longitude,
      is_sharing: isSharing,
      updated_at: new Date().toISOString(),
    }
    writeJson(DEMO_PRESENCE_KEY, presence)
    return presence
  },

  nearbyPresence(
    latitude: number,
    longitude: number,
    _token?: string | null,
    radiusM = 800,
  ): ApiNearbyPresence {
    const meUser = toApiUser(getUser())
    const me = {
      id: meUser.id,
      name: meUser.name,
      avatar: meUser.avatar,
      initials: 'YO',
      latitude,
      longitude,
      distance_m: 0,
      distance_label: 'you',
      total_points: meUser.total_points,
      streak: meUser.streak,
      updated_at: new Date().toISOString(),
      is_current_user: true,
    }
    const nearby = [
      {
        id: 2,
        name: 'Maya Chen',
        avatar: 'initials:MC:#ffd447',
        initials: 'MC',
        latitude: latitude + 0.0008,
        longitude: longitude + 0.0005,
        distance_m: 95,
        distance_label: '95 m',
        total_points: 2840,
        streak: 12,
        updated_at: new Date().toISOString(),
        is_current_user: false,
      },
      {
        id: 3,
        name: 'Jordan Lee',
        avatar: 'initials:JL:#ff9a61',
        initials: 'JL',
        latitude: latitude - 0.0006,
        longitude: longitude + 0.0009,
        distance_m: 140,
        distance_label: '140 m',
        total_points: 2690,
        streak: 9,
        updated_at: new Date().toISOString(),
        is_current_user: false,
      },
    ]
    return {
      latitude,
      longitude,
      radius_m: radiusM,
      count: nearby.length,
      me,
      nearby,
    }
  },

  completeMission(_id: number, _code = 'movegrid-demo') {
    const user = getUser()
    user.total_points += 150
    user.active_minutes += 20
    saveUser(user)
    return { status: 'COMPLETED', points_awarded: 150, total_points: user.total_points }
  },

  /** Ensure a browser session exists so the trail works without a remote API. */
  ensureSession() {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('movegrid_token')) {
      localStorage.setItem('movegrid_token', DEMO_TOKEN)
    }
    if (!localStorage.getItem(DEMO_USER_KEY)) {
      saveUser(defaultUser())
    }
  },
}
