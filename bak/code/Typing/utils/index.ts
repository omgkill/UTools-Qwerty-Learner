export { loadWordList } from './wordListLoader'

export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const result = [...array]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff
    const j = hash % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}
