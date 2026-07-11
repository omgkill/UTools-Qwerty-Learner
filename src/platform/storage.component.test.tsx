import { beforeEach, describe, expect, it } from 'vitest'
import { getJSONStorageItem, getStorageValue, removeStorageValue, setJSONStorageItem, setStorageValue } from './storage'

type MockDoc = { _id: string; _rev?: string; data: unknown }

const clearUtools = () => {
  delete (window as Window & { utools?: Window['utools'] }).utools
}

const installMockUtools = () => {
  const docs = new Map<string, MockDoc>()

  window.utools = {
    setFeature: () => {},
    isDev: () => true,
    db: {
      get: (id) => docs.get(id) ?? null,
      put: (doc) => {
        docs.set(doc._id, { ...doc, _rev: doc._rev ?? `rev-${docs.size + 1}` })
        return { ok: true }
      },
      remove: (id) => {
        docs.delete(id)
        return { ok: true }
      },
    },
  }

  return docs
}

describe('platform storage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearUtools()
  })

  it('falls back to localStorage when utools db is unavailable', () => {
    setStorageValue('config', { enabled: true })

    expect(localStorage.getItem('config')).toBe('{"enabled":true}')
    expect(getStorageValue('config', { enabled: false })).toEqual({ enabled: true })

    removeStorageValue('config')
    expect(localStorage.getItem('config')).toBeNull()
  })

  it('stores JSON storage payloads in localStorage', () => {
    setJSONStorageItem('atom', '{"dailyLimit":20}')

    expect(getJSONStorageItem('atom')).toBe('{"dailyLimit":20}')
  })

  it('prefers utools db when available', () => {
    const docs = installMockUtools()

    setStorageValue('config', { enabled: true })
    setJSONStorageItem('atom', '{"dailyLimit":20}')

    expect(localStorage.getItem('config')).toBeNull()
    expect(docs.get('config')?.data).toEqual({ enabled: true })
    expect(docs.get('atom')?.data).toEqual({ dailyLimit: 20 })
    expect(getStorageValue('config', { enabled: false })).toEqual({ enabled: true })
    expect(getJSONStorageItem('atom')).toBe('{"dailyLimit":20}')
  })
})
