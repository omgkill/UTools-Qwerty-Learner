import type { DictAdapter, DictMeta, WordInfo } from '@/types'

export abstract class BaseDictAdapter implements DictAdapter {
  type: 'mdx' | 'custom' | 'online' = 'custom'
  protected _loaded = false
  protected _id = ''
  protected _name = ''

  abstract load(): Promise<void>
  abstract query(word: string): Promise<WordInfo | null>
  abstract getMeta(): DictMeta

  unload(): void {
    this._loaded = false
    // 子类应重写此方法以清理具体资源（如 _mdxLookup、_mddLookup 等引用）
  }

  isLoaded(): boolean {
    return this._loaded
  }
}
