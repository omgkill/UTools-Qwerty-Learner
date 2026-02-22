import type { WordUpdateAction } from '../InputHandler'
import InputHandler from '../InputHandler'
import WordSound from '../WordSound'
import Letter from './Letter'
import type { LetterState } from './Letter'
import Notation from './Notation'
import style from './index.module.css'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import {
  currentDictInfoAtom,
  isShowAnswerOnHoverAtom,
  isTextSelectableAtom,
  pronunciationIsOpenAtom,
  wordDictationConfigAtom,
} from '@/store'
import type { Word } from '@/typings'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useState } from 'react'
import { useWordState, useWordInput, useWordCompletion } from './hooks'

export type { LetterState }
export type { WordState } from './hooks'

export default function WordComponent({ word, onFinish, isExtraReview = false }: { word: Word; onFinish: () => void; isExtraReview?: boolean }) {
  const { state, dispatch } = useContext(TypingContext)!
  const { wordState, setWordState } = useWordState(word.name)

  const wordDictationConfig = useAtomValue(wordDictationConfigAtom)
  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  const isShowAnswerOnHover = useAtomValue(isShowAnswerOnHoverAtom)
  const pronunciationIsOpen = useAtomValue(pronunciationIsOpenAtom)
  const [isHoveringWord, setIsHoveringWord] = useState(false)
  const currentLanguage = useAtomValue(currentDictInfoAtom).language

  const { updateInput } = useWordInput(wordState, setWordState)
  useWordCompletion(word, wordState, onFinish, isExtraReview)

  const handleHoverWord = useCallback((checked: boolean) => {
    setIsHoveringWord(checked)
  }, [])

  const getLetterVisible = useCallback(
    (index: number) => {
      if (wordState.letterStates[index] === 'correct' || (isShowAnswerOnHover && isHoveringWord)) return true

      if (wordDictationConfig.isOpen) {
        return false
      }
      return true
    },
    [isHoveringWord, isShowAnswerOnHover, wordDictationConfig.isOpen, wordState.letterStates],
  )

  useEffect(() => {
    if (wordState.wrongCount >= 4) {
      dispatch({ type: TypingStateActionType.SET_IS_SKIP, payload: true })
    }
  }, [wordState.wrongCount, dispatch])

  return (
    <>
      <InputHandler updateInput={updateInput} />
      <div className="flex flex-col justify-center pb-1 pt-4">
        {currentLanguage === 'romaji' && word.notation && <Notation notation={word.notation} />}
        <div className="relative">
          <div
            onMouseEnter={() => handleHoverWord(true)}
            onMouseLeave={() => handleHoverWord(false)}
            className={`flex items-center ${isTextSelectable && 'select-all'} justify-center ${wordState.hasWrong ? style.wrong : ''}`}
          >
            {wordState.displayWord.split('').map((t, index) => {
              return <Letter key={`${index}-${t}`} letter={t} visible={getLetterVisible(index)} state={wordState.letterStates[index]} />
            })}
          </div>
          {pronunciationIsOpen && <WordSound word={word.name} inputWord={wordState.inputWord} className="h-10 w-10" />}
        </div>
      </div>
    </>
  )
}
