import type { MdxDictionaryRepository } from '../ports'
import { queryMdxWord } from './query-mdx-word'
import { describe, expect, it, vi } from 'vitest'

describe('queryMdxWord', () => {
  it('returns empty results without calling repository for empty words', async () => {
    const repository: MdxDictionaryRepository = {
      listDicts: vi.fn(),
      selectDictFiles: vi.fn(),
      removeDict: vi.fn(),
      updateDictOrder: vi.fn(),
      queryWord: vi.fn(),
      queryFirstWord: vi.fn(),
    }

    await expect(queryMdxWord(repository, '   ')).resolves.toEqual([])
    expect(repository.queryWord).not.toHaveBeenCalled()
  })

  it('trims words before querying repository', async () => {
    const repository: MdxDictionaryRepository = {
      listDicts: vi.fn(),
      selectDictFiles: vi.fn(),
      removeDict: vi.fn(),
      updateDictOrder: vi.fn(),
      queryWord: vi.fn().mockResolvedValue([{ dictPath: '/a.mdx', dictName: 'A', ok: true, content: '<p>hello</p>' }]),
      queryFirstWord: vi.fn(),
    }

    await expect(queryMdxWord(repository, '  hello  ')).resolves.toEqual([
      { dictPath: '/a.mdx', dictName: 'A', ok: true, content: '<p>hello</p>' },
    ])
    expect(repository.queryWord).toHaveBeenCalledWith('hello')
  })
})
