import DayList from './components/DayList'
import DictList from './components/DictList'
import WordDetailList from './components/WordDetailList'
import { useDayStats, useStudyStats, useWordDetails } from './hooks/useStudyStats'
import Layout from '@/components/Layout'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useCallback, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import IconX from '~icons/tabler/x'

type ViewState = 'dicts' | 'days' | 'words'

const Analysis = () => {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<ViewState>('dicts')
  const [selectedDictId, setSelectedDictId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { dictStats, isLoading: isDictLoading } = useStudyStats()
  const { days, isLoading: isDayLoading } = useDayStats(selectedDictId)
  const { words, isLoading: isWordLoading } = useWordDetails(selectedDictId, selectedDate)

  const onBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  useHotkeys('enter,esc', onBack, { preventDefault: true })

  const handleSelectDict = useCallback((dictId: string) => {
    setSelectedDictId(dictId)
    setSelectedDate(null)
    setViewState('days')
  }, [])

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date)
    setViewState('words')
  }, [])

  const handleBackToDicts = useCallback(() => {
    setSelectedDictId(null)
    setSelectedDate(null)
    setViewState('dicts')
  }, [])

  const handleBackToDays = useCallback(() => {
    setSelectedDate(null)
    setViewState('days')
  }, [])

  return (
    <Layout>
      <div className="flex w-full flex-1 flex-col overflow-y-auto pl-20 pr-20 pt-20">
        <IconX className="absolute right-20 top-10 mr-2 h-7 w-7 cursor-pointer text-gray-400" onClick={onBack} />
        <ScrollArea.Root className="flex-1 overflow-y-auto">
          <ScrollArea.Viewport className="h-full w-auto pb-[20rem] [&>div]:!block">
            <div className="mx-4 my-8 h-auto w-auto overflow-hidden rounded-lg p-8 shadow-lg bg-gray-700 bg-opacity-50">
              {viewState === 'dicts' && (
                <DictList
                  dicts={dictStats}
                  selectedDictId={selectedDictId}
                  onSelectDict={handleSelectDict}
                  isLoading={isDictLoading}
                />
              )}
              {viewState === 'days' && (
                <DayList
                  days={days}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onBack={handleBackToDicts}
                  isLoading={isDayLoading}
                />
              )}
              {viewState === 'words' && (
                <WordDetailList
                  words={words}
                  date={selectedDate}
                  onBack={handleBackToDays}
                  isLoading={isWordLoading}
                />
              )}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
        </ScrollArea.Root>
        <div className="overflow-y-auto"></div>
      </div>
    </Layout>
  )
}

export default Analysis
