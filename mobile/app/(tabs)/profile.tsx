import { resolveApiUrl } from '@movegrid/api-client'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.meta}>
          Level: {user?.fitness_level ?? '—'} · {user?.active_minutes ?? 0} active min
        </Text>
        <Text style={styles.meta}>
          {user?.total_points ?? 0} MOVE · streak {user?.streak ?? 0}
        </Text>
      </View>

      <Text style={styles.apiLabel}>API</Text>
      <Text style={styles.apiUrl}>{resolveApiUrl()}</Text>

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  email: { color: colors.muted },
  meta: { color: colors.text },
  apiLabel: { fontSize: 12, color: colors.muted, marginTop: 8 },
  apiUrl: { fontSize: 12, color: colors.text },
  signOut: {
    marginTop: 'auto',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
})
