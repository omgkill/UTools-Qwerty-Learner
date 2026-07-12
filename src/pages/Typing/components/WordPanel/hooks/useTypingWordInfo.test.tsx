// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listMdxDicts, queryFirstMdxWord } from '@/features/dictionary/application/use-cases'
import { parseMdxEntry } from '@/utils/mdxParser'
import type { WordWithIndex } from '@/typings'
import { useTypingWordInfo } from './useTypingWordInfo'

vi.mock('@/features/dictionary/application/use-cases', () => ({
  listMdxDicts: vi.fn(),
  queryFirstMdxWord: vi.fn(),
}))

vi.mock('@/utils/mdxParser', () => ({
  parseMdxEntry: vi.fn(),
}))

vi.mock('@/infra/repositories/dictionary.repository.utools', () => ({
  utoolsMdxDictionaryRepository: {},
}))

function createWord(name: string, index: number): WordWithIndex {
  return {
    name,
    index,
    trans: [`${name}-trans`],
    usphone: `${name}-us`,
    ukphone: `${name}-uk`,
  }
}

describe('useTypingWordInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listMdxDicts).mockReturnValue([{ id: 'dict-1' }] as never)
  })

  it('queries mdx data and dispatches word info updates', async () => {
    vi.mocked(queryFirstMdxWord).mockResolvedValue({
      ok: true,
      content: '<entry />',
    } as never)
    vi.mocked(parseMdxEntry).mockReturnValue({
      translations: ['updated-trans'],
      phonetics: { uk: 'updated-uk' },
      tense: 'updated-tense',
    } as never)

    const updateWordInfo = vi.fn()
    const currentWord = createWord('alpha', 0)

    const { result } = renderHook(() =>
      useTypingWordInfo({
        currentWord,
        prevWord: undefined,
        nextWord: undefined,
        wordInfoMap: {},
        updateWordInfo,
      }),
    )

    await waitFor(() => {
      expect(queryFirstMdxWord).toHaveBeenCalledWith({}, 'alpha')
    })

    expect(updateWordInfo).toHaveBeenCalledWith('alpha', {
      trans: ['updated-trans'],
      ukphone: 'updated-uk',
      tense: 'updated-tense',
    })
    expect(result.current.displayTrans).toEqual(['alpha-trans'])
    expect(result.current.displayUkphone).toBe('alpha-uk')
  })

  it('uses enriched word info from state and skips querying complete entries', async () => {
    const currentWord = createWord('beta', 1)

    const { result } = renderHook(() =>
      useTypingWordInfo({
        currentWord,
        prevWord: undefined,
        nextWord: undefined,
        wordInfoMap: {
          beta: {
            trans: ['from-state'],
            ukphone: 'state-uk',
            tense: 'state-tense',
          },
        },
        updateWordInfo: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(listMdxDicts).toHaveBeenCalled()
    })

    expect(queryFirstMdxWord).not.toHaveBeenCalled()
    expect(result.current.displayTrans).toEqual(['from-state'])
    expect(result.current.displayUkphone).toBe('state-uk')
    expect(result.current.displayTense).toBe('state-tense')
    expect(result.current.wordWithInfo?.tense).toBe('state-tense')
  })
})
