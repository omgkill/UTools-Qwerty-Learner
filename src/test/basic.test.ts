import { describe, expect, it } from 'vitest'
import clamp from '@/utils/clamp'
import groupBy from '@/utils/groupBy'
import shuffle from '@/utils/shuffle'
import range from '@/utils/range'
import { getUTCUnixTimestamp } from '@/utils'

describe('clamp', () => {
  it('should return value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('should return min when value is below range', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
  })

  it('should return max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('should handle equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })
})

describe('groupBy', () => {
  it('should group items by key', () => {
    const items = [{ type: 'a' }, { type: 'b' }, { type: 'a' }]
    const result = groupBy(items, (i) => i.type)
    expect(result['a']).toHaveLength(2)
    expect(result['b']).toHaveLength(1)
  })

  it('should return empty object for empty array', () => {
    expect(groupBy([], (i: { k: string }) => i.k)).toEqual({})
  })
})

describe('shuffle', () => {
  it('should return array with same elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle([...arr])
    expect(result.sort()).toEqual(arr.sort())
  })

  it('should handle empty array', () => {
    expect(shuffle([])).toEqual([])
  })

  it('should handle single element', () => {
    expect(shuffle([42])).toEqual([42])
  })
})

describe('range', () => {
  it('should generate range from 0 to n', () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4])
  })

  it('should generate range with start and end', () => {
    expect(range(2, 5)).toEqual([2, 3, 4])
  })

  it('should return empty array for zero length', () => {
    expect(range(0)).toEqual([])
  })
})

describe('getUTCUnixTimestamp', () => {
  it('should return current unix timestamp in seconds', () => {
    const before = Math.floor(Date.now() / 1000)
    const ts = getUTCUnixTimestamp()
    const after = Math.floor(Date.now() / 1000)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})
