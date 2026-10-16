import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, ErrorBanner } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { colors, layout, radius, space, touch, type } from '@/constants/theme'

export default function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const formWidth = Math.min(width - layout.screenPadding * 2, layout.maxContentWidth)

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(name, email, password)
      } else {
        await signIn(email, password)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, space.xxl),
            paddingBottom: Math.max(insets.bottom, space.xxl),
          },
        ]}>
        <View style={[styles.formWrap, { width: formWidth }]}>
          <View style={styles.brandBlock}>
            <View style={styles.mark}>
              <Text style={styles.markText}>M</Text>
            </View>
            <Text style={styles.brand}>MOVEGRID</Text>
            <Text style={styles.subtitle}>
              {mode === 'signup'
                ? 'Create an account to earn MOVE and build your streak.'
                : 'Sign in to track steps, finish exercises, and climb standings.'}
            </Text>
          </View>

          <Card style={styles.card}>
            {mode === 'signup' ? (
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                autoCorrect={false}
                value={name}
                onChangeText={setName}
              />
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (8+ characters)"
              placeholderTextColor={colors.muted}
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />

            {error ? <ErrorBanner message={error} /> : null}

            <Button
              label={mode === 'login' ? 'Sign in' : 'Create account'}
              busy={busy}
              onPress={submit}
            />

            <Button
              variant="ghost"
              label={
                mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'
              }
              onPress={() => {
                setError(null)
                setMode(mode === 'login' ? 'signup' : 'login')
              }}
            />
          </Card>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  formWrap: {
    gap: space.xl,
    alignSelf: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    gap: space.sm,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  brand: {
    ...type.hero,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    gap: space.md,
  },
  input: {
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: colors.text,
    minHeight: touch.minHeight,
  },
})
