import type { CustomDictEntry, DictAdapter, DictMeta, DictionaryConfig, MdxDictItem, MdxQueryResult } from '../domain'

export interface DictionaryConfigRepository {
  loadConfig(): DictionaryConfig
  saveConfig(config: DictionaryConfig): void
  loadCustomDictEntries(id: string): CustomDictEntry[]
  saveCustomDictEntries(id: string, entries: CustomDictEntry[]): void
  removeCustomDictEntries(id: string): void
}

export interface DictionaryAdapterFactory {
  createAdapter(dictMeta: DictMeta): DictAdapter | null
}

export type MdxDictLoaderResult = {
  mdxLookup: (word: string) => Promise<string[]>
  mddLookup?: ((resource: string) => Promise<Buffer>) | null
}

export interface MdxDictLoader {
  load(path: string): Promise<MdxDictLoaderResult>
  unload?(path: string): void
}

export interface MdxDictionaryRepository {
  listDicts(): MdxDictItem[]
  selectDictFiles(): MdxDictItem[] | null
  removeDict(path: string): MdxDictItem[]
  updateDictOrder(dicts: MdxDictItem[]): MdxDictItem[]
  queryWord(word: string): Promise<MdxQueryResult[]>
  queryFirstWord(word: string): Promise<MdxQueryResult | null>
}

export interface DictionaryActionRepository {
  getActionPayload(): string | undefined
  subscribeModeChange(handler: (payload: string | undefined) => void): () => void
}
