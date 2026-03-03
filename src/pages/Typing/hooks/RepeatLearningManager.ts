import type { WordWithIndex } from '@/typings'
import { getTodayDate } from '@/utils/db/progress'
import { db } from '@/utils/db'

export type RepeatLearningState = {
  isRepeatLearning: boolean
  learningWords: WordWithIndex[]
  currentIndex: number
  version: number
}

export type SavedRepeatLearningState = {
  isRepeatLearning: boolean
  learningWords: unknown[]
  currentIndex: number
  dict: string
  date: string
  version: number
}

/**
 * 重复学习状态管理器（非 Hook 版本）
 * 
 * 核心设计原则：
 * 1. 单一状态源：所有状态都通过 manager 管理
 * 2. 原子操作：每次更新都是原子的，避免并发问题
 * 3. 版本控制：使用 version 检测并发更新
 * 4. 同步优先：关键操作使用同步逻辑
 */
export class RepeatLearningManager {
  private runtimeState: RepeatLearningState | null = null

  /**
   * 初始化/恢复重复学习状态
   */
  async initialize(dictId: string): Promise<RepeatLearningState | null> {
    try {
      if (!db.typingStates) {
        return null
      }

      if (this.runtimeState) {
        return this.runtimeState
      }

      const today = getTodayDate()
      const saved = await db.typingStates
        .where('[dict+date]')
        .equals([dictId, today])
        .first()

      if (!saved || saved.date !== today || saved.dict !== dictId) {
        return null
      }

      if (!saved.isRepeatLearning || !saved.learningWords || (saved.learningWords as unknown[]).length === 0) {
        return null
      }

      this.runtimeState = {
        isRepeatLearning: true,
        learningWords: saved.learningWords as WordWithIndex[],
        currentIndex: saved.currentIndex ?? 0,
        version: (saved.version ?? 0) + 1,
      }

      return this.runtimeState
    } catch (e) {
      console.error('Failed to initialize repeat learning state:', e)
      return null
    }
  }

  /**
   * 开始新的重复学习
   */
  async start(dictId: string, learningWords: WordWithIndex[]): Promise<RepeatLearningState> {
    if (!db.typingStates) {
      throw new Error('IndexedDB not available')
    }

    const today = getTodayDate()
    const newState: RepeatLearningState = {
      isRepeatLearning: true,
      learningWords,
      currentIndex: 0,
      version: 1,
    }

    this.runtimeState = newState

    const existing = await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .first()

    const record: SavedRepeatLearningState = {
      isRepeatLearning: true,
      learningWords,
      currentIndex: 0,
      dict: dictId,
      date: today,
      version: 1,
    }

    if (existing) {
      await db.typingStates.update(existing.id!, record)
    } else {
      await db.typingStates.add(record)
    }

    return newState
  }

  /**
   * 更新当前位置
   */
  async updateIndex(dictId: string, newIndex: number): Promise<void> {
    if (!this.runtimeState || !db.typingStates) {
      return
    }

    this.runtimeState.currentIndex = newIndex
    this.runtimeState.version += 1

    const currentState = { ...this.runtimeState }

    const today = getTodayDate()
    const existing = await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .first()

    if (!existing) return

    const savedVersion = existing.version ?? 0
    if (savedVersion > currentState.version) {
      console.warn('IndexedDB has newer version, skipping save')
      return
    }

    await db.typingStates.update(existing.id!, {
      ...existing,
      currentIndex: newIndex,
      version: currentState.version,
    })
  }

  /**
   * 清除重复学习状态
   */
  async clear(dictId: string): Promise<void> {
    this.runtimeState = null
    
    if (!db.typingStates) {
      return
    }

    const today = getTodayDate()
    const existing = await db.typingStates
      .where('[dict+date]')
      .equals([dictId, today])
      .first()

    if (existing) {
      await db.typingStates.update(existing.id!, {
        isRepeatLearning: false,
        learningWords: [],
        currentIndex: 0,
        version: (existing.version ?? 0) + 1,
      })
    }
  }

  /**
   * 获取当前状态（同步）
   */
  getState(): RepeatLearningState | null {
    return this.runtimeState
  }

  /**
   * 检查是否正在重复学习（同步）
   */
  isRepeatLearning(): boolean {
    return this.runtimeState?.isRepeatLearning ?? false
  }

  /**
   * 获取当前单词列表（同步）
   */
  getLearningWords(): WordWithIndex[] {
    return this.runtimeState?.learningWords ?? []
  }

  /**
   * 获取当前位置（同步）
   */
  getCurrentIndex(): number {
    return this.runtimeState?.currentIndex ?? 0
  }
}
