import { queryMdxWord } from '@/features/dictionary/application/use-cases'
import { buildExpandedState } from '@/features/dictionary/domain'
import type { MdxQueryResult } from '@/features/dictionary/domain'
import { utoolsDictionaryActionRepository, utoolsMdxDictionaryRepository } from '@/infra/repositories/dictionary.repository.utools'
import { useCallback, useEffect, useState } from 'react'

type UseMdxQueryParams = {
  routeWord?: string
  collapseFirstResult: boolean
  log?: (message: string) => void
}

export function useMdxQuery({ routeWord, collapseFirstResult, log }: UseMdxQueryParams) {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<MdxQueryResult[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const search = useCallback(
    async (word: string) => {
      const queryWord = word.trim()
      log?.(`handleSearch: word="${queryWord}"`)
      if (!queryWord) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const queryResults = await queryMdxWord(utoolsMdxDictionaryRepository, queryWord)
        log?.(`handleSearch: got ${queryResults.length} results`)
        console.log('MdxQuery results:', queryResults)
        setResults(queryResults)
        setExpanded(buildExpandedState(queryResults, collapseFirstResult))
      } catch (e) {
        console.error('queryWord error', e)
      } finally {
        setLoading(false)
      }
    },
    [collapseFirstResult, log],
  )

  const toggleExpand = useCallback((dictPath: string) => {
    setExpanded((prev) => ({ ...prev, [dictPath]: !prev[dictPath] }))
  }, [])

  useEffect(() => {
    log?.('useEffect: setup mode change listener for search')

    const unsubscribe = utoolsDictionaryActionRepository.subscribeModeChange((payload) => {
      log?.(`handleModeChange: action.payload=${payload}`)
      if (payload) {
        const inputWord = String(payload).trim()
        if (inputWord) {
          search(inputWord)
        }
      }
    })

    if (routeWord) {
      const decodedWord = decodeURIComponent(routeWord)
      log?.(`useEffect: routeWord=${decodedWord}`)
      search(decodedWord)
    } else {
      const payload = utoolsDictionaryActionRepository.getActionPayload()
      log?.(`useEffect: getActionPayload() = ${JSON.stringify(payload)}`)
      if (payload) {
        const inputWord = String(payload).trim()
        if (inputWord) {
          search(inputWord)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    return unsubscribe
  }, [log, routeWord, search])

  return {
    loading,
    results,
    expanded,
    search,
    toggleExpand,
  }
}
