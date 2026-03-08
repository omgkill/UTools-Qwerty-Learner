import type { DictMeta, WordInfo } from '@/types'
import type { BaseDictAdapter } from './BaseDictAdapter'
import { CustomDictAdapter } from './adapters/CustomDictAdapter'
import { MdxDictAdapter } from './adapters/MdxDictAdapter'

const DICT_CONFIG_KEY = 'dict-service-config'

class DictService {
  private _adapters: Map<string, BaseDictAdapter> = new Map()
  private _config: { dicts: DictMeta[] } | null = null

  private _loadConfig(): { dicts: DictMeta[] } {
    if (this._config) return this._config

    if (typeof window !== 'undefined' && window.utools) {
      const doc = window.utools.db.get(DICT_CONFIG_KEY)
      if (doc && doc.data && typeof doc.data === 'object' && 'dicts' in doc.data) {
        const dicts = (doc.data as { dicts?: unknown }).dicts
        this._config = { dicts: Array.isArray(dicts) ? (dicts as DictMeta[]) : [] }
      } else {
        this._config = { dicts: [] }
      }
    } else {
      this._config = { dicts: [] }
    }

    return this._config
  }

  private _saveConfig(): void {
    if (typeof window !== 'undefined' && window.utools && this._config) {
      const doc = window.utools.db.get(DICT_CONFIG_KEY)
      window.utools.db.put({
        _id: DICT_CONFIG_KEY,
        data: this._config,
        _rev: doc ? doc._rev : undefined,
      })
    }
  }

  private async _getOrCreateAdapter(dictMeta: DictMeta): Promise<BaseDictAdapter | null> {
    let adapter = this._adapters.get(dictMeta.id)

    if (!adapter) {
      if (dictMeta.type === 'mdx' && dictMeta.path) {
        adapter = new MdxDictAdapter(dictMeta.id, dictMeta.name, dictMeta.path)
      } else if (dictMeta.type === 'custom') {
        adapter = new CustomDictAdapter(dictMeta.id, dictMeta.name)
      }

      if (adapter) {
        this._adapters.set(dictMeta.id, adapter)
      }
    }

    return adapter || null
  }

  async queryWord(word: string): Promise<WordInfo | null> {
    const config = this._loadConfig()
    const w = (word || '').trim().toLowerCase()
    if (!w) return null

    const enabledDicts = config.dicts.filter((d) => d.enabled !== false)

    for (const dictMeta of enabledDicts) {
      try {
        const adapter = await this._getOrCreateAdapter(dictMeta)
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
    const w = (word || '').trim().toLowerCase()
    if (!w) return []

    const config = this._loadConfig()
    const results: WordInfo[] = []

    const targetDicts =
      dictIds && dictIds.length > 0
        ? config.dicts.filter((d) => dictIds.includes(d.id))
        : config.dicts.filter((d) => d.enabled !== false)

    const promises = targetDicts.map(async (dictMeta) => {
      try {
        const adapter = await this._getOrCreateAdapter(dictMeta)
        if (!adapter) return null
        return await adapter.query(w)
      } catch (e) {
        console.error(`Query in dict ${dictMeta.name} failed:`, e)
        return null
      }
    })

    const queryResults = await Promise.all(promises)

    for (const result of queryResults) {
      if (result) {
        results.push(result)
      }
    }

    return results
  }

  getDictList(): DictMeta[] {
    const config = this._loadConfig()
    return config.dicts || []
  }

  async addMdxDict(filePath: string): Promise<DictMeta> {
    const config = this._loadConfig()

    const id = `mdx-${Buffer.from(filePath).toString('base64')}`
    const existing = config.dicts.find((d) => d.id === id)
    if (existing) {
      return existing
    }

    const name = filePath.split(/[/\\]/).pop()?.replace(/\.mdx$/i, '') || 'MDX Dict'

    const dictMeta: DictMeta = {
      id,
      name,
      type: 'mdx',
      path: filePath,
      enabled: true,
      order: config.dicts.length,
    }

    config.dicts.push(dictMeta)
    this._saveConfig()

    return dictMeta
  }

  async addCustomDict(
    name: string,
    jsonData: Array<{ name: string; trans: string[]; usphone?: string; ukphone?: string }>
  ): Promise<DictMeta> {
    const config = this._loadConfig()

    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const dictMeta: DictMeta = {
      id,
      name: name.trim(),
      type: 'custom',
      wordCount: jsonData.length,
      enabled: true,
      order: config.dicts.length,
    }

    if (typeof window !== 'undefined' && window.utools) {
      window.utools.db.put({
        _id: id,
        data: jsonData,
      })
    }

    config.dicts.push(dictMeta)
    this._saveConfig()

    return dictMeta
  }

  removeDict(id: string): boolean {
    const config = this._loadConfig()
    const index = config.dicts.findIndex((d) => d.id === id)

    if (index === -1) return false

    const dictMeta = config.dicts[index]
    config.dicts.splice(index, 1)
    this._saveConfig()

    this._adapters.delete(id)

    if (dictMeta.type === 'custom' && typeof window !== 'undefined' && window.utools) {
      window.utools.db.remove(id)
    }

    return true
  }

  updateDictOrder(dicts: DictMeta[]): DictMeta[] {
    const config = this._loadConfig()
    config.dicts = dicts || []
    this._saveConfig()
    return config.dicts
  }

  setDictEnabled(id: string, enabled: boolean): boolean {
    const config = this._loadConfig()
    const dictMeta = config.dicts.find((d) => d.id === id)

    if (!dictMeta) return false

    dictMeta.enabled = enabled
    this._saveConfig()

    return true
  }
}

export const dictService = new DictService()
export type { DictItem, DictMeta, DictType, WordInfo } from '@/types'
