import type { WordProgress } from '../../types/learning'

/**
 * 进度存储接口
 */
export interface IProgressRepository {
  /**
   * 获取单个单词进度
   */
  get(dictId: string, word: string): WordProgress | null

  /**
   * 设置单个单词进度
   */
  set(dictId: string, word: string, progress: WordProgress): void

  /**
   * 获取词库所有进度
   */
  getAll(dictId: string): WordProgress[]

  /**
   * 判断单词是否有进度记录
   */
  exists(dictId: string, word: string): boolean

  /**
   * 清空词库进度
   */
  clear(dictId: string): void
}