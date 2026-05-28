import type { IProgressRepository } from '../interfaces/IProgressRepository'
import type { WordProgress } from '../../types/learning'

const STORAGE_KEY_PREFIX = 'qwerty-progress:'

/**
 * localStorage 进度存储实现
 */
export class LocalStorageProgressRepository implements IProgressRepository {
  private getKey(dictId: string, word: string): string {
    return `${STORAGE_KEY_PREFIX}${dictId}:${word}`
  }

  get(dictId: string, word: string): WordProgress | null {
    const key = this.getKey(dictId, word)
    const data = localStorage.getItem(key)
    if (!data) return null
    try {
      return JSON.parse(data) as WordProgress
    } catch {
      return null
    }
  }

  set(dictId: string, word: string, progress: WordProgress): void {
    const key = this.getKey(dictId, word)
    localStorage.setItem(key, JSON.stringify(progress))
  }

  getAll(dictId: string): WordProgress[] {
    const results: WordProgress[] = []
    const prefix = `${STORAGE_KEY_PREFIX}${dictId}:`

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            results.push(JSON.parse(data) as WordProgress)
          } catch {
            // 跳过解析失败的项
          }
        }
      }
    }

    return results
  }

  exists(dictId: string, word: string): boolean {
    return this.get(dictId, word) !== null
  }

  clear(dictId: string): void {
    const prefix = `${STORAGE_KEY_PREFIX}${dictId}:`
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }
}