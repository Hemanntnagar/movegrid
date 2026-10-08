import { movegridApi, type ApiLeaderboard } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'

export default function StandingsScreen() {
  const { token } = useAuth()
  const [board, setBoard] = useState<ApiLeaderboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await movegridApi.leaderboardMove(token, 25)
    setBoard(data)
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load leaderboard')
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <Text style={styles.title}>{board?.title ?? 'MOVE leaderboard'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {(board?.entries ?? []).map((entry) => (
        <View
          key={entry.id}
          style={[styles.row, entry.is_current_user && styles.rowHighlight]}>
          <Text style={styles.rank}>#{entry.rank}</Text>
          <View style={styles.rowBody}>
            <Text style={styles.name}>{entry.name}</Text>
            <Text style={styles.points}>{entry.points} MOVE</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  rowHighlight: { borderColor: colors.primary, backgroundColor: '#ecfdf5' },
  rank: { width: 36, fontWeight: '800', color: colors.muted },
  rowBody: { flex: 1 },
  name: { fontWeight: '600', color: colors.text },
  points: { color: colors.muted, marginTop: 2 },
  error: { color: colors.danger },
})
