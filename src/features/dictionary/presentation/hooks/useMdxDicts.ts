import { listMdxDicts, removeMdxDict, selectMdxDicts, updateMdxDictOrder } from '@/features/dictionary/application/use-cases'
import type { MdxDictItem } from '@/features/dictionary/domain'
import { utoolsMdxDictionaryRepository } from '@/infra/repositories/dictionary.repository.utools'
import { useCallback, useEffect, useState } from 'react'

export function useMdxDicts() {
  const [dicts, setDicts] = useState<MdxDictItem[]>([])

  const loadDicts = useCallback(() => {
    try {
      setDicts(listMdxDicts(utoolsMdxDictionaryRepository))
    } catch (e) {
      console.error('getDictList error', e)
    }
  }, [])

  useEffect(() => {
    loadDicts()
  }, [loadDicts])

  const addDicts = useCallback(() => {
    try {
      const result = selectMdxDicts(utoolsMdxDictionaryRepository)
      if (result) {
        setDicts(result)
      }
    } catch (e) {
      console.error('selectDictFiles error', e)
    }
  }, [])

  const saveOrder = useCallback((newDicts: MdxDictItem[]) => {
    try {
      const result = updateMdxDictOrder(utoolsMdxDictionaryRepository, newDicts)
      if (result) setDicts(result)
    } catch (e) {
      console.error('updateDictOrder error', e)
    }
  }, [])

  const removeDict = useCallback((path: string) => {
    try {
      const result = removeMdxDict(utoolsMdxDictionaryRepository, path)
      if (result) setDicts(result)
    } catch (e) {
      console.error('removeDict error', e)
    }
  }, [])

  return {
    dicts,
    setDicts,
    loadDicts,
    addDicts,
    saveOrder,
    removeDict,
  }
}
