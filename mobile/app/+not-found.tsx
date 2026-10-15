import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { colors, space, touch, type } from '@/constants/theme'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn’t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
    backgroundColor: colors.bg,
    gap: space.lg,
  },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
  },
  link: {
    minHeight: touch.minHeight,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
  },
})
