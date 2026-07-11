import {
  buildExpandedState,
  createCustomDictMeta,
  createMdxDictMeta,
  getTargetDicts,
  normalizeDictionaryConfig,
  normalizeQueryWord,
} from './dictionary-rules'
import type { DictMeta } from './types'
import { describe, expect, it } from 'vitest'

describe('dictionary rules', () => {
  it('normalizes query words', () => {
    expect(normalizeQueryWord('  Hello  ')).toBe('hello')
    expect(normalizeQueryWord('')).toBe('')
  })

  it('normalizes invalid dictionary config to an empty list', () => {
    expect(normalizeDictionaryConfig(null)).toEqual({ dicts: [] })
    expect(normalizeDictionaryConfig({ dicts: 'bad' })).toEqual({ dicts: [] })
  })

  it('sorts enabled target dictionaries by order', () => {
    const dicts: DictMeta[] = [
      { id: 'b', name: 'B', type: 'custom', enabled: true, order: 2 },
      { id: 'a', name: 'A', type: 'custom', enabled: true, order: 1 },
      { id: 'c', name: 'C', type: 'custom', enabled: false, order: 0 },
    ]

    expect(getTargetDicts(dicts).map((dict) => dict.id)).toEqual(['a', 'b'])
    expect(getTargetDicts(dicts, ['c', 'b']).map((dict) => dict.id)).toEqual(['c', 'b'])
  })

  it('creates dictionary meta from mdx path and custom entries', () => {
    expect(createMdxDictMeta('/tmp/Longman.mdx', 3)).toMatchObject({
      id: `mdx-${Buffer.from('/tmp/Longman.mdx').toString('base64')}`,
      name: 'Longman',
      type: 'mdx',
      path: '/tmp/Longman.mdx',
      enabled: true,
      order: 3,
    })

    expect(
      createCustomDictMeta({
        id: 'custom-id',
        name: ' My Dict ',
        entries: [{ name: 'hello', trans: ['你好'] }],
        order: 1,
      }),
    ).toEqual({
      id: 'custom-id',
      name: 'My Dict',
      type: 'custom',
      wordCount: 1,
      enabled: true,
      order: 1,
    })
  })

  it('builds expanded state and can collapse the first route result', () => {
    const results = [
      { dictPath: '/a.mdx', dictName: 'A', ok: true, content: '<p>A</p>' },
      { dictPath: '/b.mdx', dictName: 'B', ok: true, content: '<p>B</p>' },
      { dictPath: '/c.mdx', dictName: 'C', ok: false },
    ]

    expect(buildExpandedState(results, false)).toEqual({
      '/a.mdx': true,
      '/b.mdx': true,
    })
    expect(buildExpandedState(results, true)).toEqual({
      '/a.mdx': false,
      '/b.mdx': true,
    })
  })
})
