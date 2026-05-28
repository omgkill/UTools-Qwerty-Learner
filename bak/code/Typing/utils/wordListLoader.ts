import type { Word, WordBank, WordWithIndex } from '@/types'

export async function loadWordList(currentWordBank: WordBank): Promise<WordWithIndex[] | null> {
  if (!currentWordBank) return null

  const isLocalWordBank = currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'

  try {
    let words: Word[] = []

    if (isLocalWordBank) {
      const rawWords = await window.readLocalWordBank(currentWordBank.id)
      words = rawWords.map((w: Partial<Word>) => ({
        name: w.name || '',
        trans: w.trans || [],
        usphone: w.usphone || '',
        ukphone: w.ukphone || '',
        notation: w.notation,
        tense: w.tense,
      }))
    } else {
      const response = await fetch('.' + currentWordBank.url)
      const rawWords = await response.json()
      words = rawWords.map((w: Partial<Word>) => ({
        name: w.name || '',
        trans: w.trans || [],
        usphone: w.usphone || '',
        ukphone: w.ukphone || '',
        notation: w.notation,
        tense: w.tense,
      }))
    }

    return words.map((word, index) => ({
      ...word,
      index,
    }))
  } catch (e) {
    console.error('Failed to load word list:', e)
    return null
  }
}
