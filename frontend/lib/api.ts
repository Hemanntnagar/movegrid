export * from '@movegrid/api-client'

export const MOVEGRID_USER_UPDATED = 'movegrid:user-updated'

export function notifyUserUpdated(detail?: { total_points?: number }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MOVEGRID_USER_UPDATED, { detail }))
  }
}

const TOKEN_KEY = 'movegrid_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}
