import type { Word } from '@/types'

export type WordCardProps = {
  word: Word
  isActive?: boolean
  translation?: string[]
  className?: string
  onClick?: () => void
}

export function WordCard({ word, isActive = false, translation, className = '', onClick }: WordCardProps) {
  const displayTrans = translation ?? word.trans ?? []
  const filteredTrans = displayTrans.filter((item) => item && item.trim().length > 0)

  return (
    <div
      className={`mb-2 rounded-xl select-text p-4 shadow focus:outline-none cursor-pointer transition-colors ${
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-800 dark:bg-opacity-20'
          : 'bg-white dark:bg-gray-700 dark:bg-opacity-20'
      } ${className}`}
      onClick={onClick}
    >
      <p className="select-all font-mono text-xl font-normal leading-6 dark:text-gray-50">{word.name}</p>
      {filteredTrans.length > 0 && (
        <div className="mt-2 font-sans text-sm text-gray-400">{filteredTrans.join('ï¼?)}</div>
      )}
    </div>
  )
}

export type WordCardCompactProps = {
  word: string
  phonetic?: string
  isActive?: boolean
  className?: string
  onClick?: () => void
}

export function WordCardCompact({ word, phonetic, isActive = false, className = '', onClick }: WordCardCompactProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors cursor-pointer ${
        isActive
          ? 'bg-indigo-100 dark:bg-indigo-900'
          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
      } ${className}`}
      onClick={onClick}
    >
      <span className="font-mono text-sm dark:text-gray-200">{word}</span>
      {phonetic && <span className="text-xs text-gray-400">{phonetic}</span>}
    </div>
  )
}
