import type { FC } from 'react'
import type { DayStats } from '../hooks/useStudyStats'
import dayjs from 'dayjs'

interface DayListProps {
  days: DayStats[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onBack: () => void
  isLoading: boolean
}

const DayList: FC<DayListProps> = ({ days, selectedDate, onSelectDate, onBack, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300">
          ← 返回词库列表
        </button>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">该词库暂无学习记录</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300">
        ← 返回词库列表
      </button>
      <h3 className="text-lg font-semibold text-white">学习天数</h3>
      <div className="space-y-2">
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => onSelectDate(day.date)}
            className={`w-full rounded-lg p-4 text-left transition-all ${
              selectedDate === day.date
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{dayjs(day.date).format('YYYY年MM月DD日')}</div>
                <div className="mt-1 text-sm opacity-80">
                  共 {day.totalWords} 词
                  {day.learnedCount > 0 && (
                    <span className="ml-2 text-green-300">新学 {day.learnedCount}</span>
                  )}
                  {day.reviewedCount > 0 && (
                    <span className="ml-2 text-blue-300">复习 {day.reviewedCount}</span>
                  )}
                </div>
              </div>
              <div className="text-gray-400">→</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default DayList
