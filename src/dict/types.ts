export type DictType = 'mdx' | 'custom' | 'online'

export interface WordInfo {
  word: string
  phonetics: {
    us?: string
    uk?: string
  }
  translations: string[]
  definitions?: string
  source: {
    dictId: string
    dictName: string
    dictType: DictType
  }
}

export interface DictMeta {
  id: string
  name: string
  type: DictType
  path?: string
  wordCount?: number
  enabled: boolean
  order: number
}

export interface DictAdapter {
  type: DictType
  load(): Promise<void>
  query(word: string): Promise<WordInfo | null>
  getMeta(): DictMeta
  unload(): void
  isLoaded(): boolean
}
