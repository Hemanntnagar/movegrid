import { resolveApiUrl } from '@movegrid/api-client'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Button, Card, ScreenScroll, SectionTitle } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { colors, radius, space, type } from '@/constants/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const { width } = useWindowDimensions()
  const narrow = width < 360

  const cells = [
    { label: 'MOVE', value: String(user?.total_points ?? 0), tone: styles.toneLime },
    { label: 'Streak', value: String(user?.streak ?? 0), tone: styles.toneOrange },
    { label: 'Active min', value: String(user?.active_minutes ?? 0), tone: styles.toneBlue },
    { label: 'Level', value: String(user?.fitness_level ?? '—'), tone: styles.tonePurple },
  ] as const

  return (
    <ScreenScroll contentStyle={styles.content}>
      <Card style={styles.profileCard}>
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
      </Card>

      <SectionTitle>Stats</SectionTitle>
      <View style={styles.statsGrid}>
        {cells.map((cell) => (
          <View key={cell.label} style={[styles.statCell, cell.tone, narrow && styles.statCellNarrow]}>
            <Text
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {cell.value}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {cell.label}
            </Text>
          </View>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionLabel}>API endpoint</Text>
        <Text style={styles.apiUrl} selectable numberOfLines={3}>
          {resolveApiUrl()}
        </Text>
      </Card>

      <Button label="Sign out" variant="danger" onPress={() => signOut()} />
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  profileCard: {
    alignItems: 'flex-start',
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
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  name: {
    ...type.title,
    color: colors.text,
  },
  email: {
    ...type.body,
    color: colors.muted,
    width: '100%',
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
  },
  statCell: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 148,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCellNarrow: {
    flexBasis: '100%',
    minWidth: 0,
  },
  toneLime: { backgroundColor: colors.accentSoft },
  toneOrange: { backgroundColor: colors.orangeSoft },
  toneBlue: { backgroundColor: colors.blueSoft },
  tonePurple: { backgroundColor: colors.purpleSoft },
  statValue: {
    ...type.stat,
    color: colors.text,
    width: '100%',
    textAlign: 'center',
  },
  statLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
    textTransform: 'uppercase',
  },
  apiUrl: {
    ...type.label,
    color: colors.text,
  },
})
