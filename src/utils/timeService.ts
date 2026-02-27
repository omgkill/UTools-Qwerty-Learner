// 时间服务，统一管理时间获取，便于测试时模拟时间

// 尝试导入测试时间服务，如果不存在则使用默认的Date.now
let getCurrentTime: () => number

try {
  const { getCurrentTime: importedGetCurrentTime } = require('@/test/timeService')
  getCurrentTime = importedGetCurrentTime
} catch {
  getCurrentTime = Date.now
}

/**
 * 获取当前时间戳
 * @returns 当前时间戳（毫秒）
 */
export function now(): number {
  return getCurrentTime()
}

/**
 * 获取当前时间的Date对象
 * @returns 当前时间的Date对象
 */
export function getCurrentDate(): Date {
  return new Date(getCurrentTime())
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 * @returns 今天的日期字符串
 */
export function getTodayString(): string {
  return new Date(getCurrentTime()).toISOString().split('T')[0]
}
