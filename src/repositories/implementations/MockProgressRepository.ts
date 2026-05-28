import type { IProgressRepository } from '../interfaces/IProgressRepository'
import type { WordProgress } from '../../types/learning'

/**
 * 内存进度存储实现（用于测试）
 */
export class MockProgressRepository implements IProgressRepository {
  private store: Map<string, WordProgress> = new Map()

  private getKey(dictId: string, word: string): string {
    return `${dictId}:${word}`
  }

  get(dictId: string, word: string): WordProgress | null {
    const key = this.getKey(dictId, word)
    return this.store.get(key) || null
  }

  set(dictId: string, word: string, progress: WordProgress): void {
    const key = this.getKey(dictId, word)
    this.store.set(key, progress)
  }

  getAll(dictId: string): WordProgress[] {
    const results: WordProgress[] = []
    for (const [key, progress] of this.store.entries()) {
      if (key.startsWith(`${dictId}:`)) {
        results.push(progress)
      }
    }
    return results
  }

  exists(dictId: string, word: string): boolean {
    return this.store.has(this.getKey(dictId, word))
  }

  clear(dictId: string): void {
    const keysToRemove: string[] = []
    for (const key of this.store.keys()) {
      if (key.startsWith(`${dictId}:`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => this.store.delete(key))
  }

  /**
   * 清空所有数据（测试用）
   */
  clearAll(): void {
    this.store.clear()
  }

  /**
   * 获取存储大小（测试用）
   */
  size(): number {
    return this.store.size
  }
}