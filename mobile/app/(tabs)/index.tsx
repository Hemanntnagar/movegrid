import { movegridApi, type ApiTodayFitness } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors, layout, radius, space, touch, type } from '@/constants/theme'
import { nativeStepSupportMessage, useNativeSteps } from '@/hooks/useNativeSteps'

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

export default function TodayScreen() {
  const { token, user, refreshUser } = useAuth()
  const { width } = useWindowDimensions()
  const narrow = width < 360
  const [plan, setPlan] = useState<ApiTodayFitness | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<number | null>(null)

  const steps = useNativeSteps({
    token,
    serverSteps: user?.steps ?? 0,
    onSynced: refreshUser,
  })

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const data = await movegridApi.todayFitness(token)
    setPlan(data)
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

  async function onRefresh() {
    setRefreshing(true)
    try {
      // Plan load + native pedometer reconcile are independent.
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
      // Refresh plan + profile in parallel (complete payload already applied server-side).
      await Promise.all([load(), refreshUser()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete exercise')
    } finally {
      setCompletingId(null)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const assigned = plan?.assigned ?? []
  const firstName = user?.name?.split(' ')[0] ?? 'mover'

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      <View style={styles.hero}>
        <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
          Hey {firstName}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, narrow && styles.statValueNarrow]} numberOfLines={1}>
              {user?.total_points ?? plan?.total_points ?? 0}
            </Text>
            <Text style={styles.statLabel}>MOVE</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, narrow && styles.statValueNarrow]} numberOfLines={1}>
              {user?.streak ?? 0}
            </Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, narrow && styles.statValueNarrow]} numberOfLines={1}>
              {plan?.progress.percent ?? 0}%
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>
        {plan?.seconds_remaining != null && plan.seconds_remaining > 0 ? (
          <Text style={styles.countdown}>{formatCountdown(plan.seconds_remaining)}</Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Steps today</Text>
        <Text style={styles.stepsCount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {steps.deviceSteps != null ? steps.deviceSteps.toLocaleString() : '—'}
        </Text>
        <Text style={styles.stepsMeta}>
          Device today · Server {steps.serverSteps.toLocaleString()}
        </Text>
        {steps.support && steps.support.kind !== 'ready' && steps.support.kind !== 'checking' ? (
          <Text style={styles.hint}>{nativeStepSupportMessage(steps.support)}</Text>
        ) : null}
        {steps.error ? <Text style={styles.error}>{steps.error}</Text> : null}
        <View style={styles.actions}>
          {steps.needsConnect ? (
            <Pressable
              style={[styles.btnPrimary, styles.actionBtn, steps.checking && styles.btnBusy]}
              disabled={steps.checking}
              onPress={() => steps.connect()}>
              <Text style={styles.btnPrimaryText}>Enable step tracking</Text>
            </Pressable>
          ) : null}
          {steps.canSync ? (
            <Pressable
              style={[styles.btnOutline, styles.actionBtn, steps.syncing && styles.btnBusy]}
              disabled={steps.syncing}
              onPress={() => steps.syncToServer()}>
              {steps.syncing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.btnOutlineText}>Sync to MOVEGRID</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s exercises</Text>
      {assigned.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.empty}>All done for today — nice work.</Text>
        </View>
      ) : (
        assigned.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.exercise.name}
            </Text>
            <Text style={styles.cardMeta}>
              {item.exercise.duration_minutes} min · +{item.points} MOVE
            </Text>
            <Text style={styles.cardBody} numberOfLines={4}>
              {item.exercise.instructions}
            </Text>
            <Pressable
              style={[styles.btnPrimary, completingId === item.id && styles.btnBusy]}
              disabled={completingId === item.id}
              onPress={() => completeAssignment(item.id)}>
              {completingId === item.id ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Mark complete</Text>
              )}
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: layout.screenPadding,
    paddingBottom: space.xxxl,
    gap: layout.contentGap,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.md,
  },
  greeting: {
    ...type.title,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  statValue: {
    ...type.stat,
    color: colors.primaryDark,
  },
  statValueNarrow: {
    fontSize: 16,
  },
  statLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
  },
  countdown: {
    color: colors.muted,
    ...type.label,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  cardTitle: {
    ...type.section,
    fontSize: 16,
    color: colors.text,
  },
  cardMeta: {
    color: colors.muted,
    ...type.label,
  },
  cardBody: {
    color: colors.text,
    ...type.body,
    lineHeight: 22,
  },
  stepsCount: {
    ...type.display,
    color: colors.primaryDark,
  },
  stepsMeta: {
    color: colors.muted,
    ...type.label,
  },
  hint: {
    color: colors.muted,
    ...type.label,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: touch.minHeight,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: touch.minHeight,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  btnBusy: { opacity: 0.7 },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  btnOutlineText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  sectionTitle: {
    ...type.section,
    color: colors.text,
    marginTop: space.xs,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: {
    color: colors.muted,
    ...type.body,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  error: {
    color: colors.danger,
    ...type.label,
    lineHeight: 18,
  },
})
