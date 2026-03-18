import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LearningPageLayout } from './LearningPageLayout'

// Mock child components
vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

vi.mock('@/components/Header', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <header data-testid="header">{children}</header>
  ),
}))

vi.mock('@/components/Tooltip', () => ({
  default: ({ content, children }: { content: string; children: React.ReactNode }) => (
    <div data-testid="tooltip" data-content={content}>{children}</div>
  ),
}))

vi.mock('./PronunciationSwitcher', () => ({
  default: () => <div data-testid="pronunciation-switcher" />,
}))

vi.mock('./Switcher', () => ({
  default: () => <div data-testid="switcher" />,
}))

vi.mock('./StartButton', () => ({
  default: ({ isLoading }: { isLoading: boolean }) => (
    <button data-testid="start-button" disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Start'}
    </button>
  ),
}))

vi.mock('./Speed', () => ({
  default: () => <div data-testid="speed" />,
}))

vi.mock('./WordList', () => ({
  default: () => <div data-testid="word-list" />,
}))

describe('LearningPageLayout', () => {
  const defaultProps = {
    wordBankName: 'Test Dictionary',
    isImmersiveMode: false,
    children: <div data-testid="child-content">Child Content</div>,
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('应该正确渲染子组件', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })

    it('应该显示词库名称', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} />
        </MemoryRouter>
      )

      expect(screen.getByText('Test Dictionary')).toBeInTheDocument()
    })

    it('应该渲染必要的子组件', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('pronunciation-switcher')).toBeInTheDocument()
      expect(screen.getByTestId('switcher')).toBeInTheDocument()
      expect(screen.getByTestId('start-button')).toBeInTheDocument()
      expect(screen.getByTestId('speed')).toBeInTheDocument()
      expect(screen.getByTestId('word-list')).toBeInTheDocument()
    })
  })

  describe('沉浸模式', () => {
    it('沉浸模式下不应该显示 Header', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} isImmersiveMode={true} />
        </MemoryRouter>
      )

      expect(screen.queryByTestId('header')).not.toBeInTheDocument()
    })

    it('沉浸模式下不应该显示 Speed 组件', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} isImmersiveMode={true} />
        </MemoryRouter>
      )

      expect(screen.queryByTestId('speed')).not.toBeInTheDocument()
    })

    it('沉浸模式下不应该显示 WordList', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} isImmersiveMode={true} />
        </MemoryRouter>
      )

      expect(screen.queryByTestId('word-list')).not.toBeInTheDocument()
    })
  })

  describe('Header 额外内容', () => {
    it('应该渲染 headerExtra 内容', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout
            {...defaultProps}
            headerExtra={<div data-testid="extra-content">Extra</div>}
          />
        </MemoryRouter>
      )

      expect(screen.getByTestId('extra-content')).toBeInTheDocument()
    })
  })

  describe('退出按钮', () => {
    it('当 showExitButton 为 false 时不应该显示退出按钮', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} showExitButton={false} />
        </MemoryRouter>
      )

      expect(screen.queryByText('退出')).not.toBeInTheDocument()
    })

    it('当 showExitButton 为 true 且有 onExit 时应该显示退出按钮', () => {
      const mockOnExit = vi.fn()
      render(
        <MemoryRouter>
          <LearningPageLayout
            {...defaultProps}
            showExitButton={true}
            onExit={mockOnExit}
          />
        </MemoryRouter>
      )

      expect(screen.getByText('退出')).toBeInTheDocument()
    })

    it('点击退出按钮应该调用 onExit', () => {
      const mockOnExit = vi.fn()
      render(
        <MemoryRouter>
          <LearningPageLayout
            {...defaultProps}
            showExitButton={true}
            onExit={mockOnExit}
          />
        </MemoryRouter>
      )

      screen.getByText('退出').click()
      expect(mockOnExit).toHaveBeenCalled()
    })

    it('应该显示自定义退出按钮文本', () => {
      const mockOnExit = vi.fn()
      render(
        <MemoryRouter>
          <LearningPageLayout
            {...defaultProps}
            showExitButton={true}
            onExit={mockOnExit}
            exitButtonText="退出重复学习"
          />
        </MemoryRouter>
      )

      expect(screen.getByText('退出重复学习')).toBeInTheDocument()
    })
  })

  describe('词库导航链接', () => {
    it('应该包含正确的导航链接', () => {
      render(
        <MemoryRouter>
          <LearningPageLayout {...defaultProps} />
        </MemoryRouter>
      )

      const link = screen.getByRole('link', { name: 'Test Dictionary' })
      expect(link).toHaveAttribute('href', '/gallery')
    })
  })
})