import KeyEventHandler from '../KeyEventHandler'
import TextAreaHandler from '../TextAreaHandler'
import { currentWordBankAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { FormEvent } from 'react'

export default function InputHandler({ updateInput }: { updateInput: (updateObj: WordUpdateAction) => void }) {
  const wordBank = useAtomValue(currentWordBankAtom)

  const useTextArea = wordBank?.language === 'code'
  return useTextArea
    ? <TextAreaHandler updateInput={updateInput} />
    : <KeyEventHandler updateInput={updateInput} />
}
export type WordUpdateAction = WordAddAction | WordDeleteAction | WordCompositionAction

export type WordAddAction = {
  type: 'add'
  value: string
  event: FormEvent<HTMLTextAreaElement> | KeyboardEvent
}

export type WordDeleteAction = {
  type: 'delete'
  length: number
}

// composition api is not ready yet
export type WordCompositionAction = {
  type: 'composition'
  value: string
}
