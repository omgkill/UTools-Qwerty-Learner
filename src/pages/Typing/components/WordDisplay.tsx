import { Letter } from './Letter'
import { createInitialInputState, processInput, clearError, type WordInputState } from './WordInputProcessor'
import { useState, useEffect, useCallback } from 'react'

interface WordDisplayProps {
  word: string
  onComplete: () => void
  ignoreCase?: boolean
}

export function WordDisplay({ word, onComplete, ignoreCase = true }: WordDisplayProps) {
  const [inputState, setInputState] = useState<WordInputState>(() => createInitialInputState(word))

  // 单词变化时重置状态
  useEffect(() => {
    setInputState(createInitialInputState(word))
  }, [word])

  // 错误后自动清除
  useEffect(() => {
    if (inputState.hasError) {
      const timer = setTimeout(() => {
        setInputState(clearError(inputState))
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [inputState.hasError])

  // 完成时调用回调
  useEffect(() => {
    if (inputState.isComplete) {
      onComplete()
    }
  }, [inputState.isComplete, onComplete])

  // 处理键盘输入
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 忽略功能键
    if (e.altKey || e.ctrlKey || e.metaKey) return

    const char = e.key
    // 只处理单字符输入
    if (char.length !== 1) return

    // 检测中文输入法
    if (/[一-龥]/.test(char)) {
      return // 忽略中文输入
    }

    setInputState(prev => processInput(prev, word, char, ignoreCase))
  }, [word, ignoreCase])

  // 监听键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const displayWord = word.replace(/ /g, '␣')

  return (
    <div className="flex items-center justify-center" data-testid="word-display">
      {displayWord.split('').map((letter, index) => (
        <Letter key={index} letter={letter} state={inputState.letterStates[index]} />
      ))}
    </div>
  )
}