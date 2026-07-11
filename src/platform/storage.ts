const hasWindow = () => typeof window !== 'undefined'

const getUtoolsDb = () => {
  if (!hasWindow()) return undefined
  return window.utools?.db
}

const parseJSON = <T>(raw: string | null, fallback: T): T => {
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const isUtoolsStorageAvailable = () => Boolean(getUtoolsDb())

export const getStorageValue = <T>(key: string, fallback: T): T => {
  if (!hasWindow()) return fallback

  const utoolsDb = getUtoolsDb()
  if (utoolsDb) {
    const doc = utoolsDb.get(key)
    if (!doc || doc.data === undefined) return fallback
    return doc.data as T
  }

  try {
    return parseJSON(localStorage.getItem(key), fallback)
  } catch {
    return fallback
  }
}

export const setStorageValue = <T>(key: string, value: T) => {
  if (!hasWindow()) return

  const utoolsDb = getUtoolsDb()
  if (utoolsDb) {
    const doc = utoolsDb.get(key)
    utoolsDb.put({
      _id: key,
      data: value,
      _rev: doc ? doc._rev : undefined,
    })
    return
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const removeStorageValue = (key: string) => {
  if (!hasWindow()) return

  const utoolsDb = getUtoolsDb()
  if (utoolsDb) {
    utoolsDb.remove(key)
    return
  }

  try {
    localStorage.removeItem(key)
  } catch {}
}

export const getJSONStorageItem = (key: string): string | null => {
  if (!hasWindow()) return null

  const utoolsDb = getUtoolsDb()
  if (utoolsDb) {
    const doc = utoolsDb.get(key)
    if (!doc || doc.data === undefined) return null
    try {
      return JSON.stringify(doc.data)
    } catch {
      return null
    }
  }

  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const setJSONStorageItem = (key: string, rawValue: string) => {
  if (!hasWindow()) return

  const utoolsDb = getUtoolsDb()
  if (utoolsDb) {
    let parsed: unknown = rawValue
    try {
      parsed = JSON.parse(rawValue)
    } catch {
      parsed = rawValue
    }
    const doc = utoolsDb.get(key)
    utoolsDb.put({
      _id: key,
      data: parsed,
      _rev: doc ? doc._rev : undefined,
    })
    return
  }

  try {
    localStorage.setItem(key, rawValue)
  } catch {}
}
