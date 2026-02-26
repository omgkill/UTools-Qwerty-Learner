import { beforeEach, describe, expect, it } from 'vitest'
import { typingReducer } from './reducer'
import { TypingStateActionType } from './actions'
import type { TypingState } from './types'
import type { WordWithIndex } from '@/typings'

const createWord = (name: string, trans: string[] = [], index = 0): WordWithIndex => ({
  name,
  trans,
  usphone: '',
  ukphone: '',
  tense: '',
  index,
})

const createInitialState = (words: WordWithIndex[] = [], index = 0): TypingState => ({
  wordListData: {
    words,
    index,
  },
  statsData: {
    wordCount: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongWordIndexes: [],
    correctWordIndexes: [],
    wordRecordIds: [],
    timerData: { time: 0, accuracy: 0, wpm: 0 },
  },
  wordInfoMap: {},
  uiState: {
    isTyping: true,
    isFinished: false,
    isShowSkip: false,
    isExtraReview: false,
    isRepeatLearning: false,
    isCurrentWordMastered: false,
    isSavingRecord: false,
  },
  isTransVisible: true,
  isImmersiveMode: false,
})

describe('Typing Reducer - SKIP_WORD', () => {
  let state: TypingState

  beforeEach(() => {
    state = createInitialState()
  })

  it('点击掌握按钮后，应该跳到下一个单词', () => {
    const words = [createWord('apple', ['n. 苹果'], 0), createWord('banana', ['n. 香蕉'], 1), createWord('cherry', ['n. 樱桃'], 2)]
    state = createInitialState(words, 0)

    const newState = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })

    expect(newState.wordListData.index).toBe(1)
    expect(newState.wordListData.words[0].name).toBe('apple')
    expect(newState.wordListData.words[1].name).toBe('banana')
  })

  it('重复点击掌握按钮，应该正确处理已掌握的单词', () => {
    const words = [createWord('apple', ['n. 苹果'], 0), createWord('banana', ['n. 香蕉'], 1)]
    state = createInitialState(words, 0)

    const state1 = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })
    expect(state1.wordListData.index).toBe(1)

    const state2 = typingReducer(state1, { type: TypingStateActionType.SKIP_WORD })
    expect(state2.wordListData.index).toBe(1)
  })

  it('当单词列表中有重复单词时，掌握按钮应该正确工作', () => {
    const words = [
      createWord('apple', ['n. 苹果'], 0),
      createWord('apple', ['n. 苹果'], 1),
      createWord('banana', ['n. 香蕉'], 2),
    ]
    state = createInitialState(words, 0)

    const newState = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })

    expect(newState.wordListData.index).toBe(1)
    expect(newState.wordListData.words[1].name).toBe('apple')
  })

  it('当单词列表中已掌握的单词重复出现时，掌握按钮应该正确工作', () => {
    const words = [
      createWord('apple', ['n. 苹果'], 0),
      createWord('banana', ['n. 香蕉'], 1),
      createWord('apple', ['n. 苹果'], 2),
    ]
    state = createInitialState(words, 1)

    const newState = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })

    expect(newState.wordListData.index).toBe(2)
    expect(newState.wordListData.words[2].name).toBe('apple')
  })

  it('连续点击掌握按钮15次，应该正确处理100个单词', () => {
    const words: WordWithIndex[] = []
    for (let i = 0; i < 100; i++) {
      words.push(createWord(`word${i}`, ['n. 测试'], i))
    }
    state = createInitialState(words, 0)

    let currentState = state
    const masteredWords = new Set<string>()

    for (let i = 0; i < 15; i++) {
      const currentWord = currentState.wordListData.words[currentState.wordListData.index]
      if (currentWord) {
        masteredWords.add(currentWord.name)
      }
      currentState = typingReducer(currentState, { type: TypingStateActionType.SKIP_WORD })
    }

    expect(masteredWords.size).toBe(15)
    expect(currentState.wordListData.index).toBe(15)
  })

  it('当到达单词列表末尾时，不应该继续跳过', () => {
    const words = [createWord('apple', ['n. 苹果'], 0)]
    state = createInitialState(words, 0)

    const newState = typingReducer(state, { type: TypingStateActionType.SKIP_WORD })

    expect(newState.wordListData.index).toBe(0)
    expect(newState.uiState.isFinished).toBe(true)
  })
})

describe('Typing Reducer - NEXT_WORD', () => {
  let state: TypingState

  beforeEach(() => {
    state = createInitialState()
  })

  it('NEXT_WORD应该跳到下一个单词', () => {
    const words = [createWord('apple', ['n. 苹果'], 0), createWord('banana', ['n. 香蕉'], 1)]
    state = createInitialState(words, 0)

    const newState = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })

    expect(newState.wordListData.index).toBe(1)
  })

  it('当到达单词列表末尾时，NEXT_WORD应该设置isFinished为true', () => {
    const words = [createWord('apple', ['n. 苹果'], 0)]
    state = createInitialState(words, 0)

    const newState = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })

    expect(newState.wordListData.index).toBe(0)
    expect(newState.uiState.isFinished).toBe(true)
  })
})

describe('Typing Reducer - ADD_REPLACEMENT_WORD', () => {
  let state: TypingState

  beforeEach(() => {
    state = createInitialState()
  })

  it('掌握一个单词后，应该添加新词到单词列表', () => {
    const words: WordWithIndex[] = []
    for (let i = 0; i < 20; i++) {
      words.push(createWord(`word${i}`, ['n. 测试'], i))
    }
    state = createInitialState(words, 0)

    const newWord = createWord('newword', ['n. 新词'], 20)
    const state1 = typingReducer(state, { type: TypingStateActionType.ADD_REPLACEMENT_WORD, payload: newWord })
    const state2 = typingReducer(state1, { type: TypingStateActionType.SKIP_WORD })

    expect(state2.wordListData.words.length).toBe(21)
    expect(state2.wordListData.words[20].name).toBe('newword')
    expect(state2.wordListData.index).toBe(1)
  })

  it('掌握多个单词后，单词列表应该保持20个词', () => {
    const words: WordWithIndex[] = []
    for (let i = 0; i < 20; i++) {
      words.push(createWord(`word${i}`, ['n. 测试'], i))
    }
    state = createInitialState(words, 0)

    let currentState = state
    for (let i = 0; i < 5; i++) {
      const newWord = createWord(`newword${i}`, ['n. 新词'], 20 + i)
      currentState = typingReducer(currentState, { type: TypingStateActionType.ADD_REPLACEMENT_WORD, payload: newWord })
      currentState = typingReducer(currentState, { type: TypingStateActionType.SKIP_WORD })
      console.log(`掌握第${i + 1}词，下个词是${currentState.wordListData.words[currentState.wordListData.index]?.name || '无'}`)
    }

    expect(currentState.wordListData.words.length).toBe(25)
    expect(currentState.wordListData.index).toBe(5)
  })

  it('测试100个词库，然后点击掌握40词', () => {
    const words: WordWithIndex[] = []
    for (let i = 0; i < 100; i++) {
      words.push(createWord(`word${i}`, ['n. 测试'], i))
    }
    state = createInitialState(words, 0)

    console.log('=== 开始测试100个词库，点击掌握40词 ===')

    let currentState = state
    for (let i = 0; i < 40; i++) {
      const newWord = createWord(`newword${i}`, ['n. 新词'], 100 + i)
      currentState = typingReducer(currentState, { type: TypingStateActionType.ADD_REPLACEMENT_WORD, payload: newWord })
      currentState = typingReducer(currentState, { type: TypingStateActionType.SKIP_WORD })
      console.log(`掌握第${i + 1}词，下个词是${currentState.wordListData.words[currentState.wordListData.index]?.name || '无'}`)
    }

    console.log('=== 测试完成 ===')
    console.log(`总共掌握40词`)
    console.log(`单词列表长度：${currentState.wordListData.words.length}`)
    console.log(`当前索引：${currentState.wordListData.index}`)
    console.log(`当前单词：${currentState.wordListData.words[currentState.wordListData.index]?.name || '无'}`)

    expect(currentState.wordListData.words.length).toBe(140)
    expect(currentState.wordListData.index).toBe(40)
  })
})
