import type { DictMeta, WordInfo } from '../types'
import { BaseDictAdapter } from '../BaseDictAdapter'

type CustomDictEntry = { name: string; trans: string[]; usphone?: string; ukphone?: string }

export class CustomDictAdapter extends BaseDictAdapter {
  type = 'custom' as const
  private _data: CustomDictEntry[] = []

  constructor(id: string, name: string, data?: CustomDictEntry[]) {
    super()
    this._id = id
    this._name = name
    this._data = data || []
  }

  async load(): Promise<void> {
    if (this._loaded) return

    if (typeof window !== 'undefined' && window.utools) {
      const doc = window.utools.db.get(this._id)
      if (doc && Array.isArray(doc.data)) {
        this._data = doc.data as CustomDictEntry[]
      }
    }

    this._loaded = true
  }

  async query(word: string): Promise<WordInfo | null> {
    if (!this._loaded) {
      await this.load()
    }

    const normalizedWord = word.toLowerCase().trim()
    const found = this._data.find(
      (item) => item.name && item.name.toLowerCase().trim() === normalizedWord
    )

    if (!found) return null

    return {
      word: found.name,
      phonetics: {
        us: found.usphone || '',
        uk: found.ukphone || '',
      },
      translations: found.trans || [],
      definitions: undefined,
      source: {
        dictId: this._id,
        dictName: this._name,
        dictType: 'custom',
      },
    }
  }

  getMeta(): DictMeta {
    return {
      id: this._id,
      name: this._name,
      type: 'custom',
      wordCount: this._data.length,
      enabled: true,
      order: 0,
    }
  }

  getData() {
    return this._data
  }

  setData(data: typeof this._data) {
    this._data = data
    if (typeof window !== 'undefined' && window.utools) {
      const doc = window.utools.db.get(this._id)
      window.utools.db.put({
        _id: this._id,
        data: data,
        _rev: doc ? doc._rev : undefined,
      })
    }
  }
}
