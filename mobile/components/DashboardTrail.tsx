import {
  movegridApi,
  type ApiDailyAssignment,
  type ApiTodayFitness,
} from '@movegrid/api-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { PenguinPathMap, type PathLevel } from '@/components/PenguinPathMap'
import {
  daysInIstMonth,
  formatCountdown,
  getIstParts,
  istDateKey,
  istDateKeyFromIso,
  istMonthKey,
} from '@/lib/ist'
import {
  getMonthProgress,
  markDayCompleted,
  mergeHistoryIntoProgress,
  type DayLevelStatus,
  type MonthProgress,
} from '@/lib/monthProgress'

type Props = {
  token: string | null
  fitness: ApiTodayFitness | null
  onFitnessChange?: (fitness: ApiTodayFitness) => void
  onCompleteAssignment?: (id: number) => Promise<void>
  completingId?: number | null
}

export function DashboardTrail({
  token,
  fitness,
  onFitnessChange,
  onCompleteAssignment,
  completingId,
}: Props) {
  const [monthProgress, setMonthProgress] = useState<MonthProgress>({
    month: istMonthKey(),
    completedDays: [],
    missedDays: [],
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [gate, setGate] = useState<{ day: number; reason: DayLevelStatus } | null>(null)
  const [tick, setTick] = useState(0)

  const todayDay = getIstParts().day
  const dayCount = daysInIstMonth()
  const monthKey = istMonthKey()

  useEffect(() => {
    void getMonthProgress(monthKey).then(setMonthProgress)
  }, [monthKey])

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const applyHistory = useCallback(
    async (today: ApiTodayFitness, historyItems: ApiDailyAssignment[]) => {
      const completedDays = new Set<number>()
      const missedDays = new Set<number>()
      const byDay = new Map<string, ApiDailyAssignment[]>()

      for (const item of historyItems) {
        const key = istDateKeyFromIso(item.assigned_at)
        if (!key || !key.startsWith(monthKey)) continue
        if (!byDay.has(key)) byDay.set(key, [])
        byDay.get(key)!.push(item)
      }

      for (const [key, items] of byDay) {
        const dayNum = Number(key.slice(-2))
        if (dayNum === todayDay) continue
        const allComplete = items.length > 0 && items.every((i) => i.status === 'COMPLETED')
        const anyExpired = items.some((i) => i.status === 'EXPIRED')
        if (allComplete) completedDays.add(dayNum)
        else if (anyExpired || key < istDateKey()) missedDays.add(dayNum)
      }

      for (let d = 1; d < todayDay; d += 1) {
        if (!completedDays.has(d)) missedDays.add(d)
      }

      if (today.progress.total > 0 && today.progress.completed >= today.progress.total) {
        completedDays.add(todayDay)
        await markDayCompleted(todayDay, monthKey)
      }

      const next = await mergeHistoryIntoProgress(
        [...completedDays],
        [...missedDays].filter((d) => !completedDays.has(d)),
        monthKey,
      )
      setMonthProgress(next)
    },
    [monthKey, todayDay],
  )

  useEffect(() => {
    if (!token || !fitness) return
    void movegridApi
      .fitnessHistory(token)
      .then((history) => applyHistory(fitness, history.items))
      .catch(() => {})
  }, [token, fitness, applyHistory])

  const levels: PathLevel[] = useMemo(() => {
    const completed = new Set(monthProgress.completedDays)
    const missed = new Set(monthProgress.missedDays)
    const list: PathLevel[] = []
    for (let day = 1; day <= dayCount; day += 1) {
      let status: DayLevelStatus = 'locked'
      if (day === todayDay) status = completed.has(day) ? 'completed' : 'active'
      else if (day < todayDay)
        status = completed.has(day) ? 'completed' : missed.has(day) ? 'missed' : 'closed'
      list.push({ day, status })
    }
    return list
  }, [dayCount, monthProgress, todayDay])

  const secondsRemaining = useMemo(() => {
    if (!fitness?.expires_at) return 0
    return Math.max(0, Math.floor((new Date(fitness.expires_at).getTime() - Date.now()) / 1000))
  }, [fitness?.expires_at, tick])

  function handleSelectDay(day: number) {
    const level = levels.find((item) => item.day === day)
    if (!level) return
    if (day === todayDay) {
      setSelectedDay(day)
      return
    }
    setGate({ day, reason: level.status })
  }

  async function completeAndRefresh(id: number) {
    await onCompleteAssignment?.(id)
    if (token) {
      const next = await movegridApi.todayFitness(token)
      onFitnessChange?.(next)
      if (next.progress.total > 0 && next.progress.completed >= next.progress.total) {
        const progress = await markDayCompleted(todayDay, monthKey)
        setMonthProgress(progress)
      }
    }
  }

  const assigned = fitness?.assigned ?? []

  return (
    <>
      <PenguinPathMap levels={levels} todayDay={todayDay} onSelectDay={handleSelectDay} />

      <Modal
        visible={selectedDay === todayDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalEyebrow}>LEVEL {todayDay}</Text>
              <Pressable onPress={() => setSelectedDay(null)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalTitle}>Today&apos;s missions</Text>
            {secondsRemaining > 0 ? (
              <Text style={styles.timer}>⏱ {formatCountdown(secondsRemaining)} left</Text>
            ) : null}

            {assigned.length === 0 ? (
              <Text style={styles.empty}>All done for today — level cleared!</Text>
            ) : (
              assigned.map((item) => (
                <View key={item.id} style={styles.mission}>
                  <Text style={styles.missionTitle} numberOfLines={2}>
                    {item.exercise.name}
                  </Text>
                  <Text style={styles.missionMeta} numberOfLines={1}>
                    {item.exercise.duration_minutes} min · +{item.points} MOVE
                  </Text>
                  <Text style={styles.missionBody} numberOfLines={3}>
                    {item.exercise.instructions}
                  </Text>
                  <Pressable
                    style={[styles.completeBtn, completingId === item.id && styles.btnBusy]}
                    disabled={completingId === item.id}
                    onPress={() => completeAndRefresh(item.id)}>
                    {completingId === item.id ? (
                      <ActivityIndicator color="#fffdf0" />
                    ) : (
                      <Text style={styles.completeBtnText}>Mark complete</Text>
                    )}
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(gate)} transparent animationType="fade" onRequestClose={() => setGate(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>LEVEL {gate?.day}</Text>
            <Text style={styles.modalTitle}>
              {gate?.reason === 'locked'
                ? 'Locked'
                : gate?.reason === 'completed'
                  ? 'Already cleared'
                  : gate?.reason === 'missed'
                    ? 'Missed'
                    : 'Closed'}
            </Text>
            <Text style={styles.empty}>
              {gate?.reason === 'locked'
                ? 'Come back on that day to play this level.'
                : gate?.reason === 'completed'
                  ? 'You already finished this day.'
                  : 'This day is no longer available.'}
            </Text>
            <Pressable style={styles.completeBtn} onPress={() => setGate(null)}>
              <Text style={styles.completeBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fffdf0',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 3.5,
    borderColor: '#0f172a',
    padding: 20,
    gap: 12,
    maxHeight: '85%',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#0f172a',
  },
  close: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    padding: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  timer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  empty: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 22,
  },
  mission: {
    backgroundColor: '#a3e635',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#0f172a',
    padding: 14,
    gap: 6,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  missionMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    opacity: 0.85,
  },
  missionBody: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 20,
  },
  completeBtn: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 3,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBusy: { opacity: 0.7 },
  completeBtnText: {
    color: '#fffdf0',
    fontSize: 15,
    fontWeight: '900',
  },
})
