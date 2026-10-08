import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import 'react-native-reanimated'

import { AuthProvider, useAuth } from '@/context/AuthContext'
import { colors } from '@/constants/theme'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (bootstrapping) return
    const inAuth = segments[0] === 'login'
    if (!user && !inAuth) {
      router.replace('/login')
    } else if (user && inAuth) {
      router.replace('/(tabs)')
    }
  }, [user, bootstrapping, segments, router])

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <AuthProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGate>
    </AuthProvider>
  )
}
