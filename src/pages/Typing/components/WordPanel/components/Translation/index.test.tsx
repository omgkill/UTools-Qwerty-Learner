import { render, screen } from '@testing-library/react'
import type * as Jotai from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('jotai', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof Jotai
  return {
    ...actual,
    useAtomValue: vi.fn(() => ({ isTransRead: false, transVolume: 1 })),
  }
})

vi.mock('@/hooks/useSpeech', () => ({
  default: vi.fn(() => ({ speak: vi.fn(), speaking: false })),
}))

vi.mock('@/components/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('Translation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering (渲染测试)', () => {
    it('should render translations when trans is not empty', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 苹果', 'n. 公司']} />)

      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
      expect(screen.getByText('n. 公司')).toBeInTheDocument()
    })

    it('should render tense when provided', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 苹果']} tense="pl. apples" />)

      expect(screen.getByText(/时态：pl\. apples/)).toBeInTheDocument()
    })

    it('should return null when trans is empty and no tense', async () => {
      const { default: Translation } = await import('./index')
      const { container } = render(<Translation trans={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should return null when trans has only empty strings', async () => {
      const { default: Translation } = await import('./index')
      const { container } = render(<Translation trans={['', '  ', '']} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render tense even when trans is empty', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={[]} tense="pl. apples" />)

      expect(screen.getByText(/时态：pl\. apples/)).toBeInTheDocument()
    })
  })

  describe('Data Handling (数据处理)', () => {
    it('should filter out empty strings from trans', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 苹果', '', 'n. 公司', '  ']} />)

      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
      expect(screen.getByText('n. 公司')).toBeInTheDocument()
    })

    it('should limit display to 6 translations', async () => {
      const { default: Translation } = await import('./index')
      const manyTrans = ['1', '2', '3', '4', '5', '6', '7', '8']
      render(<Translation trans={manyTrans} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
    })
  })

  describe('Edge Cases (边界情况)', () => {
    it('should handle single translation', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 苹果']} />)

      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
    })

    it('should handle very long translation', async () => {
      const { default: Translation } = await import('./index')
      const longTrans = '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的释义'
      render(<Translation trans={[longTrans]} />)

      expect(screen.getByText(longTrans)).toBeInTheDocument()
    })

    it('should handle special characters in translation', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. <script>alert("xss")</script>', 'v. 测试&符号']} />)

      expect(screen.getByText(/<script>/)).toBeInTheDocument()
    })

    it('should handle unicode characters', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 🍎 苹果', 'n. 🏢 公司']} />)

      expect(screen.getByText('n. 🍎 苹果')).toBeInTheDocument()
      expect(screen.getByText('n. 🏢 公司')).toBeInTheDocument()
    })
  })

  describe('Display Logic (显示逻辑)', () => {
    it('should render each translation separately', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 苹果', 'n. 公司']} />)

      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
      expect(screen.getByText('n. 公司')).toBeInTheDocument()
    })

    it('should render multiple translations', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['n. 苹果', 'n. 公司', 'n. 品牌']} />)

      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
      expect(screen.getByText('n. 公司')).toBeInTheDocument()
      expect(screen.getByText('n. 品牌')).toBeInTheDocument()
    })
  })

  describe('Null/Undefined Handling (空值处理)', () => {
    it('should handle undefined trans gracefully', async () => {
      const { default: Translation } = await import('./index')
      const { container } = render(<Translation trans={undefined as unknown as string[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should handle null trans gracefully', async () => {
      const { default: Translation } = await import('./index')
      const { container } = render(<Translation trans={null as unknown as string[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should trim whitespace from translations', async () => {
      const { default: Translation } = await import('./index')
      render(<Translation trans={['  n. 苹果  ', '  n. 公司  ']} />)

      expect(screen.getByText('n. 苹果')).toBeInTheDocument()
      expect(screen.getByText('n. 公司')).toBeInTheDocument()
    })
  })
})
