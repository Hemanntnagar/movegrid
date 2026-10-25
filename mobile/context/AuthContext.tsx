import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearMeCache, isAuthFailure, movegridApi, seedMeCache, type ApiUser } from '@movegrid/api-client'
import {
  clearToken,
  getStoredToken,
  getStoredUser,
  storeToken,
  storeUser,
} from '@/lib/tokenStorage'

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
    const me = await movegridApi.me(active, { force: true })
    setUser(me)
    setToken(active)
    await storeUser(me, active)
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [stored, cachedUser] = await Promise.all([getStoredToken(), getStoredUser()])
        if (!stored) return

        // Unblock UI immediately from secure snapshot; revalidate in background.
        if (cachedUser && !cancelled) {
          seedMeCache(stored, cachedUser)
          setToken(stored)
          setUser(cachedUser)
          setBootstrapping(false)
        }

        const me = await movegridApi.me(stored)
        if (!cancelled) {
          setToken(stored)
          setUser(me)
          await storeUser(me, stored)
        }
      } catch (err) {
        if (isAuthFailure(err)) {
          await clearToken()
          if (!cancelled) {
            setToken(null)
            setUser(null)
          }
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
    const session = await movegridApi.login(email.trim(), password)
    const access = session.access_token
    const nextUser = session.user ?? (await movegridApi.me(access))
    seedMeCache(access, nextUser)
    setToken(access)
    setUser(nextUser)
    // Persist in parallel after UI state updates (login payload already has user).
    await Promise.all([storeToken(access), storeUser(nextUser, access)])
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const session = await movegridApi.register(name.trim(), email.trim(), password)
    const access = session.access_token
    const nextUser = session.user ?? (await movegridApi.me(access))
    seedMeCache(access, nextUser)
    setToken(access)
    setUser(nextUser)
    await Promise.all([storeToken(access), storeUser(nextUser, access)])
  }, [])

  const signOut = useCallback(async () => {
    await clearToken()
    clearMeCache()
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
