import DictionaryGroup from './CategoryDicts'
import ChapterList from './ChapterList'
import Form4AddDict from './Form4AddDict'
import { LanguageTabSwitcher } from './LanguageTabSwitcher'
import Layout from '@/components/Layout'
import { builtinDictionaries } from '@/resources/dictionary'
import { currentDictInfoAtom, dictionariesAtom } from '@/store'
import type { Dictionary, LanguageCategoryType } from '@/typings'
import groupBy, { groupByDictTags } from '@/utils/groupBy'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtomValue, useSetAtom } from 'jotai'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import type { Updater } from 'use-immer'
import { useImmer } from 'use-immer'
import IconX from '~icons/tabler/x'

export type GalleryState = {
  currentLanguageTab: LanguageCategoryType
  chapterListDict: Dictionary | null
  vipState: string
}

const initialGalleryState: GalleryState = {
  currentLanguageTab: 'custom',
  chapterListDict: null,
  vipState: '',
}

export const GalleryContext = createContext<{
  state: GalleryState
  setState: Updater<GalleryState>
} | null>(null)

export const InnerContext = createContext()

export default function GalleryPage() {
  const [galleryState, setGalleryState] = useImmer<GalleryState>(initialGalleryState)
  const navigate = useNavigate()
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const dictionaries = useAtomValue(dictionariesAtom)
  const setDictionaries = useSetAtom(dictionariesAtom)

  const [refreshCount, setPageRefresh] = useState(0)

  const loadDictionaries = useCallback(() => {
    const config = window.readLocalDictConfig()
    setDictionaries([...config, ...builtinDictionaries])
  }, [setDictionaries])

  useEffect(() => {
    loadDictionaries()
  }, [loadDictionaries])

  useEffect(() => {
    if (refreshCount > 0) {
      loadDictionaries()
    }
  }, [refreshCount, loadDictionaries])

  const { groupedByCategoryAndTag } = useMemo(() => {
    refreshCount

    const currentLanguageCategoryDicts = dictionaries.filter((dict) => dict.languageCategory === galleryState.currentLanguageTab)
    const groupedByCategory = Object.entries(groupBy(currentLanguageCategoryDicts, (dict) => dict.category))
    const groupedByCategoryAndTag = groupedByCategory.map(
      ([category, dicts]) => [category, groupByDictTags(dicts)] as [string, Record<string, Dictionary[]>],
    )
    return {
      groupedByCategoryAndTag,
    }
  }, [galleryState.currentLanguageTab, refreshCount, dictionaries])

  const onBack = useCallback(() => {
    navigate('/')
  }, [navigate])
  const refreshPage = useCallback(() => {
    setPageRefresh(refreshCount + 1)
  }, [setPageRefresh, refreshCount])

  useHotkeys('enter,esc', onBack, { preventDefault: true })

  useEffect(() => {
    if (currentDictInfo) {
      setGalleryState((state) => {
        state.currentLanguageTab = currentDictInfo.languageCategory
      })
    }
    setGalleryState((state) => {
      state.vipState = localStorage.getItem('x-vipState') || ''
    })
  }, [currentDictInfo, setGalleryState])

  return (
    <Layout>
      <GalleryContext.Provider value={{ state: galleryState, setState: setGalleryState }}>
        <ChapterList />
        <div className="relative mb-auto mt-auto flex w-full flex-1 flex-col overflow-y-auto pl-20 ">
          <IconX className="absolute right-20 top-10 mr-2 h-7 w-7 cursor-pointer text-gray-400" onClick={onBack} />
          <div className="mt-20 flex w-full flex-1 flex-col items-center justify-center overflow-y-auto">
            <div className="flex w-full flex-1 flex-col overflow-y-auto">
              <div className="flex h-20 w-full items-center justify-between pb-6">
                <LanguageTabSwitcher />
              </div>
              <InnerContext.Provider value={refreshPage}>
                <ScrollArea.Root className="flex-1 overflow-y-auto ">
                  <ScrollArea.Viewport className="h-full w-full pb-[20rem]">
                    <div className="mr-4 flex flex-1 flex-col items-start justify-start gap-14 overflow-y-auto">
                      {groupedByCategoryAndTag.map(([category, groupeByTag]) => (
                        <DictionaryGroup key={category} groupedDictsByTag={groupeByTag} />
                      ))}
                    </div>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar
                    className="flex touch-none select-none bg-transparent "
                    orientation="vertical"
                  ></ScrollArea.Scrollbar>
                </ScrollArea.Root>
              </InnerContext.Provider>
            </div>
          </div>
          {galleryState.currentLanguageTab === 'custom' && <Form4AddDict onSaveDictSuccess={refreshPage} />}
        </div>
      </GalleryContext.Provider>
    </Layout>
  )
}
