import * as SecureStore from 'expo-secure-store'
import type { ApiUser } from '@movegrid/api-client'
import { clearMeCache, seedMeCache } from '@movegrid/api-client'

const TOKEN_KEY = 'movegrid_token'
const USER_KEY = 'movegrid_user_snapshot'

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined),
  ])
  clearMeCache()
}

/** Non-credential profile snapshot for faster cold start (revalidated against /auth/me). */
export async function getStoredUser(): Promise<ApiUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ApiUser
  } catch {
    return null
  }
}

export async function storeUser(user: ApiUser, token?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
    if (token) seedMeCache(token, user)
  } catch {
    /* SecureStore may fail on web; non-fatal */
  }
}
