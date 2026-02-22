import type { FC } from 'react'
import type { WordDetail } from '../hooks/useStudyStats'
import dayjs from 'dayjs'

interface WordDetailListProps {
  words: WordDetail[]
  date: string | null
  onBack: () => void
  isLoading: boolean
}

const WordDetailList: FC<WordDetailListProps> = ({ words, date, onBack, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!date) {
    return null
  }

  const newWords = words.filter((w) => w.type === 'new')
  const reviewWords = words.filter((w) => w.type === 'review')

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300">
        ← 返回天数列表
      </button>
      <h3 className="text-lg font-semibold text-white">{dayjs(date).format('YYYY年MM月DD日')} 学习详情</h3>

      <div className="mb-4 flex gap-4 text-sm">
        <span className="text-green-300">新词: {newWords.length}</span>
        <span className="text-blue-300">复习: {reviewWords.length}</span>
        <span className="text-gray-400">总计: {words.length}</span>
      </div>

      {newWords.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium text-green-300">新学单词</h4>
          <div className="flex flex-wrap gap-2">
            {newWords.map((word, index) => (
              <div
                key={`${word.word}-${index}`}
                className="rounded-lg bg-green-900/30 px-3 py-2 text-green-200"
                title={`错误次数: ${word.wrongCount}`}
              >
                <span className="font-medium">{word.word}</span>
                {word.wrongCount > 0 && (
                  <span className="ml-1 text-xs text-red-300">({word.wrongCount}错)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewWords.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium text-blue-300">复习单词</h4>
          <div className="flex flex-wrap gap-2">
            {reviewWords.map((word, index) => (
              <div
                key={`${word.word}-${index}`}
                className="rounded-lg bg-blue-900/30 px-3 py-2 text-blue-200"
                title={`错误次数: ${word.wrongCount}`}
              >
                <span className="font-medium">{word.word}</span>
                {word.wrongCount > 0 && (
                  <span className="ml-1 text-xs text-red-300">({word.wrongCount}错)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {words.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">当天无学习记录</div>
        </div>
      )}
    </div>
  )
}

export default WordDetailList
