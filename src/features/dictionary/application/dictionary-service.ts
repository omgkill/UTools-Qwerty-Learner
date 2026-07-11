import { createCustomDictMeta, createMdxDictMeta, getTargetDicts, normalizeQueryWord } from '../domain'
import type { CustomDictEntry, DictAdapter, DictMeta, WordInfo } from '../domain'
import type { DictionaryAdapterFactory, DictionaryConfigRepository } from './ports'

type DictionaryServiceDeps = {
  configRepository: DictionaryConfigRepository
  adapterFactory: DictionaryAdapterFactory
  createId?: () => string
}

export class DictionaryService {
  private adapters: Map<string, DictAdapter> = new Map()
  private createId: () => string

  constructor(private deps: DictionaryServiceDeps) {
    this.createId = deps.createId ?? (() => `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  }

  private async getOrCreateAdapter(dictMeta: DictMeta): Promise<DictAdapter | null> {
    let adapter = this.adapters.get(dictMeta.id)

    if (!adapter) {
      adapter = this.deps.adapterFactory.createAdapter(dictMeta) ?? undefined

      if (adapter) {
        this.adapters.set(dictMeta.id, adapter)
      }
    }

    return adapter || null
  }

  async queryWord(word: string): Promise<WordInfo | null> {
    const w = normalizeQueryWord(word)
    if (!w) return null

    const config = this.deps.configRepository.loadConfig()
    const enabledDicts = getTargetDicts(config.dicts)

    for (const dictMeta of enabledDicts) {
      try {
        const adapter = await this.getOrCreateAdapter(dictMeta)
        if (!adapter) continue

        const result = await adapter.query(w)
        if (result) {
          return result
        }
      } catch (e) {
        console.error(`Query in dict ${dictMeta.name} failed:`, e)
      }
    }

    return null
  }

  async queryWordInDicts(word: string, dictIds?: string[]): Promise<WordInfo[]> {
    const w = normalizeQueryWord(word)
    if (!w) return []

    const config = this.deps.configRepository.loadConfig()
    const targetDicts = getTargetDicts(config.dicts, dictIds)

    const queryResults = await Promise.all(
      targetDicts.map(async (dictMeta) => {
        try {
          const adapter = await this.getOrCreateAdapter(dictMeta)
          if (!adapter) return null
          return await adapter.query(w)
        } catch (e) {
          console.error(`Query in dict ${dictMeta.name} failed:`, e)
          return null
        }
      }),
    )

    return queryResults.filter((result): result is WordInfo => Boolean(result))
  }

  getDictList(): DictMeta[] {
    return this.deps.configRepository.loadConfig().dicts || []
  }

  async addMdxDict(filePath: string): Promise<DictMeta> {
    const config = this.deps.configRepository.loadConfig()
    const dictMeta = createMdxDictMeta(filePath, config.dicts.length)
    const existing = config.dicts.find((dict) => dict.id === dictMeta.id)
    if (existing) return existing

    config.dicts.push(dictMeta)
    this.deps.configRepository.saveConfig(config)

    return dictMeta
  }

  async addCustomDict(name: string, jsonData: CustomDictEntry[]): Promise<DictMeta> {
    const config = this.deps.configRepository.loadConfig()
    const dictMeta = createCustomDictMeta({
      id: this.createId(),
      name,
      entries: jsonData,
      order: config.dicts.length,
    })

    this.deps.configRepository.saveCustomDictEntries(dictMeta.id, jsonData)
    config.dicts.push(dictMeta)
    this.deps.configRepository.saveConfig(config)

    return dictMeta
  }

  removeDict(id: string): boolean {
    const config = this.deps.configRepository.loadConfig()
    const index = config.dicts.findIndex((dict) => dict.id === id)

    if (index === -1) return false

    const dictMeta = config.dicts[index]
    config.dicts.splice(index, 1)
    this.deps.configRepository.saveConfig(config)

    this.adapters.delete(id)

    if (dictMeta.type === 'custom') {
      this.deps.configRepository.removeCustomDictEntries(id)
    }

    return true
  }

  updateDictOrder(dicts: DictMeta[]): DictMeta[] {
    const config = this.deps.configRepository.loadConfig()
    config.dicts = dicts || []
    this.deps.configRepository.saveConfig(config)
    return config.dicts
  }

  setDictEnabled(id: string, enabled: boolean): boolean {
    const config = this.deps.configRepository.loadConfig()
    const dictMeta = config.dicts.find((dict) => dict.id === id)

    if (!dictMeta) return false

    dictMeta.enabled = enabled
    this.deps.configRepository.saveConfig(config)

    return true
  }
}
