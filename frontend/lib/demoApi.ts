import type {
  ApiBuddy,
  ApiBuddyConnectResult,
  ApiBuddyInvite,
  ApiCompetition,
  ApiCompetitionCreate,
  ApiCompleteFitness,
  ApiDailyAssignment,
  ApiFitnessHistory,
  ApiLeaderboard,
  ApiNearbyPresence,
  ApiParticipateResult,
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

const DEMO_USER_KEY = 'movegrid_demo_user'
const DEMO_ACCOUNTS_KEY = 'movegrid_demo_accounts'
const DEMO_DAY_KEY = 'movegrid_demo_day'
const DEMO_REDEEM_KEY = 'movegrid_demo_redeems'
const DEMO_PRESENCE_KEY = 'movegrid_demo_presence'
const DEMO_PRESENCE_REGISTRY_KEY = 'movegrid_demo_presence_registry'
const DEMO_COMPETE_KEY = 'movegrid_demo_competitions'
const DEMO_CUSTOM_COMPETITIONS_KEY = 'movegrid_demo_custom_competitions'
const DEMO_BUDDY_INVITES_KEY = 'movegrid_demo_buddy_invites'
const DEMO_BUDDY_CONNECTIONS_KEY = 'movegrid_demo_buddy_connections'

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
  password?: string
  total_points: number
  streak: number
  streak_score: number
  active_minutes: number
  steps?: number
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

function readAccounts(): Record<string, DemoUserState> {
  return readJson(DEMO_ACCOUNTS_KEY, {})
}

function saveAccount(account: DemoUserState) {
  const accounts = readAccounts()
  accounts[account.email.toLowerCase().trim()] = account
  writeJson(DEMO_ACCOUNTS_KEY, accounts)
  saveUser(account)
}

function getUser(): DemoUserState {
  const stored = readJson<DemoUserState | null>(DEMO_USER_KEY, null)
  if (!stored) throw new Error('Not signed in')
  return stored
}

function saveUser(user: DemoUserState) {
  writeJson(DEMO_USER_KEY, user)
}

function buddyCardFromDemoUser(user: DemoUserState): ApiBuddy {
  const initials =
    user.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'MG'
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    initials,
    total_points: user.total_points,
    streak: user.streak,
    fitness_level: 'Intermediate',
  }
}

function demoBuddyFromId(id: number): ApiBuddy | null {
  const me = getUser()
  if (id === me.id) return buddyCardFromDemoUser(me)
  const accounts = readAccounts()
  const account = Object.values(accounts).find((entry) => entry.id === id)
  if (account) return buddyCardFromDemoUser(account)
  return buddyCardFromDemoUser({
    id,
    name: `Mover ${id}`,
    email: `mover${id}@movegrid.demo`,
    total_points: 500,
    streak: 1,
    streak_score: 10,
    active_minutes: 0,
    avatar: `initials:M${id}:#8bd4f4`,
  })
}

function buildDemoInvite(fromId: number, toId: number, message: string, id: number): ApiBuddyInvite {
  return {
    id,
    from_user_id: fromId,
    to_user_id: toId,
    message,
    status: 'pending',
    created_at: new Date().toISOString(),
    from_user: demoBuddyFromId(fromId)!,
    to_user: demoBuddyFromId(toId)!,
  }
}

type DemoPresenceRegistryEntry = {
  user_id: number
  name: string
  avatar: string
  latitude: number
  longitude: number
  is_sharing: boolean
  updated_at: string
  total_points: number
  streak: number
}

const LIVE_PRESENCE_MS = 15 * 60 * 1000

function readPresenceRegistry(): Record<string, DemoPresenceRegistryEntry> {
  return readJson(DEMO_PRESENCE_REGISTRY_KEY, {})
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function formatDistanceM(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
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
    steps: user.steps ?? 0,
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
  register(name: string, email: string, password: string, fitness_level?: string): ApiToken {
    const cleanEmail = email.trim().toLowerCase() || 'user@movegrid.demo'
    const cleanName = name.trim() || cleanEmail.split('@')[0] || 'MOVEGRID Mover'
    const initials =
      cleanName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase() || 'MG'

    const accounts = readAccounts()
    let user = accounts[cleanEmail]
    if (!user) {
      user = {
        id: Date.now(),
        name: cleanName,
        email: cleanEmail,
        password,
        total_points: 250,
        streak: 1,
        streak_score: 10,
        active_minutes: 0,
        avatar: `initials:${initials}:#8bd4f4`,
      }
    } else {
      user.name = cleanName
      user.password = password
    }
    saveAccount(user)
    if (fitness_level && typeof window !== 'undefined') {
      const existingPlan = getStoredPlan()
      writeJson('movegrid_fitness_plan', {
        ...(existingPlan ?? {}),
        fitnessLevel: fitness_level,
        hasCompletedOnboarding: true,
      })
    }
    return { access_token: `demo.${user.id}`, token_type: 'bearer' }
  },

  login(email: string, password: string): ApiToken {
    const cleanEmail = email.trim().toLowerCase()
    const accounts = readAccounts()
    const account = accounts[cleanEmail]
    if (!account) {
      throw new Error('Invalid email or password')
    }
    if (account.password && password && account.password !== password) {
      throw new Error('Invalid email or password')
    }
    saveUser(account)
    return { access_token: `demo.${account.id}`, token_type: 'bearer' }
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
        title: 'Hydration Hero: Drink 2L Water',
        description: 'Track and drink 2 liters of water throughout the day.',
        zone: 'Hydration Goal',
        move_reward: 100,
        minutes: 5,
        kind: 'Hydration',
      },
      {
        id: 3,
        title: 'Stadium Stairs',
        description: 'Climb the stadium steps.',
        zone: 'Athletics',
        move_reward: 180,
        minutes: 18,
        kind: 'Climb',
      },
      {
        id: 4,
        title: 'City Park 5K Trail Run',
        description: 'Sprint or jog through the main park trail circuit.',
        zone: 'Central Park',
        move_reward: 200,
        minutes: 28,
        kind: 'Run',
      },
      {
        id: 5,
        title: 'Neighborhood Bike Circuit',
        description: 'Cycle through the bike path and log your cardiovascular movement.',
        zone: 'City East Bikeway',
        move_reward: 160,
        minutes: 30,
        kind: 'Bike',
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
    const me = toApiUser(getUser())
    const entries = [
      {
        rank: 1,
        id: 2,
        name: 'Maya Chen',
        avatar: 'initials:MC:#ffd447',
        points: 12,
        movement: 1,
        is_current_user: false,
        meta: { streak: 12 },
      },
      {
        rank: 2,
        id: 3,
        name: 'Jordan Lee',
        avatar: 'initials:JL:#ff9a61',
        points: 9,
        movement: 0,
        is_current_user: false,
        meta: { streak: 9 },
      },
      {
        rank: 3,
        id: me.id,
        name: me.name,
        avatar: me.avatar,
        points: me.streak,
        movement: 2,
        is_current_user: true,
        meta: { streak: me.streak },
      },
      {
        rank: 4,
        id: 4,
        name: 'Sam Rivera',
        avatar: 'initials:SR:#b7e88f',
        points: 5,
        movement: -1,
        is_current_user: false,
        meta: { streak: 5 },
      },
    ]
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .slice(0, limit)
    const meEntry = entries.find((entry) => entry.is_current_user) ?? null
    return {
      board: 'streak',
      title: 'Streak leaders',
      metric_label: 'STREAK',
      limit,
      total_participants: entries.length,
      entries,
      me: meEntry,
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

  competitions(_token?: string | null): ApiCompetition[] {
    const me = toApiUser(getUser())
    const joined = new Set(readJson<number[]>(DEMO_COMPETE_KEY, []))
    const now = Date.now()
    const specs: Omit<ApiCompetition, 'eligible' | 'is_participating' | 'participant_count'>[] = [
      {
        id: 1,
        name: 'Monthly Move Cup',
        description: 'Team competition for MOVE earned this month. Stack points with your squad.',
        eligibility: 'Open to all members',
        min_points: 0,
        min_streak: 0,
        starts_at: new Date(now - 10 * 86400000).toISOString(),
        ends_at: new Date(now + 20 * 86400000).toISOString(),
        is_active: true,
        status: 'live',
      },
      {
        id: 2,
        name: 'Weekend Step Sprint',
        description: 'Hit your step goals all weekend and climb the live standings.',
        eligibility: '500+ MOVE points',
        min_points: 500,
        min_streak: 0,
        starts_at: new Date(now + 2 * 86400000).toISOString(),
        ends_at: new Date(now + 4 * 86400000).toISOString(),
        is_active: true,
        status: 'upcoming',
      },
      {
        id: 3,
        name: 'Streak Keepers Challenge',
        description: 'Protect a multi-day streak while completing daily missions.',
        eligibility: '3+ day streak',
        min_points: 0,
        min_streak: 3,
        starts_at: new Date(now - 1 * 86400000).toISOString(),
        ends_at: new Date(now + 13 * 86400000).toISOString(),
        is_active: true,
        status: 'live',
      },
      {
        id: 4,
        name: 'Sunrise 5K Relay',
        description: 'Early-bird relay — run or walk a 5K window before noon.',
        eligibility: 'Open to all members',
        min_points: 0,
        min_streak: 0,
        starts_at: new Date(now + 7 * 86400000).toISOString(),
        ends_at: new Date(now + 8 * 86400000).toISOString(),
        is_active: true,
        status: 'upcoming',
      },
    ]

    const customComps = readJson<Omit<ApiCompetition, 'eligible' | 'is_participating' | 'participant_count'>[]>(DEMO_CUSTOM_COMPETITIONS_KEY, [])
    const allSpecs = [...customComps, ...specs]

    return allSpecs.map((comp) => {
      const start = new Date(comp.starts_at).getTime()
      const end = comp.ends_at ? new Date(comp.ends_at).getTime() : null
      let status: ApiCompetition['status'] = 'live'
      if (end && now > end) status = 'ended'
      else if (now < start) status = 'upcoming'
      const meetsPoints = me.total_points >= comp.min_points
      const meetsStreak = me.streak >= comp.min_streak
      const eligible = meetsPoints && meetsStreak && status !== 'ended' && comp.is_active
      return {
        ...comp,
        status,
        eligible,
        is_participating: joined.has(comp.id),
        participant_count: 12 + comp.id * 3 + (joined.has(comp.id) ? 1 : 0),
      }
    })
  },

  createCompetition(data: ApiCompetitionCreate): ApiCompetition {
    const existingCustom = readJson<any[]>(DEMO_CUSTOM_COMPETITIONS_KEY, [])
    const newId = 100 + existingCustom.length + Math.floor(Math.random() * 1000)
    const now = Date.now()
    const newCompSpec = {
      id: newId,
      name: data.name,
      company_name: data.company_name || '',
      description: data.description || '',
      reward: data.reward || '',
      eligibility: data.eligibility || 'Open to all members',
      min_points: data.min_points || 0,
      min_streak: data.min_streak || 0,
      starts_at: data.starts_at || new Date(now).toISOString(),
      ends_at: data.ends_at || new Date(now + 14 * 86400000).toISOString(),
      is_active: true,
      status: 'live',
    }
    existingCustom.unshift(newCompSpec)
    writeJson(DEMO_CUSTOM_COMPETITIONS_KEY, existingCustom)
    return {
      ...newCompSpec,
      eligible: true,
      is_participating: false,
      participant_count: 1,
    }
  },

  participateCompetition(_token: string, id: number): ApiParticipateResult {
    const list = this.competitions(_token)
    const target = list.find((item) => item.id === id)
    if (!target) throw new Error('Competition not found')
    if (target.status === 'ended') throw new Error('This competition has ended')
    if (!target.eligible) throw new Error(`You are not eligible yet — ${target.eligibility}`)
    const joined = new Set(readJson<number[]>(DEMO_COMPETE_KEY, []))
    joined.add(id)
    writeJson(DEMO_COMPETE_KEY, [...joined])
    const updated = this.competitions(_token).find((item) => item.id === id)!
    return { status: 'joined', competition: { ...updated, is_participating: true } }
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
    const user = getUser()
    const now = new Date().toISOString()
    const presence = {
      user_id: user.id,
      latitude,
      longitude,
      is_sharing: isSharing,
      updated_at: now,
    }
    writeJson(DEMO_PRESENCE_KEY, presence)
    const registry = readPresenceRegistry()
    registry[String(user.id)] = {
      user_id: user.id,
      name: user.name,
      avatar: user.avatar,
      latitude,
      longitude,
      is_sharing: isSharing,
      updated_at: now,
      total_points: user.total_points,
      streak: user.streak,
    }
    writeJson(DEMO_PRESENCE_REGISTRY_KEY, registry)
    return presence
  },

  nearbyPresence(
    latitude: number,
    longitude: number,
    _token?: string | null,
    radiusM = 800,
  ): ApiNearbyPresence {
    const meUser = toApiUser(getUser())
    const meInitials =
      meUser.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase() || 'YO'
    const me = {
      id: meUser.id,
      name: meUser.name,
      avatar: meUser.avatar,
      initials: meInitials,
      latitude,
      longitude,
      distance_m: 0,
      distance_label: 'You',
      total_points: meUser.total_points,
      streak: meUser.streak,
      updated_at: new Date().toISOString(),
      is_current_user: true,
    }

    const cutoff = Date.now() - LIVE_PRESENCE_MS
    const registry = readPresenceRegistry()
    const nearby = Object.values(registry)
      .filter((entry) => entry.user_id !== meUser.id && entry.is_sharing)
      .filter((entry) => new Date(entry.updated_at).getTime() >= cutoff)
      .map((entry) => {
        const distance_m = haversineM(latitude, longitude, entry.latitude, entry.longitude)
        return {
          id: entry.user_id,
          name: entry.name,
          avatar: entry.avatar,
          initials:
            entry.name
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join('')
              .toUpperCase() || 'MG',
          latitude: entry.latitude,
          longitude: entry.longitude,
          distance_m: Math.round(distance_m * 10) / 10,
          distance_label: formatDistanceM(distance_m),
          total_points: entry.total_points,
          streak: entry.streak,
          updated_at: entry.updated_at,
          is_current_user: false,
        }
      })
      .filter((entry) => entry.distance_m <= radiusM)
      .sort((a, b) => a.distance_m - b.distance_m)

    return {
      latitude,
      longitude,
      radius_m: radiusM,
      count: nearby.length,
      me,
      nearby,
    }
  },

  startMission(id: number, steps = 0) {
    const user = getUser()
    if (steps > 0) {
      user.steps = Math.max(user.steps || 0, steps)
      saveUser(user)
    }
    return { status: 'started', id, challenge_id: id, steps_count: steps }
  },

  syncSteps(_token: string, steps: number, active_minutes?: number) {
    const user = getUser()
    user.steps = Math.max(user.steps || 0, steps)
    if (active_minutes) {
      user.active_minutes += active_minutes
    }
    saveUser(user)
    return {
      steps: user.steps,
      total_points: user.total_points,
      streak: user.streak,
      streak_score: user.streak_score,
      streak_gained: 0,
    }
  },

  completeMission(_id: number, _code = 'movegrid-demo') {
    const user = getUser()
    user.total_points += 150
    user.active_minutes += 20
    saveUser(user)
    return { status: 'COMPLETED', points_awarded: 150, total_points: user.total_points }
  },

  listBuddies(_token: string): ApiBuddy[] {
    const me = getUser()
    const pairs = readJson<number[][]>(DEMO_BUDDY_CONNECTIONS_KEY, [])
    const buddyIds = pairs
      .filter(([a, b]) => a === me.id || b === me.id)
      .map(([a, b]) => (a === me.id ? b : a))
    return buddyIds.map((id) => demoBuddyFromId(id)).filter(Boolean) as ApiBuddy[]
  },

  buddyInvitesIncoming(_token: string): ApiBuddyInvite[] {
    const me = getUser()
    return readJson<ApiBuddyInvite[]>(DEMO_BUDDY_INVITES_KEY, []).filter(
      (inv) => inv.to_user_id === me.id && inv.status === 'pending',
    )
  },

  sendBuddyInvite(_token: string, toUserId: number, message: string): ApiBuddyInvite {
    const me = getUser()
    if (toUserId === me.id) throw new Error('You cannot invite yourself')
    const invites = readJson<ApiBuddyInvite[]>(DEMO_BUDDY_INVITES_KEY, [])
    const connections = readJson<number[][]>(DEMO_BUDDY_CONNECTIONS_KEY, [])
    const connected = connections.some(
      ([a, b]) => (a === me.id && b === toUserId) || (b === me.id && a === toUserId),
    )
    if (connected) throw new Error('You are already connected with this mover')

    const reverse = invites.find(
      (inv) =>
        inv.from_user_id === toUserId &&
        inv.to_user_id === me.id &&
        inv.status === 'pending',
    )
    if (reverse) {
      return this.acceptBuddyInvite(_token, reverse.id).invite
    }

    const existing = invites.find((inv) => inv.from_user_id === me.id && inv.to_user_id === toUserId)
    const payload = buildDemoInvite(me.id, toUserId, message, existing?.id ?? Date.now())
    payload.status = 'pending'
    const next = existing
      ? invites.map((inv) => (inv.id === existing.id ? payload : inv))
      : [payload, ...invites]
    writeJson(DEMO_BUDDY_INVITES_KEY, next)
    return payload
  },

  acceptBuddyInvite(_token: string, inviteId: number): ApiBuddyConnectResult {
    const me = getUser()
    const invites = readJson<ApiBuddyInvite[]>(DEMO_BUDDY_INVITES_KEY, [])
    const invite = invites.find((inv) => inv.id === inviteId && inv.to_user_id === me.id)
    if (!invite || invite.status !== 'pending') throw new Error('Invite not found')

    invite.status = 'accepted'
    writeJson(DEMO_BUDDY_INVITES_KEY, invites.map((inv) => (inv.id === inviteId ? invite : inv)))

    const connections = readJson<number[][]>(DEMO_BUDDY_CONNECTIONS_KEY, [])
    const a = Math.min(invite.from_user_id, invite.to_user_id)
    const b = Math.max(invite.from_user_id, invite.to_user_id)
    if (!connections.some(([x, y]) => x === a && y === b)) {
      writeJson(DEMO_BUDDY_CONNECTIONS_KEY, [[a, b], ...connections])
    }
    return {
      status: 'connected',
      invite,
      buddy: demoBuddyFromId(invite.from_user_id)!,
    }
  },

  declineBuddyInvite(_token: string, inviteId: number) {
    const me = getUser()
    const invites = readJson<ApiBuddyInvite[]>(DEMO_BUDDY_INVITES_KEY, [])
    const invite = invites.find((inv) => inv.id === inviteId && inv.to_user_id === me.id)
    if (!invite || invite.status !== 'pending') throw new Error('Invite not found')
    invite.status = 'declined'
    writeJson(DEMO_BUDDY_INVITES_KEY, invites.map((inv) => (inv.id === inviteId ? invite : inv)))
    return { status: 'declined', invite_id: inviteId }
  },

}
