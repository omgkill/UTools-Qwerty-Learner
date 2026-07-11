import { beforeEach, describe, expect, it } from 'vitest'
import { RuntimeLocalWordBankRepository } from './local-word-bank.repository'
import type { WordBank } from '@/typings'

const repository = new RuntimeLocalWordBankRepository()

const clearUtools = () => {
  delete (window as Window & { utools?: Window['utools'] }).utools
}

describe('RuntimeLocalWordBankRepository', () => {
  beforeEach(() => {
    localStorage.clear()
    clearUtools()
  })

  it('reads and writes local word banks in browser runtime', () => {
    const wordBank: WordBank = {
      id: 'x-dict-demo',
      name: 'Demo',
      description: 'Demo words',
      category: 'custom',
      languageCategory: 'custom',
      language: 'en',
      url: '',
      tags: [],
      length: 2,
      chapterCount: 1,
    }
    const words = [
      { name: 'alpha', trans: ['n. alpha'], usphone: '', ukphone: '', tense: '' },
      { name: 'beta', trans: ['n. beta'], usphone: '', ukphone: '', tense: '' },
    ]

    repository.createFromJson(words, wordBank)

    expect(repository.readConfig()).toEqual([wordBank])
    expect(repository.readWordBank(wordBank.id)).toEqual(words)
    expect(JSON.parse(localStorage.getItem('local-wordbank-config') || '[]')).toEqual([wordBank])
  })

  it('deletes local word banks in browser runtime', () => {
    const wordBank: WordBank = {
      id: 'x-dict-demo',
      name: 'Demo',
      description: 'Demo words',
      category: 'custom',
      languageCategory: 'custom',
      language: 'en',
      url: '',
      tags: [],
      length: 1,
      chapterCount: 1,
    }
    const words = [{ name: 'alpha', trans: ['n. alpha'], usphone: '', ukphone: '', tense: '' }]

    repository.createFromJson(words, wordBank)
    const result = repository.deleteWordBank(wordBank.id)

    expect(result).toBe(true)
    expect(repository.readConfig()).toEqual([])
    expect(repository.readWordBank(wordBank.id)).toEqual([])
    expect(localStorage.getItem(wordBank.id)).toBeNull()
  })
})
