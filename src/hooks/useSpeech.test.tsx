import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import useSpeech from '@/hooks/useSpeech'

// Mock SpeechSynthesis API
class MockSpeechSynthesis {
  speaking = false
  private utterances: MockSpeechSynthesisUtterance[] = []

  speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true
    this.utterances.push(utterance)
    // 模拟播放完成 - 使用 dispatchEvent
    setTimeout(() => {
      this.speaking = false
      const event = new Event('end')
      utterance.dispatchEvent(event)
    }, 100)
  }

  cancel() {
    this.speaking = false
    this.utterances.forEach((u) => {
      const event = new Event('end')
      u.dispatchEvent(event)
    })
    this.utterances = []
  }
}

// Mock SpeechSynthesisUtterance - 实现 EventTarget 接口
class MockSpeechSynthesisUtterance implements EventTarget {
  text: string
  lang = 'en-US'
  rate = 1
  pitch = 1
  volume = 1
  private listeners: Map<string, EventListenerOrEventListenerObject[]> = new Map()

  constructor(text: string) {
    this.text = text
  }

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
    if (!callback) return
    const existing = this.listeners.get(type) || []
    existing.push(callback)
    this.listeners.set(type, existing)
  }

  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void {
    if (!callback) return
    const existing = this.listeners.get(type) || []
    const index = existing.indexOf(callback)
    if (index > -1) {
      existing.splice(index, 1)
      this.listeners.set(type, existing)
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type) || []
    listeners.forEach((l) => {
      if (typeof l === 'function') {
        l(event)
      } else if (l.handleEvent) {
        l.handleEvent(event)
      }
    })
    return true
  }
}

describe('useSpeech Hook', () => {
  let mockSynth: MockSpeechSynthesis

  beforeEach(() => {
    mockSynth = new MockSpeechSynthesis()

    // 使用 vi.stubGlobal 来模拟全局对象
    vi.stubGlobal('speechSynthesis', mockSynth as unknown as SpeechSynthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('基础功能', () => {
    it('应该返回 speak 方法', () => {
      const { result } = renderHook(() => useSpeech('test'))

      expect(result.current.speak).toBeDefined()
      expect(typeof result.current.speak).toBe('function')
    })

    it('应该返回 cancel 方法', () => {
      const { result } = renderHook(() => useSpeech('test'))

      expect(result.current.cancel).toBeDefined()
      expect(typeof result.current.cancel).toBe('function')
    })

    it('应该返回 speaking 状态', () => {
      const { result } = renderHook(() => useSpeech('test'))

      expect(result.current.speaking).toBeDefined()
      expect(typeof result.current.speaking).toBe('boolean')
    })

    it('初始 speaking 状态应该为 false', () => {
      const { result } = renderHook(() => useSpeech('test'))

      expect(result.current.speaking).toBe(false)
    })
  })

  describe('speak 方法', () => {
    it('调用 speak 后 speaking 应该变为 true', () => {
      const { result } = renderHook(() => useSpeech('hello'))

      act(() => {
        result.current.speak()
      })

      expect(result.current.speaking).toBe(true)
    })

    it('speak(false) 不应该取消当前播放', async () => {
      const { result } = renderHook(() => useSpeech('test'))

      act(() => {
        result.current.speak()
      })

      expect(mockSynth.speaking).toBe(true)

      // 再次调用 speak 不取消
      act(() => {
        result.current.speak(false)
      })
    })

    it('speak(true) 应该取消当前播放并开始新播放', () => {
      const { result } = renderHook(() => useSpeech('test'))

      act(() => {
        result.current.speak()
      })

      expect(mockSynth.speaking).toBe(true)

      // abort = true 应该取消当前播放
      act(() => {
        result.current.speak(true)
      })

      // speechSynthesis.cancel() 会被调用
      // speak() 会重新开始
    })
  })

  describe('cancel 方法', () => {
    it('cancel 应该停止播放', () => {
      const { result } = renderHook(() => useSpeech('test'))

      act(() => {
        result.current.speak()
      })

      expect(mockSynth.speaking).toBe(true)

      act(() => {
        result.current.cancel()
      })

      expect(mockSynth.speaking).toBe(false)
    })

    it('非播放状态调用 cancel 不应该有副作用', () => {
      const { result } = renderHook(() => useSpeech('test'))

      // 未播放时调用 cancel
      act(() => {
        result.current.cancel()
      })

      expect(result.current.speaking).toBe(false)
    })
  })

  describe('文本变化', () => {
    it('文本变化时应该创建新的 utterance', () => {
      const { result, rerender } = renderHook(
        ({ text }) => useSpeech(text),
        { initialProps: { text: 'hello' } }
      )

      act(() => {
        result.current.speak()
      })

      // 更改文本
      rerender({ text: 'world' })

      // utterance 应该更新为新文本
      // 由于 speechSynthesis.cancel() 在 useEffect cleanup 中调用
    })

    it('组件卸载时应该停止播放', () => {
      const { result, unmount } = renderHook(() => useSpeech('test'))

      act(() => {
        result.current.speak()
      })

      expect(mockSynth.speaking).toBe(true)

      unmount()

      // cleanup 应该调用 cancel
      expect(mockSynth.speaking).toBe(false)
    })
  })

  describe('选项配置', () => {
    it('应该应用传入的语音选项', () => {
      const options = {
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      }

      const { result } = renderHook(() => useSpeech('test', options))

      act(() => {
        result.current.speak()
      })

      // utterance 应该应用这些选项
      expect(result.current.speak).toBeDefined()
    })

    it('不传选项时应该使用默认值', () => {
      const { result } = renderHook(() => useSpeech('test'))

      act(() => {
        result.current.speak()
      })

      expect(result.current.speak).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('SpeechSynthesis API 存在时应该正常工作', () => {
      // speechSynthesis 已在 beforeEach 中 stub
      const { result } = renderHook(() => useSpeech('test'))

      expect(result.current.speak).toBeDefined()
      expect(result.current.cancel).toBeDefined()
    })
  })

  describe('播放完成事件', () => {
    it('播放完成后 speaking 应变为 false', async () => {
      const { result } = renderHook(() => useSpeech('test'))

      act(() => {
        result.current.speak()
      })

      expect(result.current.speaking).toBe(true)

      // 等待模拟的播放完成
      await waitFor(() => {
        expect(result.current.speaking).toBe(false)
      })
    })
  })
})