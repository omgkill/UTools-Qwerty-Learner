import type { DictAdapter, DictMeta, WordInfo } from './types'

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
  }

  isLoaded(): boolean {
    return this._loaded
  }
}
