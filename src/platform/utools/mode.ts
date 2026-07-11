/**
 * 封装 uTools 模式相关 API
 */

/**
 * 获取当前模式
 */
export function getMode(): string {
  if (typeof window === 'undefined') return ''
  if (!window.getMode) return ''
  return window.getMode()
}

/**
 * 监听 uTools 模式变化
 * @returns cleanup 函数
 */
export function onModeChange(callback: (mode: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!window.utools) return () => {}

  const handler = (e: CustomEvent<{ mode: string }>) => {
    callback(e.detail.mode)
  }

  window.addEventListener('utools-mode-change', handler as EventListener)

  return () => {
    window.removeEventListener('utools-mode-change', handler as EventListener)
  }
}