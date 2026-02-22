import { TypingContext } from '@/pages/Typing/store'
import type { Word } from '@/typings'
import { useContext, useMemo } from 'react'

export default function WordCard({ word, isActive }: { word: Word; isActive: boolean }) {
  const { state } = useContext(TypingContext)!
  
  const wordInfo = state.wordInfoMap[word.name]
  const trans = wordInfo?.trans || word.trans || []
  const displayTrans = useMemo(() => trans.filter((item) => item && item.trim().length > 0), [trans])

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
