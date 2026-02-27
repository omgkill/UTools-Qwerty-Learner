let timeDiff = 0

export function now(): number {
  return Date.now() + timeDiff
}

export function getCurrentDate(): Date {
  return new Date(now())
}

export function getTodayString(): string {
  const date = new Date(now())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayStartTime(): number {
  const date = new Date(now())
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function getTomorrowDateString(): string {
  const date = new Date(now())
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function setTimeTo(date: Date | string | number): void {
  const targetTime = typeof date === 'string' ? new Date(date).getTime() : typeof date === 'number' ? date : date.getTime()
  timeDiff = targetTime - Date.now()
}

export function advanceTime(ms: number): void {
  timeDiff += ms
}

export function advanceDays(days: number): void {
  timeDiff += days * 24 * 60 * 60 * 1000
}

export function resetTimeDiff(): void {
  timeDiff = 0
}
