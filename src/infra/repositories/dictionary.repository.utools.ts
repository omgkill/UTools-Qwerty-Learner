import type {
  DictionaryAdapterFactory,
  DictionaryActionRepository,
  DictionaryConfigRepository,
  MdxDictLoader,
  MdxDictionaryRepository,
} from '@/features/dictionary/application'
import { normalizeDictionaryConfig } from '@/features/dictionary/domain'
import type { CustomDictEntry, DictAdapter, DictMeta, DictionaryConfig, MdxDictItem, MdxQueryResult } from '@/features/dictionary/domain'
import { CustomDictAdapter, MdxDictAdapter } from '@/features/dictionary/infra/adapters'

const DICT_CONFIG_KEY = 'dict-service-config'

type UtoolsDbDoc = { _rev?: string; data?: unknown } | null
type UtoolsDb = {
  get: (id: string) => UtoolsDbDoc
  put: (doc: { _id: string; data: unknown; _rev?: string }) => { ok?: boolean }
  remove: (id: string) => { ok?: boolean }
}

function getUtoolsDb(): UtoolsDb | undefined {
  return typeof window !== 'undefined' ? window.utools?.db : undefined
}

export class UtoolsDictionaryConfigRepository implements DictionaryConfigRepository {
  loadConfig(): DictionaryConfig {
    const db = getUtoolsDb()
    if (!db) return { dicts: [] }

    const doc = db.get(DICT_CONFIG_KEY)
    return normalizeDictionaryConfig(doc?.data)
  }

  saveConfig(config: DictionaryConfig): void {
    const db = getUtoolsDb()
    if (!db) return

    const doc = db.get(DICT_CONFIG_KEY)
    db.put({
      _id: DICT_CONFIG_KEY,
      data: config,
      _rev: doc ? doc._rev : undefined,
    })
  }

  loadCustomDictEntries(id: string): CustomDictEntry[] {
    const db = getUtoolsDb()
    if (!db) return []

    const doc = db.get(id)
    return Array.isArray(doc?.data) ? (doc.data as CustomDictEntry[]) : []
  }

  saveCustomDictEntries(id: string, entries: CustomDictEntry[]): void {
    const db = getUtoolsDb()
    if (!db) return

    const doc = db.get(id)
    db.put({
      _id: id,
      data: entries,
      _rev: doc ? doc._rev : undefined,
    })
  }

  removeCustomDictEntries(id: string): void {
    getUtoolsDb()?.remove(id)
  }
}

export class UtoolsMdxDictionaryRepository implements MdxDictionaryRepository {
  listDicts(): MdxDictItem[] {
    return window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
  }

  selectDictFiles(): MdxDictItem[] | null {
    return window.selectMdxFiles?.() || window.services?.selectDictFiles?.() || null
  }

  removeDict(path: string): MdxDictItem[] {
    return window.removeMdxDict?.(path) || window.services?.removeDict?.(path) || []
  }

  updateDictOrder(dicts: MdxDictItem[]): MdxDictItem[] {
    return window.updateMdxDictOrder?.(dicts) || window.services?.updateDictOrder?.(dicts) || []
  }

  async queryWord(word: string): Promise<MdxQueryResult[]> {
    return (await window.queryMdxWord?.(word)) || (await window.services?.queryWord?.(word)) || []
  }

  async queryFirstWord(word: string): Promise<MdxQueryResult | null> {
    return (await window.queryFirstMdxWord?.(word)) || null
  }
}

export class UtoolsDictionaryActionRepository implements DictionaryActionRepository {
  getActionPayload(): string | undefined {
    const action = window.getAction?.()
    return action?.payload
  }

  subscribeModeChange(handler: (payload: string | undefined) => void): () => void {
    const handleModeChange = (e: CustomEvent) => {
      handler(e.detail?.payload)
    }

    window.addEventListener('utools-mode-change', handleModeChange as EventListener)
    return () => window.removeEventListener('utools-mode-change', handleModeChange as EventListener)
  }
}

export class UtoolsMdxDictLoader implements MdxDictLoader {
  async load(path: string) {
    return window.dictMdxLoader.load(path)
  }

  unload(path: string): void {
    window.dictMdxLoader.unload?.(path)
  }
}

export class UtoolsDictionaryAdapterFactory implements DictionaryAdapterFactory {
  constructor(private configRepository: DictionaryConfigRepository, private mdxDictLoader: MdxDictLoader) {}

  createAdapter(dictMeta: DictMeta): DictAdapter | null {
    if (dictMeta.type === 'mdx' && dictMeta.path) {
      return new MdxDictAdapter(dictMeta.id, dictMeta.name, dictMeta.path, this.mdxDictLoader)
    }

    if (dictMeta.type === 'custom') {
      return new CustomDictAdapter(dictMeta.id, dictMeta.name, [], {
        loadEntries: (id) => this.configRepository.loadCustomDictEntries(id),
        saveEntries: (id, entries) => this.configRepository.saveCustomDictEntries(id, entries),
      })
    }

    return null
  }
}

export const utoolsDictionaryConfigRepository = new UtoolsDictionaryConfigRepository()
export const utoolsMdxDictionaryRepository = new UtoolsMdxDictionaryRepository()
export const utoolsDictionaryActionRepository = new UtoolsDictionaryActionRepository()
export const utoolsMdxDictLoader = new UtoolsMdxDictLoader()
export const utoolsDictionaryAdapterFactory = new UtoolsDictionaryAdapterFactory(utoolsDictionaryConfigRepository, utoolsMdxDictLoader)
