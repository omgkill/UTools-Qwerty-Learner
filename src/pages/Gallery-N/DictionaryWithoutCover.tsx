import Form4EditDict from './Form4EditDict'
import { useDictStats } from './hooks/useDictStats'
import { InnerContext } from './index'
import bookCover from '@/assets/book-cover.png'
import Tooltip from '@/components/Tooltip'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import { currentWordBankIdAtom } from '@/store'
import type { WordBank } from '@/typings'
import * as Progress from '@radix-ui/react-progress'
import { Dialog, Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { Fragment, useContext, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import IconDelete from '~icons/mdi/delete'

interface Props {
  wordBank: WordBank
  onClick?: () => void
}

export default function DictionaryComponent({ wordBank, onClick }: Props) {
  const currentWordBankID = useAtomValue(currentWordBankIdAtom)
  const handleRefresh = useContext(InnerContext)
  const [confirmIsOpen, setConfirmIsOpen] = useState(false)

  const divRef = useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(divRef, {})
  const isVisible = !!entry?.isIntersecting
  const dictStats = useDictStats(wordBank.id, isVisible)
  const isSelected = currentWordBankID === wordBank.id

  const masteryProgress = dictStats?.totalProgress ?? 0

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmIsOpen(true)
  }

  const handleConfirmDelete = async () => {
    const result = await window.delLocalWordBank(wordBank.id)
    if (result) {
      toast.success('删除成功')
    } else {
      toast.error('删除失败')
    }
    window.initLocalWordBanks()
    handleRefresh()
    setConfirmIsOpen(false)
  }

  return (
    <>
      <div
        ref={divRef}
        className={`h-38 group flex w-80 cursor-pointer items-center justify-center overflow-hidden rounded-lg p-5 text-left shadow-lg focus:outline-none ${
          isSelected ? 'bg-indigo-400' : 'bg-zinc-50 hover:bg-white dark:bg-gray-600 dark:hover:bg-gray-500'
        }`}
        role="button"
        onClick={onClick}
      >
        <div className="relative ml-1 mt-2 flex h-full w-full flex-col items-start justify-start">
          <h1
            className={`mb-1.5 text-xl font-normal ${
              isSelected ? 'text-white' : 'text-gray-800 group-hover:text-indigo-400 dark:text-gray-200'
            }`}
          >
            {wordBank.name}
          </h1>
          <Tooltip className="w-full" content={wordBank.description}>
            <p className={`mb-1 w-full truncate ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-200'}`}>
              {wordBank.description}
              {'\u00A0'}{' '}
            </p>
          </Tooltip>

          <p className={`mb-0.5 font-bold ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-200'}`}>{wordBank.length} 词</p>

          {dictStats && (
            <div className="mb-1 flex w-full items-center gap-2 text-xs">
              <span className={`${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                📚 已学 {dictStats.learnedWords}
              </span>
              <span className={`${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                ✅ 已掌握 {dictStats.masteredWords}
              </span>
              {dictStats.dueWords > 0 && (
                <span className={`${isSelected ? 'text-orange-200' : 'text-orange-500'}`}>
                  🔄 待复习 {dictStats.dueWords}
                </span>
              )}
            </div>
          )}

          <div className="flex w-full items-center justify-end pt-2">
            {dictStats && masteryProgress > 0 && (
              <div className="mr-4 flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`${isSelected ? 'text-white/80' : 'text-gray-500'}`}>掌握进度</span>
                  <span className={`${isSelected ? 'text-white' : 'text-indigo-500'}`}>{masteryProgress}%</span>
                </div>
                <Progress.Root
                  value={masteryProgress}
                  max={100}
                  className={`h-2 w-full rounded-full border bg-white ${isSelected ? 'border-indigo-600' : 'border-indigo-400'}`}
                >
                  <Progress.Indicator
                    className={`h-full rounded-full pl-0 ${isSelected ? 'bg-indigo-600' : 'bg-indigo-400'}`}
                    style={{ width: `calc(${masteryProgress}% )` }}
                  />
                </Progress.Root>
              </div>
            )}
            {['custom'].includes(wordBank.languageCategory) && (
              <>
                <button
                  className={`my-3 mr-3 ${isSelected ? 'text-white hover:text-red-200' : 'text-gray-300 hover:text-red-500'}`}
                  onClick={handleDeleteClick}
                  title="删除词库"
                >
                  <IconDelete className="h-5 w-5" />
                </button>
                <Form4EditDict wordBankId={wordBank.id} />
              </>
            )}
            <img src={bookCover} className={`absolute right-3 top-3 w-16 ${isSelected ? 'opacity-50' : 'opacity-20'}`} />
          </div>
        </div>
      </div>

      <Transition appear show={confirmIsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setConfirmIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
                    确认删除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      确定要删除词库「{wordBank.name}」吗？此操作不可撤销。
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      onClick={() => setConfirmIsOpen(false)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-400 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none"
                      onClick={handleConfirmDelete}
                    >
                      删除
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
