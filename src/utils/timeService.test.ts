import { afterEach, describe, expect, it } from 'vitest'
import { getTodayString, now, resetTimeDiff, setSimulatedDate, setTimeTo } from './timeService'

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('setSimulatedDate', () => {
  afterEach(() => {
    resetTimeDiff()
  })

  it('切换到指定日期后 getTodayString 返回该日期', () => {
    setSimulatedDate('2026-08-02')
    expect(getTodayString()).toBe('2026-08-02')
  })

  it('以本地时间零点为基准，负时区不会偏移到前一天', () => {
    setSimulatedDate('2026-08-02')
    const localDate = new Date(now())
    expect(formatDate(localDate)).toBe('2026-08-02')
  })

  it('重置后回到真实日期', () => {
    setSimulatedDate('2026-08-02')
    resetTimeDiff()
    expect(getTodayString()).toBe(formatDate(new Date()))
  })

  it('非法日期字符串不生效', () => {
    setSimulatedDate('not-a-date')
    expect(getTodayString()).toBe(formatDate(new Date()))
  })

  it('支持跨年日期', () => {
    setSimulatedDate('2027-01-01')
    expect(getTodayString()).toBe('2027-01-01')
  })
})

describe('timeService 其他函数', () => {
  afterEach(() => {
    resetTimeDiff()
  })

  it('setTimeTo 与 resetTimeDiff 配对使用', () => {
    setTimeTo(new Date(2026, 7, 2).getTime())
    expect(getTodayString()).toBe('2026-08-02')
    resetTimeDiff()
    expect(getTodayString()).toBe(formatDate(new Date()))
  })
})
