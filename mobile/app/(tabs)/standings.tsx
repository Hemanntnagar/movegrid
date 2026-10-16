import { movegridApi, type ApiLeaderboard } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import {
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  ScreenScroll,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { colors, radius, space, type } from '@/constants/theme'

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

  if (loading) return <LoadingState />

  const entries = board?.entries ?? []

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      <Card>
        <Text style={styles.eyebrow}>LEADERBOARD</Text>
        <Text style={styles.title} numberOfLines={2}>
          {board?.title ?? 'MOVE standings'}
        </Text>
      </Card>

      {error ? <ErrorBanner message={error} /> : null}

      {entries.length === 0 && !error ? (
        <EmptyState message="No standings yet. Complete exercises to climb the board." />
      ) : (
        entries.map((entry) => (
          <View
            key={entry.id}
            style={[styles.row, entry.is_current_user && styles.rowHighlight]}>
            <View style={[styles.rankBadge, entry.is_current_user && styles.rankBadgeYou]}>
              <Text style={[styles.rank, entry.is_current_user && styles.rankYou]} numberOfLines={1}>
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
  title: {
    ...type.title,
    color: colors.text,
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
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankBadgeYou: {
    backgroundColor: colors.card,
  },
  rank: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.muted,
  },
  rankYou: {
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
    ...type.label,
    color: colors.muted,
  },
})
