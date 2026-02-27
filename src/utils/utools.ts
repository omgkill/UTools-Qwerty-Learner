export const setConcealFeature = () => {
  if (window.utools) {
    window.utools.setFeature({
    code: 'conceal',
    explain: '🐟背单词打字摸鱼模式，摸鱼一时爽,一直摸鱼一直爽~~',
    cmds: ['moyu', 'moyv', 'typing-摸鱼模式'],
    })
  }
}

export const VIP_STATE_KEY = 'x-vipState'

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

export const processPayment = () => {
  setUtoolsValue(VIP_STATE_KEY, 'c')
}
