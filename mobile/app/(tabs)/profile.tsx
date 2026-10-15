import { resolveApiUrl } from '@movegrid/api-client'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors, layout, radius, space, touch, type } from '@/constants/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name?.trim()?.[0] ?? 'M').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {user?.name ?? '—'}
        </Text>
        <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
          {user?.email ?? '—'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue} numberOfLines={1}>
              {user?.total_points ?? 0}
            </Text>
            <Text style={styles.statLabel}>MOVE</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue} numberOfLines={1}>
              {user?.streak ?? 0}
            </Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue} numberOfLines={1}>
              {user?.active_minutes ?? 0}
            </Text>
            <Text style={styles.statLabel}>Active min</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue} numberOfLines={1}>
              {user?.fitness_level ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>API</Text>
        <Text style={styles.apiUrl} selectable>
          {resolveApiUrl()}
        </Text>
      </View>

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    padding: layout.screenPadding,
    paddingBottom: space.xxxl,
    gap: layout.contentGap,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  name: {
    ...type.title,
    color: colors.text,
  },
  email: {
    color: colors.muted,
    ...type.body,
  },
  sectionLabel: {
    ...type.caption,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
  statCell: {
    flexGrow: 1,
    flexBasis: 140,
    maxWidth: '100%',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  statValue: {
    ...type.stat,
    color: colors.primaryDark,
  },
  statLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
  },
  apiUrl: {
    ...type.label,
    color: colors.text,
    lineHeight: 18,
  },
  signOut: {
    marginTop: 'auto',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    minHeight: touch.minHeight,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
  },
})
