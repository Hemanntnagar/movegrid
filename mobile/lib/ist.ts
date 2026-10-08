/** IST day boundaries — aligned with the web app streak windows. */

export const IST_OFFSET = '+05:30'

export function istDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return `${map.year}-${map.month}-${map.day}`
}

/** Start of the current IST calendar day through now (for Health Connect queries). */
export function istDayTimeRange(now = new Date()): { startTime: string; endTime: string } {
  const key = istDateKey(now)
  return {
    startTime: `${key}T00:00:00.000${IST_OFFSET}`,
    endTime: now.toISOString(),
  }
}
