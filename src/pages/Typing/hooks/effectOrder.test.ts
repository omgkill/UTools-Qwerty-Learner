import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TypingStateActionType, initialState, typingReducer } from '@/pages/Typing/store'
import type { Word, WordWithIndex } from '@/typings'
import { db } from '@/utils/db'
import { DailyRecordService, WordProgressService, getRepeatLearningWords, loadTypingSession } from '@/services'
import { RepeatLearningManager } from '@/pages/Typing/hooks/RepeatLearningManager'
import { getTodayStartTime } from '@/utils/timeService'
import 'fake-indexeddb/auto'

const createWordList = (count: number): Word[] => {
  const words: Word[] = []
  for (let i = 0; i < count; i++) {
    words.push({
      name: `word${i}`,
      trans: [`n. 单词${i}`],
      usphone: '',
      ukphone: '',
      tense: '',
    })
  }
  return words
}

// 更精确地模拟 React 的 useEffect 执行顺序
class ReactSimulation {
  private effects: Array<() => Promise<void>> = []
  private cleanupFns: Array<() => void> = []
  
  // 模拟 useEffect，收集 effect 回调
  useEffect(callback: () => void | (() => void), deps: any[]) {
    const cleanup = callback()
    if (cleanup) {
      this.cleanupFns.push(cleanup)
    }
  }
  
  // 模拟 useEffect 中的异步操作
  useEffectAsync(callback: () => Promise<void>) {
    this.effects.push(callback)
  }
  
  // 执行所有收集的异步 effects
  async runEffects() {
    for (const effect of this.effects) {
      await effect()
    }
    this.effects = []
  }
  
  // 清理
  cleanup() {
    for (const fn of this.cleanupFns) {
      fn()
    }
    this.cleanupFns = []
  }
}

describe('精确模拟 React useEffect 执行顺序', () => {
  const dictId = 'test-dict-effect-order'
  let wordProgressService: WordProgressService
  let dailyRecordService: DailyRecordService

  beforeEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    await db.typingStates.clear()
    wordProgressService = new WordProgressService(db)
    dailyRecordService = new DailyRecordService(db)
  })

  afterEach(async () => {
    await db.wordProgress.clear()
    await db.dailyRecords.clear()
    await db.wordRecords.clear()
    await db.typingStates.clear()
  })

  it('模拟完整的组件生命周期：挂载 → 进入重复学习 → 学习 → 卸载 → 重新挂载', async () => {
    // ========== 准备数据 ==========
    const wordList = createWordList(100)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))

    const record = await dailyRecordService.getTodayRecord(dictId)
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
            getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })

    // 学习20个单词
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    for (let i = 0; i < 20; i++) {
      await db.wordRecords.add({
        word: session.learningWords[i].name,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
    }

    const repeatWords = await getRepeatLearningWords({
      currentDictId: dictId,
      wordList,
      listWordRecordsInRange: async (dictIdParam, start, end) => {
        return db.wordRecords
          .where('[dict+timeStamp]')
          .between([dictIdParam, start], [dictIdParam, end])
          .toArray()
      },
    })

    console.log(`准备完成：${repeatWords.length} 个重复学习单词`)

    // ========== 第一次挂载：正常学习 → 进入重复学习 ==========
    console.log('\n========== 第一次挂载 ==========')
    
    // 模拟 React state
    let mode: 'normal' | 'repeat' | null = null
    let isModeInitialized = false
    let state = initialState
    
    const dispatch = (action: any) => {
      state = typingReducer(state, action)
      console.log(`dispatch ${action.type}: index=${state.wordListData.index}`)
    }

    // 模拟 useTypingMode
    const managerForMode = new RepeatLearningManager()
    const managerForSync = new RepeatLearningManager()
    
    // useRef 模拟
    const isRestoredRef = { current: false }
    const isActiveRef = { current: false }
    const hasCheckedForRestoreRef = { current: false }

    // 模拟组件挂载时 useEffect 的执行顺序
    // 1. useTypingMode 的 useEffect
    console.log('1. useTypingMode useEffect 执行')
    mode = 'normal'  // 默认设置
    isModeInitialized = true
    console.log(`   mode=${mode}, isModeInitialized=${isModeInitialized}`)

    // 2. useRepeatLearningSync 的第一个 useEffect（checkAndRestore）
    console.log('2. useRepeatLearningSync 第一个 useEffect 执行')
    const checkAndRestore = async () => {
      if (!dictId) return
      if (hasCheckedForRestoreRef.current) return

      const savedState = await managerForSync.initialize(dictId)
      console.log(`   initialize 结果: ${savedState ? `有记录, index=${savedState.currentIndex}` : '无记录'}`)
      
      if (savedState && savedState.learningWords.length > 0) {
        // onStateRestored 回调
        console.log(`   onStateRestored 被调用: words.length=${savedState.learningWords.length}, index=${savedState.currentIndex}`)
        
        // 模拟 handleRepeatLearningRestored
        dispatch({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: savedState.learningWords },
        })
        dispatch({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: savedState.currentIndex,
        })
        dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
        
        // switchToRepeat()
        mode = 'repeat'
        console.log(`   switchToRepeat() 被调用, mode=${mode}`)
        
        hasCheckedForRestoreRef.current = true
      }
    }
    await checkAndRestore()

    // 3. 此时 mode 应该还是 'normal'（因为没有重复学习记录）
    console.log(`3. checkAndRestore 后: mode=${mode}`)

    // 4. 用户点击"重复学习"按钮
    console.log('\n4. 用户点击"重复学习"按钮')
    
    // handleStartRepeatLearning
    console.log('   handleStartRepeatLearning 开始执行')
    
    // startRepeatNew
    await managerForSync.start(dictId, repeatWords)
    isRestoredRef.current = true
    console.log(`   startRepeatNew 完成, isRestoredRef=${isRestoredRef.current}`)
    
    // dispatch SET_WORDS 和 SET_CURRENT_INDEX
    dispatch({ type: TypingStateActionType.SET_WORDS, payload: { words: repeatWords } })
    dispatch({ type: TypingStateActionType.SET_CURRENT_INDEX, payload: 0 })
    dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
    
    // switchToRepeat
    mode = 'repeat'
    console.log(`   switchToRepeat 完成, mode=${mode}`)

    // 5. mode 变化后，isActive 变为 true
    const isActive = mode === 'repeat' && isModeInitialized
    isActiveRef.current = isActive
    console.log(`5. mode 变化后: isActive=${isActive}, isActiveRef.current=${isActiveRef.current}`)

    // 6. useRepeatLearningSync 的第二个 useEffect（restore）
    console.log('6. useRepeatLearningSync 第二个 useEffect 执行')
    const restore = async () => {
      if (!isActive) {
        isRestoredRef.current = false
        console.log('   isActive=false, 跳过')
        return
      }
      if (!dictId) return
      if (isRestoredRef.current) {
        console.log(`   isRestoredRef=true, 跳过`)
        return
      }

      const savedState = await managerForSync.initialize(dictId)
      if (savedState && savedState.learningWords.length > 0) {
        dispatch({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: savedState.learningWords },
        })
        dispatch({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: savedState.currentIndex,
        })
        isRestoredRef.current = true
      }
    }
    await restore()

    console.log(`第一次挂载完成: index=${state.wordListData.index}`)

    // 7. 学习5个单词
    console.log('\n7. 学习5个单词')
    for (let i = 0; i < 5; i++) {
      dispatch({ type: TypingStateActionType.NEXT_WORD })
      
      // saveProgress
      if (isActiveRef.current) {
        await managerForSync.updateIndex(dictId, state.wordListData.index)
        console.log(`   学习第${i + 1}个单词后保存: index=${state.wordListData.index}`)
      }
    }

    console.log(`学习完成: index=${state.wordListData.index}`)
    expect(state.wordListData.index).toBe(5)

    // ========== 模拟组件卸载 ==========
    console.log('\n========== 组件卸载 ==========')
    // React 会销毁所有 ref，但 IndexedDB 数据保留

    // ========== 第二次挂载：重新打开界面 ==========
    console.log('\n========== 第二次挂载 ==========')
    
    // 重置所有状态
    mode = null
    isModeInitialized = false
    state = initialState
    const isRestoredRef2 = { current: false }
    const isActiveRef2 = { current: false }
    const hasCheckedForRestoreRef2 = { current: false }
    
    // 新的 manager 实例
    const managerForMode2 = new RepeatLearningManager()
    const managerForSync2 = new RepeatLearningManager()

    const dispatch2 = (action: any) => {
      state = typingReducer(state, action)
      console.log(`dispatch ${action.type}: index=${state.wordListData.index}`)
    }

    // 1. useTypingMode 的 useEffect
    console.log('1. useTypingMode useEffect 执行')
    mode = 'normal'  // 默认设置
    isModeInitialized = true
    console.log(`   mode=${mode}, isModeInitialized=${isModeInitialized}`)

    // 2. useRepeatLearningSync 的第一个 useEffect（checkAndRestore）
    console.log('2. useRepeatLearningSync 第一个 useEffect 执行')
    const checkAndRestore2 = async () => {
      if (!dictId) return
      if (hasCheckedForRestoreRef2.current) return

      const savedState = await managerForSync2.initialize(dictId)
      console.log(`   initialize 结果: ${savedState ? `有记录, index=${savedState.currentIndex}` : '无记录'}`)
      
      if (savedState && savedState.learningWords.length > 0) {
        console.log(`   onStateRestored 被调用: words.length=${savedState.learningWords.length}, index=${savedState.currentIndex}`)
        
        dispatch2({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: savedState.learningWords },
        })
        dispatch2({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: savedState.currentIndex,
        })
        dispatch2({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
        
        mode = 'repeat'
        console.log(`   switchToRepeat() 被调用, mode=${mode}`)
        
        hasCheckedForRestoreRef2.current = true
      }
    }
    await checkAndRestore2()

    // 3. 检查恢复后的状态
    console.log(`\n第二次挂载完成: index=${state.wordListData.index}`)
    console.log(`当前单词: ${state.wordListData.words[state.wordListData.index]?.name}`)

    // 验证
    expect(state.wordListData.index).toBe(5)
    expect(state.wordListData.words[state.wordListData.index]?.name).toBe(repeatWords[5].name)
  })

  it('关键场景：验证 onStateRestored 中的 switchToRepeat 是否正确触发', async () => {
    // 准备数据
    const wordList = createWordList(20)
    const repeatWords: WordWithIndex[] = wordList.map((w, i) => ({ ...w, index: i }))
    
    // 预先创建重复学习记录
    const manager = new RepeatLearningManager()
    await manager.start(dictId, repeatWords)
    await manager.updateIndex(dictId, 7)  // 设置进度为 7

    // 模拟组件挂载
    let mode: 'normal' | 'repeat' | null = null
    let isModeInitialized = false
    let state = initialState
    
    const dispatch = (action: any) => {
      state = typingReducer(state, action)
    }

    // 模拟 useTypingMode
    mode = 'normal'
    isModeInitialized = true

    // 模拟 useRepeatLearningSync
    const manager2 = new RepeatLearningManager()
    const hasCheckedForRestoreRef = { current: false }
    const isRestoredRef = { current: false }
    const isActiveRef = { current: false }

    // 第一个 useEffect
    const savedState = await manager2.initialize(dictId)
    console.log(`initialize 结果: index=${savedState?.currentIndex}`)
    
    if (savedState && savedState.learningWords.length > 0) {
      // onStateRestored
      dispatch({
        type: TypingStateActionType.SET_WORDS,
        payload: { words: savedState.learningWords },
      })
      dispatch({
        type: TypingStateActionType.SET_CURRENT_INDEX,
        payload: savedState.currentIndex,
      })
      
      // switchToRepeat
      mode = 'repeat'
      console.log(`switchToRepeat 后: mode=${mode}`)
      
      hasCheckedForRestoreRef.current = true
    }

    // 验证 mode 是否正确设置
    console.log(`最终 mode=${mode}, index=${state.wordListData.index}`)
    expect(mode).toBe('repeat')
    expect(state.wordListData.index).toBe(7)
  })
})
