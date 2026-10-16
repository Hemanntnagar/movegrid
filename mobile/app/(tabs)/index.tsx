import { movegridApi, type ApiTodayFitness } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import {
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  ScreenScroll,
  SectionTitle,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { colors, radius, space, type } from '@/constants/theme'
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
    } finally {
      setCompletingId(null)
    }
  }

  if (loading) return <LoadingState />

  const assigned = plan?.assigned ?? []
  const firstName = user?.name?.split(' ')[0] ?? 'Mover'
  const move = user?.total_points ?? plan?.total_points ?? 0
  const stepGoal = 5000
  const deviceSteps = steps.deviceSteps ?? 0
  const stepPercent = Math.min(100, Math.round((deviceSteps / stepGoal) * 100))

  const stats = [
    { label: 'MOVE', value: move.toLocaleString(), tone: styles.statLime },
    { label: 'Streak', value: String(user?.streak ?? 0), tone: styles.statOrange },
    { label: 'Today', value: `${plan?.progress.percent ?? 0}%`, tone: styles.statBlue },
  ] as const

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      <Card>
        <Text style={styles.eyebrow}>DAILY QUEST</Text>
        <Text style={styles.greeting} numberOfLines={2}>
          Hey {firstName}
        </Text>
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.stat, stat.tone]}>
              <Text
                style={[styles.statValue, narrow && styles.statValueNarrow]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
        {plan?.seconds_remaining != null && plan.seconds_remaining > 0 ? (
          <Text style={styles.countdown}>{formatCountdown(plan.seconds_remaining)}</Text>
        ) : null}
      </Card>

      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Steps today
          </Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Quest</Text>
          </View>
        </View>
        <Text
          style={styles.stepsCount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {steps.deviceSteps != null ? steps.deviceSteps.toLocaleString() : '—'}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stepPercent}%` as `${number}%` }]} />
        </View>
        <Text style={styles.meta} numberOfLines={2}>
          {stepPercent}% of {stepGoal.toLocaleString()} · Server {steps.serverSteps.toLocaleString()}
        </Text>
        {steps.support && steps.support.kind !== 'ready' && steps.support.kind !== 'checking' ? (
          <Text style={styles.hint}>{nativeStepSupportMessage(steps.support)}</Text>
        ) : null}
        {steps.error ? <Text style={styles.inlineError}>{steps.error}</Text> : null}
        {(steps.needsConnect || steps.canSync) && (
          <View style={styles.actions}>
            {steps.needsConnect ? (
              <Button
                label="Enable tracking"
                style={styles.actionBtn}
                busy={steps.checking}
                onPress={() => steps.connect()}
              />
            ) : null}
            {steps.canSync ? (
              <Button
                label="Sync"
                variant="secondary"
                style={styles.actionBtn}
                busy={steps.syncing}
                onPress={() => steps.syncToServer()}
              />
            ) : null}
          </View>
        )}
      </Card>

      <SectionTitle>Today&apos;s exercises</SectionTitle>
      {assigned.length === 0 ? (
        <EmptyState message="All done for today — nice work." />
      ) : (
        assigned.map((item) => (
          <Card key={item.id}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.exercise.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.exercise.duration_minutes} min · +{item.points} MOVE
            </Text>
            <Text style={styles.body} numberOfLines={5}>
              {item.exercise.instructions}
            </Text>
            <Button
              label="Mark complete"
              busy={completingId === item.id}
              onPress={() => completeAssignment(item.id)}
            />
          </Card>
        ))
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    ...type.caption,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  greeting: {
    ...type.title,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  statLime: { backgroundColor: colors.accentSoft },
  statOrange: { backgroundColor: colors.orangeSoft },
  statBlue: { backgroundColor: colors.blueSoft },
  statValue: {
    ...type.stat,
    color: colors.text,
    width: '100%',
    textAlign: 'center',
  },
  statValueNarrow: {
    fontSize: 15,
  },
  statLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
    textTransform: 'uppercase',
  },
  countdown: {
    ...type.label,
    color: colors.muted,
    marginTop: space.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  cardTitle: {
    ...type.section,
    color: colors.text,
    flexShrink: 1,
  },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    flexShrink: 0,
  },
  pillText: {
    ...type.caption,
    color: colors.primaryDark,
  },
  stepsCount: {
    ...type.display,
    color: colors.primaryDark,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  meta: {
    ...type.label,
    color: colors.muted,
  },
  hint: {
    ...type.label,
    color: colors.muted,
  },
  inlineError: {
    ...type.label,
    color: colors.danger,
  },
  body: {
    ...type.body,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
  },
})
