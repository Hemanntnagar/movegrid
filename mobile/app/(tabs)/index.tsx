import { movegridApi, type ApiTodayFitness } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'
import { useHealthConnectSteps } from '@/hooks/useHealthConnectSteps'
import { healthConnectSupportMessage } from '@/lib/healthConnectSteps'

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

export default function TodayScreen() {
  const { token, user, refreshUser } = useAuth()
  const [plan, setPlan] = useState<ApiTodayFitness | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<number | null>(null)

  const steps = useHealthConnectSteps({
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
      await load()
      await steps.refreshSupport()
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
      await load()
      await refreshUser()
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Hey {user?.name?.split(' ')[0] ?? 'mover'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.total_points ?? plan?.total_points ?? 0}</Text>
            <Text style={styles.statLabel}>MOVE</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{plan?.progress.percent ?? 0}%</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>
        {plan?.seconds_remaining != null && plan.seconds_remaining > 0 ? (
          <Text style={styles.countdown}>{formatCountdown(plan.seconds_remaining)}</Text>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>Steps (Health Connect)</Text>
        <Text style={styles.stepsCount}>
          {steps.deviceSteps != null ? steps.deviceSteps.toLocaleString() : '—'}{' '}
          <Text style={styles.stepsGoal}>today · server {steps.serverSteps.toLocaleString()}</Text>
        </Text>
        {steps.support && steps.support.kind !== 'ready' ? (
          <Text style={styles.stepsHint}>{healthConnectSupportMessage(steps.support)}</Text>
        ) : null}
        {steps.error ? <Text style={styles.error}>{steps.error}</Text> : null}
        <View style={styles.stepsActions}>
          {steps.needsConnect ? (
            <Pressable
              style={[styles.stepsBtn, steps.checking && styles.stepsBtnBusy]}
              disabled={steps.checking}
              onPress={() => steps.connect()}>
              <Text style={styles.stepsBtnText}>Connect Health Connect</Text>
            </Pressable>
          ) : null}
          {steps.canSync ? (
            <Pressable
              style={[styles.stepsBtnOutline, steps.syncing && styles.stepsBtnBusy]}
              disabled={steps.syncing}
              onPress={() => steps.syncToServer()}>
              {steps.syncing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.stepsBtnOutlineText}>Sync to MOVEGRID</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s exercises</Text>
      {assigned.length === 0 ? (
        <Text style={styles.empty}>All done for today — nice work.</Text>
      ) : (
        assigned.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.exercise.name}</Text>
            <Text style={styles.cardMeta}>
              {item.exercise.duration_minutes} min · +{item.points} MOVE
            </Text>
            <Text style={styles.cardBody} numberOfLines={3}>
              {item.exercise.instructions}
            </Text>
            <Pressable
              style={[styles.completeBtn, completingId === item.id && styles.completeBtnBusy]}
              disabled={completingId === item.id}
              onPress={() => completeAssignment(item.id)}>
              {completingId === item.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeBtnText}>Mark complete</Text>
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
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  countdown: { marginTop: 12, color: colors.muted, fontSize: 13 },
  stepsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  stepsTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  stepsCount: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  stepsGoal: { fontSize: 14, fontWeight: '500', color: colors.muted },
  stepsHint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  stepsActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stepsBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  stepsBtnOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  stepsBtnBusy: { opacity: 0.7 },
  stepsBtnText: { color: '#fff', fontWeight: '700' },
  stepsBtnOutlineText: { color: colors.primaryDark, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  empty: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardMeta: { color: colors.muted, fontSize: 13 },
  cardBody: { color: colors.text, lineHeight: 20 },
  completeBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completeBtnBusy: { opacity: 0.8 },
  completeBtnText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger },
})
