import { useAtomValue } from 'jotai'
import { currentIndexAtom, wordsAtom } from '../../store'
import { memo, useMemo } from 'react'

const Progress = memo(({ className }: { className?: string }) => {
  const currentIndex = useAtomValue(currentIndexAtom)
  const words = useAtomValue(wordsAtom)

  const progress = useMemo(() =>
    words.length > 0 ? Math.floor((currentIndex / words.length) * 100) : 0,
    [currentIndex, words.length]
  )

  const phase = useMemo(() => Math.floor(progress / 33.4), [progress])

  const colorSwitcher: { [key: number]: string } = useMemo(() => ({
    0: 'bg-indigo-200 dark:bg-indigo-300',
    1: 'bg-indigo-300 dark:bg-indigo-400',
    2: 'bg-indigo-400 dark:bg-indigo-500',
  }), [])

  return (
    <div className={`relative w-1/4 pt-1 ${className}`}>
      <div className="mb-4 flex h-2 overflow-hidden rounded-xl bg-indigo-100 text-xs transition-all duration-300 dark:bg-indigo-200">
        <div
          style={{ width: `${progress}%` }}
          className={`flex flex-col justify-center whitespace-nowrap rounded-xl text-center text-white shadow-none transition-all duration-300 ${
            colorSwitcher[phase] ?? 'bg-indigo-200 dark:bg-indigo-300'
          }`}
        ></div>
      </div>
    </div>
  )
})

Progress.displayName = 'Progress'

export default Progress
