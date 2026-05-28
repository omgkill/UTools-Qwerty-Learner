import type { FC } from 'react'
import React from 'react'
import type { Activity } from 'react-activity-calendar'
import ActivityCalendar from 'react-activity-calendar'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'

interface HeatmapChartsProps {
  title: string
  data: Activity[]
}

const HeatmapCharts: FC<HeatmapChartsProps> = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="text-center text-xl font-bold text-white">{title}</div>
        <div className="mt-6 text-sm text-gray-400">暂无数据</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-center text-xl font-bold text-white">{title}</div>
      <ActivityCalendar
        fontSize={20}
        blockSize={22}
        blockRadius={7}
        style={{
          padding: '40px 60px 20px 100px',
          color: '#fff',
        }}
        colorScheme="dark"
        data={data}
        theme={{
          light: ['#2b2b2b', '#3a3f5c', '#4b4f8a', '#6366f1', '#818cf8'],
          dark: ['#2b2b2b', '#3a3f5c', '#4b4f8a', '#6366f1', '#818cf8'],
        }}
        renderBlock={(block, activity) =>
          React.cloneElement(block, {
            'data-tooltip-id': 'react-tooltip',
            'data-tooltip-html': `${activity.date} 练习 ${activity.count} 次`,
          })
        }
        showWeekdayLabels={true}
        labels={{
          months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
          weekdays: ['日', '一', '二', '三', '四', '五', '六'],
          totalCount: '过去一年总计 {{count}} 次',
          legend: {
            less: '少',
            more: '多',
          },
        }}
      />
      <ReactTooltip id="react-tooltip" />
    </div>
  )
}

export default HeatmapCharts
