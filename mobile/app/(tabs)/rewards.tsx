import {
  movegridApi,
  seedMeCache,
  type ApiReward,
  type ApiRewardRedemption,
} from '@movegrid/api-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import { colors, layout, radius, space, type } from '@/constants/theme'

const FILTERS = ['All', 'Food', 'Events', 'Sports', 'Merch'] as const

export default function RewardsScreen() {
  const { token, user, refreshUser } = useAuth()
  const [rewards, setRewards] = useState<ApiReward[]>([])
  const [history, setHistory] = useState<ApiRewardRedemption[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ApiReward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [voucher, setVoucher] = useState<{ title: string; id: number; spent: number } | null>(null)

  const balance = user?.total_points ?? 0

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const [catalog, redemptions] = await Promise.all([
      movegridApi.rewards(),
      movegridApi.rewardHistory(token),
    ])
    setRewards(catalog)
    setHistory(redemptions.items)
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load rewards')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'All') return rewards
    return rewards.filter((r) => r.category.toLowerCase().includes(filter.toLowerCase()))
  }, [rewards, filter])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([load(), refreshUser()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  async function confirmRedeem() {
    if (!token || !confirm) return
    setRedeeming(true)
    setError(null)
    try {
      const result = await movegridApi.redeemReward(token, confirm.id)
      if (user) seedMeCache(token, { ...user, total_points: result.total_points })
      setRewards((prev) =>
        prev.map((item) =>
          item.id === result.reward_id ? { ...item, stock: result.stock_remaining } : item,
        ),
      )
      setConfirm(null)
      setVoucher({ title: result.reward_title, id: result.redemption_id, spent: result.points_spent })
      await Promise.all([load(), refreshUser()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not redeem reward')
      setConfirm(null)
    } finally {
      setRedeeming(false)
    }
  }

  function onRedeemPress(reward: ApiReward) {
    if (reward.stock <= 0) {
      Alert.alert('Out of stock', 'This reward is unavailable right now.')
      return
    }
    if (balance < reward.points_required) {
      Alert.alert(
        'Not enough MOVE',
        `You need ${(reward.points_required - balance).toLocaleString()} more MOVE.`,
      )
      return
    }
    setConfirm(reward)
  }

  if (loading) return <LoadingState />

  return (
    <>
      <ScreenScroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        <Card tone="yellow" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>MOVE balance</Text>
          <Text
            style={styles.balanceValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {balance.toLocaleString()}
          </Text>
        </Card>

        {error ? <ErrorBanner message={error} /> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {FILTERS.map((cat) => {
            const active = filter === cat
            return (
              <Pressable
                key={cat}
                onPress={() => setFilter(cat)}
                style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
                  {cat}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <EmptyState message="No rewards in this category yet." />
        ) : (
          filtered.map((reward) => {
            const available = reward.stock > 0
            const canAfford = balance >= reward.points_required
            const disabled = !available || !canAfford || redeeming
            return (
              <Card key={reward.id} style={!available ? styles.cardDim : undefined}>
                <View style={styles.cardTop}>
                  <View style={styles.category}>
                    <Text style={styles.categoryText} numberOfLines={1}>
                      {reward.category}
                    </Text>
                  </View>
                  <Text style={styles.cost} numberOfLines={1}>
                    {reward.points_required.toLocaleString()} MOVE
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>
                  {reward.title}
                </Text>
                <Text style={styles.description} numberOfLines={3}>
                  {reward.description}
                </Text>
                <Text style={styles.stock} numberOfLines={1}>
                  {available ? `${reward.stock} in stock` : 'Out of stock'}
                </Text>
                <Button
                  label={!available ? 'Unavailable' : !canAfford ? 'Not enough MOVE' : 'Redeem'}
                  disabled={disabled}
                  onPress={() => onRedeemPress(reward)}
                />
              </Card>
            )
          })
        )}

        <SectionTitle>Your redemptions</SectionTitle>
        {history.length === 0 ? (
          <EmptyState message="No redemptions yet — your first swap shows up here." />
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {item.reward?.title ?? `Reward #${item.reward_id}`}
                </Text>
                <Text style={styles.historyMeta} numberOfLines={1}>
                  {new Date(item.redeemed_at).toLocaleString()} · {item.status}
                </Text>
              </View>
              <Text style={styles.historySpend} numberOfLines={1}>
                −{item.points_spent.toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScreenScroll>

      <Modal
        visible={Boolean(confirm)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Confirm redemption</Text>
            <Text style={styles.modalTitle} numberOfLines={3}>
              {confirm?.title}
            </Text>
            <Text style={styles.modalBody}>
              Spend {confirm?.points_required.toLocaleString()} MOVE from your{' '}
              {balance.toLocaleString()} balance.
            </Text>
            <Text style={styles.modalPreview}>
              New balance:{' '}
              {confirm ? (balance - confirm.points_required).toLocaleString() : '—'} MOVE
            </Text>
            <Button
              label={redeeming ? 'Redeeming…' : 'Confirm redeem'}
              busy={redeeming}
              onPress={confirmRedeem}
            />
            <Button
              label="Cancel"
              variant="ghost"
              disabled={redeeming}
              onPress={() => setConfirm(null)}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(voucher)}
        transparent
        animationType="fade"
        onRequestClose={() => setVoucher(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Voucher unlocked</Text>
            <Text style={styles.modalTitle} numberOfLines={3}>
              {voucher?.title}
            </Text>
            <Text style={styles.modalBody}>Show this code at the partner store or venue.</Text>
            <View style={styles.voucherCode}>
              <Text style={styles.voucherCodeText} numberOfLines={2}>
                VOUCHER #{voucher?.id}-MOVEGRID
              </Text>
            </View>
            <Text style={styles.modalPreview}>Redeemed for {voucher?.spent} MOVE</Text>
            <Button label="Done" onPress={() => setVoucher(null)} />
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  balanceCard: {
    gap: space.xs,
  },
  balanceLabel: {
    ...type.caption,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceValue: {
    ...type.display,
    color: colors.text,
  },
  filters: {
    gap: space.sm,
    paddingVertical: space.xs,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterText: {
    ...type.label,
    color: colors.muted,
  },
  filterTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  cardDim: {
    opacity: 0.65,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  category: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    maxWidth: '55%',
  },
  categoryText: {
    ...type.caption,
    color: colors.primaryDark,
  },
  cost: {
    ...type.bodyStrong,
    color: colors.text,
    flexShrink: 0,
  },
  title: {
    ...type.section,
    color: colors.text,
  },
  description: {
    ...type.label,
    color: colors.muted,
  },
  stock: {
    ...type.caption,
    color: colors.muted,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    ...type.bodyStrong,
    color: colors.text,
  },
  historyMeta: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  historySpend: {
    ...type.bodyStrong,
    color: colors.danger,
    flexShrink: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
  },
  modalCard: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: layout.cardPadding,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalEyebrow: {
    ...type.caption,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalTitle: {
    ...type.title,
    color: colors.text,
  },
  modalBody: {
    ...type.body,
    color: colors.muted,
  },
  modalPreview: {
    ...type.bodyStrong,
    color: colors.text,
    marginBottom: space.xs,
  },
  voucherCode: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  voucherCodeText: {
    ...type.bodyStrong,
    textAlign: 'center',
    color: colors.primaryDark,
  },
})
