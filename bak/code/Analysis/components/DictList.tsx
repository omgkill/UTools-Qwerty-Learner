import type { FC } from 'react'
import type { DictStats } from '../hooks/useStudyStats'

interface DictListProps {
  dicts: DictStats[]
  selectedDictId: string | null
  onSelectDict: (dictId: string) => void
  isLoading: boolean
}

const DictList: FC<DictListProps> = ({ dicts, selectedDictId, onSelectDict, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (dicts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">暂无学习记录</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="mb-4 text-lg font-semibold text-white">选择词库</h3>
      {dicts.map((dict) => (
        <button
          key={dict.dictId}
          onClick={() => onSelectDict(dict.dictId)}
          className={`w-full rounded-lg p-4 text-left transition-all ${
            selectedDictId === dict.dictId
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{dict.dictName}</div>
              <div className="mt-1 text-sm opacity-80">
                学习 {dict.totalDays} 天 · {dict.totalWords} 词
              </div>
            </div>
            {dict.lastStudyDate && (
              <div className="text-sm opacity-60">最近: {dict.lastStudyDate}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export default DictList
