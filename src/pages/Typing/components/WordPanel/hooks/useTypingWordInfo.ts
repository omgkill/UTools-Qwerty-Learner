import type { WordInfo, WordInfoMap } from '../../../store'
import { listMdxDicts, queryFirstMdxWord } from '@/features/dictionary/application/use-cases'
import { utoolsMdxDictionaryRepository } from '@/infra/repositories/dictionary.repository.utools'
import type { WordWithIndex } from '@/typings'
import { parseMdxEntry } from '@/utils/mdxParser'
import { useCallback, useEffect, useRef } from 'react'

type UseTypingWordInfoParams = {
  currentWord: WordWithIndex | undefined
  prevWord: WordWithIndex | undefined
  nextWord: WordWithIndex | undefined
  wordInfoMap: WordInfoMap
  updateWordInfo: (wordName: string, data: WordInfo) => void
}

type UseTypingWordInfoResult = {
  wordWithInfo: WordWithIndex | null
  displayTrans: string[]
  displayUkphone: string
  displayTense: string | undefined
}

export function useTypingWordInfo(params: UseTypingWordInfoParams): UseTypingWordInfoResult {
  const { currentWord, prevWord, nextWord, wordInfoMap, updateWordInfo } = params
  const queriedWordsRef = useRef(new Set<string>())

  const wordInfoMapRef = useRef(wordInfoMap)
  wordInfoMapRef.current = wordInfoMap

  const requestWordMeaning = useCallback(
    async (targetWord: WordWithIndex | undefined) => {
      if (!targetWord) return

      const dicts = listMdxDicts(utoolsMdxDictionaryRepository)
      if (!dicts[0]) return
      if (queriedWordsRef.current.has(targetWord.name)) return

      const existingInfo = wordInfoMapRef.current[targetWord.name]
      const hasTranslations = existingInfo?.trans && existingInfo.trans.length > 0
      const hasPhonetics = Boolean(existingInfo?.ukphone)
      if (hasTranslations && hasPhonetics) return

      queriedWordsRef.current.add(targetWord.name)
      try {
        const result = await queryFirstMdxWord(utoolsMdxDictionaryRepository, targetWord.name)
        if (!result || !result.ok || !result.content) return

        const parsed = parseMdxEntry(result.content)
        if (parsed.translations.length === 0 && !parsed.phonetics.uk && !parsed.tense) return

        updateWordInfo(targetWord.name, {
          trans: parsed.translations.length > 0 ? parsed.translations : undefined,
          ukphone: parsed.phonetics.uk || undefined,
          tense: parsed.tense || undefined,
        })
      } catch (error) {
        console.error('Failed to query word meaning:', targetWord.name, error)
      }
    },
    [updateWordInfo],
  )

  useEffect(() => {
    void requestWordMeaning(prevWord)
    void requestWordMeaning(currentWord)
    void requestWordMeaning(nextWord)
  }, [currentWord, nextWord, prevWord, requestWordMeaning])

  const wordInfo = currentWord ? wordInfoMap[currentWord.name] : undefined
  const displayTrans = wordInfo?.trans || currentWord?.trans || []
  const displayUkphone = wordInfo?.ukphone || currentWord?.ukphone || ''
  const displayTense = wordInfo?.tense || currentWord?.tense

  return {
    wordWithInfo: currentWord
      ? { ...currentWord, trans: displayTrans, ukphone: displayUkphone, tense: displayTense }
      : null,
    displayTrans,
    displayUkphone,
    displayTense,
  }
}
