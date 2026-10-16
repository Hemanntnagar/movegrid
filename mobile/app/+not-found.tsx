import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/ui'
import { colors, space, type } from '@/constants/theme'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" asChild>
          <Button label="Go to home" />
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
})
