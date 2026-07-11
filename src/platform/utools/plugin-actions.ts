/**
 * 封装插件级别的操作：清空数据、重启插件
 */

/**
 * 清空所有用户数据
 * 返回 true 表示成功，false 表示失败
 */
export function clearAllData(): boolean {
  if (typeof window === 'undefined') return false

  // 浏览器环境：清空 localStorage
  if (!window.utools) {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  }

  // uTools 环境：使用 preload.js 提供的 clearAllData
  return window.clearAllData()
}

/**
 * 重启插件
 */
export function restartPlugin(): void {
  if (typeof window === 'undefined') return

  // uTools 环境：退出插件后重新打开
  if (window.utools) {
    window.restartPlugin()
  } else {
    // 浏览器环境：刷新页面
    window.location.reload()
  }
}