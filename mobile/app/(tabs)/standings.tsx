import { movegridApi, type ApiLeaderboard } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors, layout, radius, space, type } from '@/constants/theme'

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

  const entries = board?.entries ?? []

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      <Text style={styles.title} numberOfLines={2}>
        {board?.title ?? 'MOVE leaderboard'}
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {entries.length === 0 && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.empty}>No standings yet. Complete exercises to climb the board.</Text>
        </View>
      ) : (
        entries.map((entry) => (
          <View key={entry.id} style={[styles.row, entry.is_current_user && styles.rowHighlight]}>
            <View style={[styles.rankBadge, entry.is_current_user && styles.rankBadgeHighlight]}>
              <Text
                style={[styles.rank, entry.is_current_user && styles.rankHighlight]}
                numberOfLines={1}>
                {entry.rank}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                {entry.name}
                {entry.is_current_user ? ' (you)' : ''}
              </Text>
              <Text style={styles.points} numberOfLines={1}>
                {entry.points.toLocaleString()} MOVE
              </Text>
            </View>
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
    gap: space.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  title: {
    ...type.title,
    fontSize: 20,
    color: colors.text,
    marginBottom: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.md,
    minHeight: 64,
  },
  rowHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankBadgeHighlight: {
    backgroundColor: colors.card,
  },
  rank: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.muted,
  },
  rankHighlight: {
    color: colors.primaryDark,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...type.bodyStrong,
    color: colors.text,
  },
  points: {
    color: colors.muted,
    ...type.label,
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
