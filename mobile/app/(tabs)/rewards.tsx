import {
  movegridApi,
  seedMeCache,
  type ApiReward,
  type ApiRewardRedemption,
} from '@movegrid/api-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors, layout, radius, space, touch, type } from '@/constants/theme'

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>MOVE balance</Text>
          <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

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
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{cat}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No rewards in this category yet.</Text>
          </View>
        ) : (
          filtered.map((reward) => {
            const available = reward.stock > 0
            const canAfford = balance >= reward.points_required
            const disabled = !available || !canAfford || redeeming
            return (
              <View key={reward.id} style={[styles.card, !available && styles.cardDim]}>
                <View style={styles.cardTop}>
                  <Text style={styles.category}>{reward.category}</Text>
                  <Text style={styles.cost}>{reward.points_required.toLocaleString()} MOVE</Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>
                  {reward.title}
                </Text>
                <Text style={styles.description} numberOfLines={3}>
                  {reward.description}
                </Text>
                <Text style={styles.stock}>
                  {available ? `${reward.stock} in stock` : 'Out of stock'}
                </Text>
                <Pressable
                  style={[styles.redeemBtn, disabled && styles.redeemBtnDisabled]}
                  disabled={disabled}
                  onPress={() => onRedeemPress(reward)}>
                  <Text style={styles.redeemText}>
                    {!available ? 'Unavailable' : !canAfford ? 'Not enough MOVE' : 'Redeem'}
                  </Text>
                </Pressable>
              </View>
            )
          })
        )}

        <Text style={styles.sectionTitle}>Your redemptions</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No redemptions yet — your first swap shows up here.</Text>
          </View>
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
              <Text style={styles.historySpend}>−{item.points_spent.toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={Boolean(confirm)} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Confirm redemption</Text>
            <Text style={styles.modalTitle}>{confirm?.title}</Text>
            <Text style={styles.modalBody}>
              Spend {confirm?.points_required.toLocaleString()} MOVE from your {balance.toLocaleString()}{' '}
              balance.
            </Text>
            <Text style={styles.modalPreview}>
              New balance:{' '}
              {confirm ? (balance - confirm.points_required).toLocaleString() : '—'} MOVE
            </Text>
            <Pressable
              style={[styles.redeemBtn, redeeming && styles.redeemBtnDisabled]}
              disabled={redeeming}
              onPress={confirmRedeem}>
              <Text style={styles.redeemText}>{redeeming ? 'Redeeming…' : 'Confirm redeem'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} disabled={redeeming} onPress={() => setConfirm(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(voucher)} transparent animationType="fade" onRequestClose={() => setVoucher(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Voucher unlocked</Text>
            <Text style={styles.modalTitle}>{voucher?.title}</Text>
            <Text style={styles.modalBody}>Show this code at the partner store or venue.</Text>
            <Text style={styles.voucherCode}>VOUCHER #{voucher?.id}-MOVEGRID</Text>
            <Text style={styles.modalPreview}>Redeemed for {voucher?.spent} MOVE</Text>
            <Pressable style={styles.redeemBtn} onPress={() => setVoucher(null)}>
              <Text style={styles.redeemText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  balanceCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    marginBottom: space.xs,
  },
  balanceLabel: {
    ...type.caption,
    color: '#99f6e4',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceValue: {
    ...type.display,
    color: colors.white,
    marginTop: space.xs,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  error: { ...type.label, color: colors.danger },
  filters: { gap: space.sm, paddingVertical: space.xs },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: 999,
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
  filterText: { ...type.label, color: colors.muted },
  filterTextActive: { color: colors.primaryDark, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  cardDim: { opacity: 0.65 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  category: {
    ...type.caption,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
  },
  cost: { ...type.bodyStrong, color: colors.text },
  title: { ...type.section, color: colors.text },
  description: { ...type.label, color: colors.muted, lineHeight: 18 },
  stock: { ...type.caption, color: colors.muted },
  redeemBtn: {
    minHeight: touch.minHeight,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xs,
  },
  redeemBtnDisabled: { opacity: 0.5 },
  redeemText: { ...type.bodyStrong, color: colors.white },
  sectionTitle: {
    ...type.section,
    color: colors.text,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { ...type.label, color: colors.muted },
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
  historyBody: { flex: 1, minWidth: 0 },
  historyTitle: { ...type.bodyStrong, color: colors.text },
  historyMeta: { ...type.caption, color: colors.muted, marginTop: 2 },
  historySpend: { ...type.bodyStrong, color: colors.danger },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
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
  },
  modalEyebrow: {
    ...type.caption,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  modalTitle: { ...type.title, color: colors.text },
  modalBody: { ...type.body, color: colors.muted },
  modalPreview: { ...type.bodyStrong, color: colors.text, marginBottom: space.xs },
  voucherCode: {
    ...type.bodyStrong,
    textAlign: 'center',
    paddingVertical: space.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    color: colors.primaryDark,
  },
  cancelBtn: {
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...type.bodyStrong, color: colors.muted },
})
