import KeyEventHandler from '../KeyEventHandler'
import TextAreaHandler from '../TextAreaHandler'
import { currentDictInfoAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { FormEvent } from 'react'

export default function InputHandler({ updateInput }: { updateInput: (updateObj: WordUpdateAction) => void }) {
  const dictInfo = useAtomValue(currentDictInfoAtom)

  // code 语言使用 TextAreaHandler，其余语言使用 KeyEventHandler
  const useTextArea = dictInfo.language === 'code'
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
