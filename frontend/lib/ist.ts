// Helper functions for Indian Standard Time (IST) calculations and date formatting

export function getIstParts(date = new Date()) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }
  const formatter = new Intl.DateTimeFormat('en-US', options)
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10)

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  }
}

export function daysInIstMonth(date = new Date()): number {
  const { year, month } = getIstParts(date)
  return new Date(year, month, 0).getDate()
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function istDateKey(date = new Date()): string {
  const { year, month, day } = getIstParts(date)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function istDateKeyFromIso(iso: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return istDateKey(d)
}

export function istMonthKey(date = new Date()): string {
  const { year, month } = getIstParts(date)
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}`
}

export function monthLabelIst(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric',
  })
  return formatter.format(date)
}
