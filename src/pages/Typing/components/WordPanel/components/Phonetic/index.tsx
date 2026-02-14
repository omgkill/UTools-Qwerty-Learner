import { isTextSelectableAtom, phoneticConfigAtom } from '@/store'
import type { WordWithIndex } from '@/typings'
import { useAtomValue } from 'jotai'

export type PhoneticProps = {
  word: WordWithIndex
}

function Phonetic({ word }: PhoneticProps) {
  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  const displayPhonetic = word.ukphone || word.usphone

  return (
    <div
      className={`space-x-5 pt-1 text-center text-xl font-normal text-gray-600 transition-colors duration-300 dark:text-gray-400 ${
        isTextSelectable && 'select-text'
      }`}
    >
      {displayPhonetic && displayPhonetic.length > 1 && <span>{`[${displayPhonetic}]`}</span>}
    </div>
  )
}

export default Phonetic
