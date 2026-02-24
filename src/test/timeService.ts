let timeDiff = 0

export function getCurrentTime(): number {
  return Date.now() + timeDiff
}

export function setCurrentTimeDiff(diff: number): void {
  timeDiff = diff
}

export function resetTimeDiff(): void {
  timeDiff = 0
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
