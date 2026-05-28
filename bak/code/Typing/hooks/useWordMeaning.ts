import { useCallback, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { parseMdxEntry } from '@/utils/mdxParser'
import { updateWordDisplayInfoAtom, wordDisplayInfoMapAtom } from '../store'
import type { Word } from '@/types'

/**
 * 用于查询单词释义的 hook
 * 从 MDX 词典查询单词的翻译、音标和时态信息
 */
export function useWordMeaning() {
  const updateWordDisplayInfo = useSetAtom(updateWordDisplayInfoAtom)
  const wordDisplayInfoMap = useAtomValue(wordDisplayInfoMapAtom)
  const queriedWordsRef = useRef(new Set<string>())

  const requestWordMeaning = useCallback(
    async (targetWord: Word | undefined) => {
      if (!targetWord) return
      if (!window.queryFirstMdxWord) return
      const dicts = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      if (!dicts[0]) return
      if (queriedWordsRef.current.has(targetWord.name)) return

      const existingInfo = wordDisplayInfoMap[targetWord.name]
      const hasTranslations = existingInfo?.trans && existingInfo.trans.length > 0
      const hasPhonetics = Boolean(existingInfo?.ukphone)
      if (hasTranslations && hasPhonetics) return

      queriedWordsRef.current.add(targetWord.name)
      try {
        const result = await window.queryFirstMdxWord(targetWord.name)
        if (!result || !result.ok || !result.content) return

        const parsed = parseMdxEntry(result.content)
        if (parsed.translations.length === 0 && !parsed.phonetics.uk && !parsed.tense) return

        updateWordDisplayInfo({
          wordName: targetWord.name,
          data: {
            trans: parsed.translations.length > 0 ? parsed.translations : undefined,
            ukphone: parsed.phonetics.uk || undefined,
            tense: parsed.tense || undefined,
          },
        })
      } catch (e) {
        console.error('Failed to query word meaning:', targetWord.name, e)
      }
    },
    [updateWordDisplayInfo, wordDisplayInfoMap],
  )

  return { requestWordMeaning }
}