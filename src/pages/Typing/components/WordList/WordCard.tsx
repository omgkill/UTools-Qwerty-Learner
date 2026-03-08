import type { Word } from '@/types'
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { wordDisplayInfoMapAtom } from '../../store'

export default function WordCard({ word, isActive }: { word: Word; isActive: boolean }) {
  const wordDisplayInfoMap = useAtomValue(wordDisplayInfoMapAtom)

  const wordDisplayInfo = wordDisplayInfoMap[word.name]
  const displayTrans = useMemo(() => {
    const trans = wordDisplayInfo?.trans ?? word.trans ?? []
    return trans.filter((item) => item && item.trim().length > 0)
  }, [wordDisplayInfo?.trans, word.trans])

  return (
    <div
      className={`mb-2 rounded-xl ${
        isActive ? 'bg-indigo-50 dark:bg-indigo-800 dark:bg-opacity-20' : 'bg-white dark:bg-gray-700 dark:bg-opacity-20'
      }   select-text p-4 shadow focus:outline-none`}
      key={word.name}
    >
      <p className="select-all font-mono text-xl font-normal leading-6 dark:text-gray-50">{word.name}</p>
      <div className="mt-2 font-sans text-sm text-gray-400">{displayTrans.join('；')}</div>
    </div>
  )
}
