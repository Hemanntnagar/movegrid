import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, space.xxl),
            paddingBottom: Math.max(insets.bottom, space.xxl),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.form, { width: formWidth }]}>
          <View style={styles.header}>
            <Text style={styles.brand}>MOVEGRID</Text>
            <Text style={styles.subtitle}>Move more. Earn MOVE. Stay on streak.</Text>
          </View>

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

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={submit}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchHit}
            hitSlop={8}
            onPress={() => {
              setError(null)
              setMode(mode === 'login' ? 'signup' : 'login')
            }}>
            <Text style={styles.switch}>
              {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  form: {
    gap: space.md,
    alignSelf: 'center',
  },
  header: {
    gap: space.sm,
    marginBottom: space.sm,
  },
  brand: {
    ...type.hero,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: colors.text,
    minHeight: touch.minHeight,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touch.minHeight,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xs,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  error: {
    color: colors.danger,
    ...type.label,
    lineHeight: 18,
  },
  switchHit: {
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  switch: {
    color: colors.primaryDark,
    textAlign: 'center',
    ...type.bodyStrong,
    lineHeight: 22,
  },
})
