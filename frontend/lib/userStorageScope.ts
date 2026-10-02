import { getStoredToken } from './api'

/** User id from JWT `sub` — used to scope localStorage per account on shared devices. */
export function getStoredUserId(): number | null {
  const token = getStoredToken()
  if (!token) return null
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { sub?: string | number }
    const sub = payload.sub
    if (sub != null && /^\d+$/.test(String(sub))) return Number(sub)
  } catch {
    // ignore malformed token
  }
  return null
}

export function userStorageInfix(): string {
  const id = getStoredUserId()
  return id != null ? `u${id}_` : ''
}
