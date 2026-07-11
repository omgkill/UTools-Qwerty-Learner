import type { Word, WordBank, WordWithIndex } from '@/typings'

export function isLocalWordBank(wordBank: Pick<WordBank, 'id' | 'languageCategory'>): boolean {
  return wordBank.id.startsWith('x-dict-') || wordBank.languageCategory === 'custom'
}

export function getUniqueCustomWordBanks(wordBanks: WordBank[]): WordBank[] {
  return wordBanks
    .filter((wordBank) => wordBank.id && wordBank.id.startsWith('x-dict-'))
    .reduce((acc: WordBank[], wordBank) => {
      if (!acc.some((item) => item.id === wordBank.id)) {
        acc.push(wordBank)
      }
      return acc
    }, [])
}

export function normalizeWords(rawWords: Partial<Word>[]): Word[] {
  return rawWords.map((word) => ({
    name: word.name || '',
    trans: word.trans || [],
    usphone: word.usphone || '',
    ukphone: word.ukphone || '',
    notation: word.notation,
    tense: word.tense,
  }))
}

export function withWordIndex(words: Word[]): WordWithIndex[] {
  return words.map((word, index) => ({
    ...word,
    index,
  }))
}
