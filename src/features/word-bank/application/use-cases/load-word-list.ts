import { isLocalWordBank, normalizeWords, withWordIndex } from '../../domain'
import type { LocalWordBankRepository } from '../ports'
import type { Word, WordBank } from '@/typings'

export async function loadWordList(repository: LocalWordBankRepository, currentWordBank: WordBank) {
  try {
    let words: Word[] = []

    if (isLocalWordBank(currentWordBank)) {
      words = normalizeWords(repository.readWordBank(currentWordBank.id))
    } else {
      const response = await fetch('.' + currentWordBank.url)
      const rawWords = await response.json()
      words = normalizeWords(rawWords)
    }

    return withWordIndex(words)
  } catch (e) {
    console.error('Failed to load word list:', e)
    return null
  }
}
