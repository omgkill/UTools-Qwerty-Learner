import { describe, expect, it } from 'vitest'
import {
  getNormalTypingWordListKey,
  shouldRetryNormalTypingWordList,
} from './normal-typing-session.adapter'
import type { WordBank, WordWithIndex } from '@/typings'

function createWordBank(overrides: Partial<WordBank> = {}): WordBank {
  return {
    id: 'dict-1',
    name: 'Test Bank',
    description: '',
    category: 'test',
    tags: [],
    url: '/dicts/test.json',
    length: 100,
    language: 'en',
    languageCategory: 'en',
    chapterCount: 1,
    ...overrides,
  }
}

function createWord(name: string, index: number): WordWithIndex {
  return {
    name,
    index,
    trans: [],
    usphone: '',
    ukphone: '',
  }
}

describe('normal typing session adapter helpers', () => {
  it('builds a stable swr key from the current word bank', () => {
    const wordBank = createWordBank()

    expect(getNormalTypingWordListKey(null)).toBeNull()
    expect(getNormalTypingWordListKey(wordBank)).toEqual(['typing-word-list', wordBank])
  })

  it('retries an empty word list only once for a non-empty word bank', () => {
    const wordBank = createWordBank()

    expect(
      shouldRetryNormalTypingWordList({
        currentWordBank: wordBank,
        wordList: [],
        isWordListLoading: false,
        lastRetriedWordBankId: null,
      }),
    ).toBe(true)

    expect(
      shouldRetryNormalTypingWordList({
        currentWordBank: wordBank,
        wordList: [],
        isWordListLoading: false,
        lastRetriedWordBankId: 'dict-1',
      }),
    ).toBe(false)
  })

  it('skips retrying when loading is in progress, word list is missing, or results already exist', () => {
    const wordBank = createWordBank()

    expect(
      shouldRetryNormalTypingWordList({
        currentWordBank: wordBank,
        wordList: undefined,
        isWordListLoading: false,
        lastRetriedWordBankId: null,
      }),
    ).toBe(false)

    expect(
      shouldRetryNormalTypingWordList({
        currentWordBank: wordBank,
        wordList: [],
        isWordListLoading: true,
        lastRetriedWordBankId: null,
      }),
    ).toBe(false)

    expect(
      shouldRetryNormalTypingWordList({
        currentWordBank: createWordBank({ length: 0 }),
        wordList: [],
        isWordListLoading: false,
        lastRetriedWordBankId: null,
      }),
    ).toBe(false)

    expect(
      shouldRetryNormalTypingWordList({
        currentWordBank: wordBank,
        wordList: [createWord('alpha', 0)],
        isWordListLoading: false,
        lastRetriedWordBankId: null,
      }),
    ).toBe(false)
  })
})
