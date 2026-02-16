import DictionaryGroup from './CategoryDicts'
import Form4AddDict from './Form4AddDict'
import Layout from '@/components/Layout'
import { wordBanksAtom } from '@/store'
import type { WordBank } from '@/typings'
import groupBy, { groupByDictTags } from '@/utils/groupBy'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtomValue, useSetAtom } from 'jotai'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import IconX from '~icons/tabler/x'

export const InnerContext = createContext<() => void>(() => {})

export default function GalleryPage() {
  const navigate = useNavigate()
  const wordBanks = useAtomValue(wordBanksAtom)
  const setWordBanks = useSetAtom(wordBanksAtom)

  const [refreshCount, setPageRefresh] = useState(0)

  const loadWordBanks = useCallback(() => {
    const config = window.readLocalWordBankConfig()
    const customWordBanks = config.filter((wb: WordBank) => wb.id && wb.id.startsWith('x-dict-'))
    const uniqueWordBanks = customWordBanks.reduce((acc: WordBank[], wb: WordBank) => {
      if (!acc.some((d) => d.id === wb.id)) {
        acc.push(wb)
      }
      return acc
    }, [])
    setWordBanks(uniqueWordBanks)
  }, [setWordBanks])

  useEffect(() => {
    loadWordBanks()
  }, [loadWordBanks])

  useEffect(() => {
    if (refreshCount > 0) {
      loadWordBanks()
    }
  }, [refreshCount, loadWordBanks])

  const { groupedByCategoryAndTag } = useMemo(() => {
    refreshCount

    const groupedByCategory = Object.entries(groupBy(wordBanks, (wb) => wb.category))
    const groupedByCategoryAndTag = groupedByCategory.map(
      ([category, wbs]) => [category, groupByDictTags(wbs)] as [string, Record<string, WordBank[]>],
    )
    return {
      groupedByCategoryAndTag,
    }
  }, [refreshCount, wordBanks])

  const onBack = useCallback(() => {
    navigate('/')
  }, [navigate])
  const refreshPage = useCallback(() => {
    setPageRefresh(refreshCount + 1)
  }, [setPageRefresh, refreshCount])

  useHotkeys('enter,esc', onBack, { preventDefault: true })

  return (
    <Layout>
      <div className="relative mb-auto mt-auto flex w-full flex-1 flex-col overflow-y-auto pl-20 ">
        <IconX className="absolute right-20 top-10 mr-2 h-7 w-7 cursor-pointer text-gray-400" onClick={onBack} />
        <div className="mt-20 flex w-full flex-1 flex-col items-center justify-center overflow-y-auto">
          <div className="flex w-full flex-1 flex-col overflow-y-auto">
            <div className="flex h-20 w-full items-center justify-between pb-6">
              <h1 className="text-2xl font-bold text-gray-200">自定义词库</h1>
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
        <Form4AddDict onSaveDictSuccess={refreshPage} />
      </div>
    </Layout>
  )
}
