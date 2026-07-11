import { currentWordBankIdAtom, wordBanksAtom } from '@/store'
import { Provider, createStore, useAtomValue } from 'jotai'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useTypingInitializer } from './useTypingInitializer'

const clearUtools = () => {
  delete (window as Window & { utools?: Window['utools'] }).utools
}

const customWordBankA = {
  id: 'x-dict-alpha',
  name: 'Alpha',
  description: 'Alpha words',
  category: 'custom',
  tags: ['alpha'],
  url: '',
  length: 2,
  language: 'en' as const,
  languageCategory: 'custom' as const,
  chapterCount: 1,
}

const customWordBankB = {
  id: 'x-dict-beta',
  name: 'Beta',
  description: 'Beta words',
  category: 'custom',
  tags: ['beta'],
  url: '',
  length: 1,
  language: 'en' as const,
  languageCategory: 'custom' as const,
  chapterCount: 1,
}

function TypingInitializerProbe() {
  const { isInitialized, currentWordBank } = useTypingInitializer()
  const currentWordBankId = useAtomValue(currentWordBankIdAtom)
  const wordBanks = useAtomValue(wordBanksAtom)
  const location = useLocation()

  return (
    <div>
      <div data-testid="is-initialized">{String(isInitialized)}</div>
      <div data-testid="current-word-bank-id">{currentWordBankId}</div>
      <div data-testid="current-word-bank-name">{currentWordBank?.name ?? ''}</div>
      <div data-testid="word-bank-count">{String(wordBanks.length)}</div>
      <div data-testid="pathname">{location.pathname}</div>
    </div>
  )
}

const renderProbe = (): ReactElement => (
  <Routes>
    <Route path="*" element={<TypingInitializerProbe />} />
  </Routes>
)

const renderWithProviders = () => {
  const store = createStore()

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {renderProbe()}
      </MemoryRouter>
    </Provider>,
  )
}

describe('useTypingInitializer', () => {
  beforeEach(() => {
    localStorage.clear()
    clearUtools()
  })

  it('restores the persisted current word bank in web runtime', async () => {
    localStorage.setItem('local-wordbank-config', JSON.stringify([customWordBankA, customWordBankB]))
    localStorage.setItem('currentWordBank', JSON.stringify(customWordBankB.id))

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('is-initialized')).toHaveTextContent('true')
      expect(screen.getByTestId('word-bank-count')).toHaveTextContent('2')
      expect(screen.getByTestId('current-word-bank-id')).toHaveTextContent(customWordBankB.id)
      expect(screen.getByTestId('current-word-bank-name')).toHaveTextContent(customWordBankB.name)
      expect(screen.getByTestId('pathname')).toHaveTextContent('/')
    })
  })

  it('selects the first available word bank when no current selection exists', async () => {
    localStorage.setItem('local-wordbank-config', JSON.stringify([customWordBankA, customWordBankB]))

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('current-word-bank-id')).toHaveTextContent(customWordBankA.id)
      expect(screen.getByTestId('current-word-bank-name')).toHaveTextContent(customWordBankA.name)
    })

    expect(localStorage.getItem('currentWordBank')).toBe(JSON.stringify(customWordBankA.id))
  })

  it('navigates to gallery when no word banks are available', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('is-initialized')).toHaveTextContent('true')
      expect(screen.getByTestId('word-bank-count')).toHaveTextContent('0')
      expect(screen.getByTestId('pathname')).toHaveTextContent('/gallery')
    })
  })
})
