import { TypingContext, initialState } from '@/pages/Typing/store'
import type { Word } from '@/typings'
import { useContext, useMemo } from 'react'

export default function WordCard({ word, isActive }: { word: Word; isActive: boolean }) {
  const typingContext = useContext(TypingContext)
  const state = typingContext?.state ?? initialState

  const wordInfo = state.wordInfoMap[word.name]
  const displayTrans = useMemo(() => {
    const trans = wordInfo?.trans ?? word.trans ?? []
    return trans.filter((item) => item && item.trim().length > 0)
  }, [wordInfo?.trans, word.trans])

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
