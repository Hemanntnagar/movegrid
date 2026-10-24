import { movegridApi, type ApiTodayFitness } from '@movegrid/api-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { DashboardTrail } from '@/components/DashboardTrail'
import {
  ErrorBanner,
  LoadingState,
  ScreenScroll,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { colors, inkShadow, radius, type } from '@/constants/theme'
import { formatCountdown } from '@/lib/ist'
import { nativeStepSupportMessage, useNativeSteps } from '@/hooks/useNativeSteps'

const STEP_GOAL = 5000

export default function TodayScreen() {
  const { token, user, refreshUser } = useAuth()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const narrow = width < 360
  const [plan, setPlan] = useState<ApiTodayFitness | null>(null)
  const [rankLabel, setRankLabel] = useState('—')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [questActive, setQuestActive] = useState(false)
  const [tick, setTick] = useState(0)

  const steps = useNativeSteps({
    token,
    serverSteps: user?.steps ?? 0,
    onSynced: refreshUser,
  })

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const [data, board] = await Promise.all([
      movegridApi.todayFitness(token),
      movegridApi.leaderboardMove(token, 50).catch(() => null),
    ])
    setPlan(data)
    const me = board?.entries?.find((e) => e.is_current_user)
    setRankLabel(me ? `#${me.rank}` : '—')
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load plan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([load(), steps.refreshSupport()])
      if (token) await steps.syncToServer()
      await refreshUser()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  async function completeAssignment(assignmentId: number) {
    if (!token) return
    setCompletingId(assignmentId)
    setError(null)
    try {
      await movegridApi.completeFitness(token, assignmentId)
      await Promise.all([load(), refreshUser()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete exercise')
      throw e
    } finally {
      setCompletingId(null)
    }
  }

  const deviceSteps = steps.deviceSteps ?? user?.steps ?? 0
  const stepPercent = Math.min(100, Math.round((deviceSteps / STEP_GOAL) * 100))
  const move = user?.total_points ?? plan?.total_points ?? 0
  const firstName = user?.name?.split(' ')[0] ?? 'Mover'

  const secondsRemaining = useMemo(() => {
    if (plan?.expires_at) {
      return Math.max(0, Math.floor((new Date(plan.expires_at).getTime() - Date.now()) / 1000))
    }
    const end = new Date()
    end.setHours(24, 0, 0, 0)
    return Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000))
  }, [plan?.expires_at, tick])

  const questDone = stepPercent >= 100
  const questState = questDone ? 'completed' : questActive ? 'active' : 'idle'

  if (loading) return <LoadingState />

  const stats = [
    { label: 'MOVE', value: move.toLocaleString(), bg: colors.accent },
    { label: 'Streak', value: String(user?.streak ?? 0), bg: colors.orange },
    { label: 'Steps', value: deviceSteps.toLocaleString(), bg: colors.blue },
    { label: 'Rank', value: rankLabel, bg: colors.purple, onPress: () => router.push('/standings') },
  ] as const

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
      }>
      <View style={[styles.questBanner, inkShadow]}>
        <View style={styles.questHeader}>
          <View style={styles.questBadge}>
            <Text style={styles.questBadgeText}>
              {questState === 'completed'
                ? 'COMPLETED'
                : questState === 'active'
                  ? 'TRACKING LIVE'
                  : 'DAILY QUEST'}
            </Text>
          </View>
          <View style={styles.timerChip}>
            <Text style={styles.timerText}>
              {questDone ? '✓ Done' : `⏱ ${formatCountdown(secondsRemaining)}`}
            </Text>
          </View>
        </View>
        <View style={styles.questBody}>
          <Text style={styles.questMeta} numberOfLines={1}>
            👟 {deviceSteps.toLocaleString()} / {STEP_GOAL.toLocaleString()} ({stepPercent}%)
          </Text>
          {questDone ? (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>+250 MOVE</Text>
            </View>
          ) : questActive ? (
            <View style={[styles.statusChip, styles.statusActive]}>
              <Text style={styles.statusChipText}>Active</Text>
            </View>
          ) : (
            <Pressable style={styles.startBtn} onPress={() => setQuestActive(true)}>
              <Text style={styles.startBtnIcon}>▶</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stepPercent}%` as `${number}%` }]} />
        </View>
        {steps.support && steps.support.kind !== 'ready' && steps.support.kind !== 'checking' ? (
          <Text style={styles.hint}>{nativeStepSupportMessage(steps.support)}</Text>
        ) : null}
        {steps.needsConnect ? (
          <Pressable style={styles.connectBtn} onPress={() => steps.connect()}>
            <Text style={styles.connectBtnText}>Enable step tracking</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.speech}>
        <Text style={styles.speechText}>⚡ POWER UP YOUR DAY!</Text>
      </View>
      <Text style={styles.eyebrow}>MOVEGRID · DAILY QUEST</Text>
      <Text style={styles.greeting} numberOfLines={2}>
        Keep moving, <Text style={styles.greetingAccent}>{firstName}</Text>!
      </Text>

      <View style={styles.statsRow}>
        {stats.map((stat) => {
          const inner = (
            <View style={[styles.stat, { backgroundColor: stat.bg }, inkShadow]}>
              <Text
                style={[styles.statValue, narrow && styles.statValueNarrow]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          )
          if ('onPress' in stat && stat.onPress) {
            return (
              <Pressable key={stat.label} style={styles.statWrap} onPress={stat.onPress}>
                {inner}
              </Pressable>
            )
          }
          return (
            <View key={stat.label} style={styles.statWrap}>
              {inner}
            </View>
          )
        })}
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <DashboardTrail
        token={token}
        fitness={plan}
        onFitnessChange={setPlan}
        onCompleteAssignment={completeAssignment}
        completingId={completingId}
      />
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  questBanner: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 3.5,
    borderColor: colors.ink,
    padding: 10,
    gap: 6,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  questBadge: {
    backgroundColor: colors.yellow,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  questBadgeText: {
    ...type.caption,
    fontSize: 9,
    color: colors.ink,
  },
  timerChip: {
    backgroundColor: colors.ink,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timerText: {
    ...type.caption,
    color: colors.cream,
  },
  questBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  questMeta: {
    ...type.label,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
  },
  statusChip: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: colors.blue,
  },
  statusChipText: {
    ...type.caption,
    color: colors.ink,
  },
  startBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnIcon: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#e2e8f0',
    borderWidth: 1.5,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  hint: {
    ...type.caption,
    color: colors.muted,
  },
  connectBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
  },
  connectBtnText: {
    ...type.caption,
    color: colors.cream,
  },
  speech: {
    alignSelf: 'flex-start',
    backgroundColor: colors.yellow,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.ink,
    paddingVertical: 5,
    paddingHorizontal: 10,
    ...inkShadow,
  },
  speechText: {
    ...type.caption,
    color: colors.ink,
  },
  eyebrow: {
    ...type.caption,
    color: colors.ink,
    letterSpacing: 1,
  },
  greeting: {
    ...type.title,
    fontSize: 22,
    color: colors.ink,
    marginTop: -4,
  },
  greetingAccent: {
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
    width: '100%',
  },
  statWrap: {
    flex: 1,
    minWidth: 0,
  },
  stat: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statValue: {
    ...type.stat,
    color: colors.ink,
    width: '100%',
    textAlign: 'center',
  },
  statValueNarrow: {
    fontSize: 12,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
})
