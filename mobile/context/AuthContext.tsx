import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { movegridApi, type ApiUser } from '@movegrid/api-client'
import { clearToken, getStoredToken, storeToken } from '@/lib/tokenStorage'

type AuthState = {
  user: ApiUser | null
  token: string | null
  bootstrapping: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  const refreshUser = useCallback(async () => {
    const active = token ?? (await getStoredToken())
    if (!active) {
      setUser(null)
      return
    }
    const me = await movegridApi.me(active)
    setUser(me)
    setToken(active)
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await getStoredToken()
        if (!stored) return
        const me = await movegridApi.me(stored)
        if (!cancelled) {
          setToken(stored)
          setUser(me)
        }
      } catch {
        await clearToken()
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { access_token } = await movegridApi.login(email.trim(), password)
    await storeToken(access_token)
    const me = await movegridApi.me(access_token)
    setToken(access_token)
    setUser(me)
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await movegridApi.register(name.trim(), email.trim(), password)
    await signIn(email, password)
  }, [signIn])

  const signOut = useCallback(async () => {
    await clearToken()
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      bootstrapping,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, token, bootstrapping, signIn, signUp, signOut, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
