import { currentWordBankAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings/index'
import { useDailyRecord, useReviewWords, useWordProgress } from '@/utils/db/useProgress'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'

export type LearningType = 'review' | 'new' | 'consolidate' | 'complete'

export type UseWordListResult = {
  words: WordWithIndex[] | undefined
  isLoading: boolean
  error: Error | undefined
  learningType: LearningType
  dueCount: number
  newCount: number
  masteredCount: number
  todayLearned: number
  todayReviewed: number
  newWordQuota: number
  remainingForTarget: number
  hasReachedTarget: boolean
}

export function useWordList(): UseWordListResult {
  const currentWordBank = useAtomValue(currentWordBankAtom)

  const [learningType, setLearningType] = useState<LearningType>('review')
  const [dueCount, setDueCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [learningWords, setLearningWords] = useState<WordWithIndex[]>([])
  const [loadVersion, setLoadVersion] = useState(0)
  const isLoadingRef = useRef(false)

  const isLocalWordBank = currentWordBank
    ? currentWordBank.id.startsWith('x-dict-') || currentWordBank.languageCategory === 'custom'
    : false

  const {
    data: wordList,
    error,
    isLoading: isWordListLoading,
  } = useSWR(
    currentWordBank ? (isLocalWordBank ? currentWordBank.id : currentWordBank.url) : null,
    isLocalWordBank ? localWordListFetcher : wordListFetcher,
  )

  const { getDueWordsWithInfo, getNewWords } = useReviewWords()
  const { getWordProgress } = useWordProgress()
  const {
    dailyRecord,
    getNewWordQuota,
    getRemainingForTarget,
    hasReachedTarget,
  } = useDailyRecord()

  const todayLearned = dailyRecord?.learnedCount ?? 0
  const todayReviewed = dailyRecord?.reviewedCount ?? 0

  const loadLearningWords = useCallback(async () => {
    if (!wordList || wordList.length === 0 || !currentWordBank) {
      setLearningWords([])
      return
    }

    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      const [dueWords, newWords] = await Promise.all([
        getDueWordsWithInfo(wordList, 100),
        getNewWords(wordList, 100),
      ])

      const allProgress = await Promise.all(
        wordList.slice(0, 200).map(async (w) => getWordProgress(w.name))
      )
      const mastered = allProgress.filter((p) => p && p.masteryLevel >= 7).length

      setDueCount(dueWords.length)
      setNewCount(newWords.length)
      setMasteredCount(mastered)

      if (dueWords.length > 0) {
        setLearningType('review')
        setLearningWords(dueWords)
      } else {
        const quota = getNewWordQuota()
        if (quota > 0 && newWords.length > 0) {
          setLearningType('new')
          const wordsToLearn = newWords.slice(0, quota)
          setLearningWords(wordsToLearn)
        } else if (hasReachedTarget()) {
          setLearningType('complete')
          setLearningWords([])
        } else {
          setLearningType('consolidate')
          const learnedWords = wordList
            .map((word, index) => ({ ...word, index }))
            .filter((word) => {
              const progress = allProgress.find((p) => p?.word === word.name)
              return progress && progress.masteryLevel > 0 && progress.masteryLevel < 7
            })
          const shuffled = learnedWords.sort(() => Math.random() - 0.5)
          setLearningWords(shuffled.slice(0, getRemainingForTarget()))
        }
      }
    } catch (e) {
      console.error('Failed to load learning words:', e)
      setLearningWords([])
    } finally {
      isLoadingRef.current = false
    }
  }, [
    wordList,
    currentWordBank,
    getDueWordsWithInfo,
    getNewWords,
    getWordProgress,
    getNewWordQuota,
    hasReachedTarget,
    getRemainingForTarget,
  ])

  useEffect(() => {
    loadLearningWords()
  }, [loadLearningWords, loadVersion])

  const reloadWords = useCallback(() => {
    setLoadVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    if (
      learningWords.length === 0 &&
      learningType !== 'complete' &&
      !isWordListLoading &&
      wordList &&
      wordList.length > 0
    ) {
      reloadWords()
    }
  }, [learningWords.length, learningType, isWordListLoading, wordList, reloadWords])

  const baseWords: WordWithIndex[] = useMemo(() => {
    return learningWords
  }, [learningWords])

  return {
    words: wordList === undefined ? undefined : baseWords,
    isLoading: isWordListLoading,
    error,
    learningType,
    dueCount,
    newCount,
    masteredCount,
    todayLearned,
    todayReviewed,
    newWordQuota: getNewWordQuota(),
    remainingForTarget: getRemainingForTarget(),
    hasReachedTarget: hasReachedTarget(),
  }
}

async function wordListFetcher(url: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    const response = await fetch('.' + url)
    words = await response.json()
  } catch (err) {
    console.log(err)
  }

  return words
}

export function parseMdxEntry(html: string): { translations: string[]; phonetics: { us?: string; uk?: string }; tense?: string } {
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null
  if (!parser) {
    return { translations: [], phonetics: {} }
  }

  const doc = parser.parseFromString(html, 'text/html')
  const ipaText = doc.querySelector('#ecdict .git .ipa')?.textContent?.trim() || ''
  const phonetic = normalizePhonetic(ipaText)

  const translations = Array.from(doc.querySelectorAll('#ecdict .gdc .dcb'))
    .map((block) => {
      const pos = block.querySelector('.pos')?.textContent?.trim()
      const dcn = block.querySelector('.dcn')?.textContent?.trim()
      if (!dcn) return null
      const text = pos ? `${pos} ${dcn}` : dcn
      return text.replace(/\s+/g, ' ').trim()
    })
    .filter((item): item is string => Boolean(item))

  const unique = Array.from(new Set(translations.map((item) => item.replace(/^[·•\-\s]+/g, '').trim())))
    .filter((item) => item.length > 1 && item.length < 120)
    .filter((item) => /[\u4e00-\u9fa5]/.test(item))

  const tense = doc.querySelector('#ecdict .gfm .frm')?.textContent?.trim()

  return {
    translations: unique.slice(0, 2),
    phonetics: { uk: phonetic || undefined },
    tense: tense || undefined,
  }
}

function normalizePhonetic(text: string): string {
  return text.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim()
}

async function localWordListFetcher(id: string): Promise<Word[]> {
  let words: Word[] = []
  try {
    words = await window.readLocalWordBank(id)
  } catch (err) {
    console.error(err)
  }
  return words
}
