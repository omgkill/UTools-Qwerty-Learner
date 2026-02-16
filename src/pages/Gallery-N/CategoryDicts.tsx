import DictTagSwitcher from './DictTagSwitcher'
import DictionaryComponent from './DictionaryWithoutCover'
import { currentWordBankAtom, currentWordBankIdAtom } from '@/store'
import type { WordBank } from '@/typings'
import { findCommonValues } from '@/utils'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DictionaryGroup({ groupedDictsByTag }: { groupedDictsByTag: Record<string, WordBank[]> }) {
  const tagList = useMemo(() => Object.keys(groupedDictsByTag), [groupedDictsByTag])
  const [currentTag, setCurrentTag] = useState(tagList[0])
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const [, setCurrentWordBankId] = useAtom(currentWordBankIdAtom)
  const navigate = useNavigate()

  const onChangeCurrentTag = useCallback((tag: string) => {
    setCurrentTag(tag)
  }, [])

  const onClickWordBank = useCallback(
    (wordBank: WordBank) => {
      setCurrentWordBankId(wordBank.id)
      navigate('/')
    },
    [setCurrentWordBankId, navigate],
  )

  useEffect(() => {
    if (currentWordBank && currentWordBank.tags) {
      const commonTags = findCommonValues(tagList, currentWordBank.tags)
      if (commonTags.length > 0) {
        setCurrentTag(commonTags[0])
      }
    }
  }, [currentWordBank, tagList])

  return (
    <div>
      <DictTagSwitcher tagList={tagList} currentTag={currentTag} onChangeCurrentTag={onChangeCurrentTag} />
      <div className="mt-8 grid gap-x-5 gap-y-10 px-1 pb-4 sm:grid-cols-1 md:grid-cols-2 dic3:grid-cols-3 dic4:grid-cols-4">
        {groupedDictsByTag[currentTag]?.map((wordBank) => {
          return <DictionaryComponent key={wordBank.id} wordBank={wordBank} onClick={() => onClickWordBank(wordBank)} />
        })}
      </div>
    </div>
  )
}
