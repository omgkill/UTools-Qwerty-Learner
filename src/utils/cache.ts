export class LruCache<K, V> {
  private limit: number
  private map: Map<K, V>

  constructor(limit: number) {
    this.limit = limit
    this.map = new Map()
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (!value) return undefined
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V, onEvict?: (value: V) => void): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    }
    this.map.set(key, value)
    if (this.map.size > this.limit) {
      const firstKey = this.map.keys().next().value as K
      const firstValue = this.map.get(firstKey)
      this.map.delete(firstKey)
      if (firstValue && onEvict) {
        onEvict(firstValue)
      }
    }
  }
}
