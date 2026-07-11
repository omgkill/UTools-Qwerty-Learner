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

export interface DictionaryConfig {
  dicts: DictMeta[]
}

export type CustomDictEntry = {
  name: string
  trans: string[]
  usphone?: string
  ukphone?: string
}

export interface MdxDictItem {
  path: string
  name: string
}

export interface MdxQueryResult {
  dictPath: string
  dictName: string
  ok: boolean
  content?: string
  error?: string
}
