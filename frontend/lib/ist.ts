/** India Standard Time helpers for daily level windows. */

export const IST_TIMEZONE = 'Asia/Kolkata'

export type IstParts = {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

export function getIstParts(date: Date = new Date()): IstParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === '24' ? '0' : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

export function istDateKey(date: Date = new Date()): string {
  const { year, month, day } = getIstParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function istMonthKey(date: Date = new Date()): string {
  const { year, month } = getIstParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

export function daysInIstMonth(date: Date = new Date()): number {
  const { year, month } = getIstParts(date)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function monthLabelIst(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Parse an API timestamp and return its IST calendar day key. */
export function istDateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null
  const parsed = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return istDateKey(parsed)
}

export function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}
