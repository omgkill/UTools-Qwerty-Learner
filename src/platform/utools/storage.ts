export const getUtoolsValue = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  const utoolsDb = window.utools?.db
  if (!utoolsDb) return fallback
  const doc = utoolsDb.get(key)
  if (!doc || doc.data === undefined) return fallback
  return doc.data as T
}

export const setUtoolsValue = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  const utoolsDb = window.utools?.db
  if (!utoolsDb) return
  const doc = utoolsDb.get(key)
  utoolsDb.put({
    _id: key,
    data: value,
    _rev: doc ? doc._rev : undefined,
  })
}
