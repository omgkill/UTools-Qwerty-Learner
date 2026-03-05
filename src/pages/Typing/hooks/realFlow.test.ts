import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

// 模拟 useRepeatLearningSync 的行为
function simulateUseRepeatLearningSync(
  manager: RepeatLearningManager,
  dictId: string,
  dispatch: (action: any) => void,
  onStateRestored?: (words: WordWithIndex[], index: number) => void,
) {
  let isActive = false
  let isRestoredRef = false
  let hasCheckedForRestoreRef = false
  let isActiveRef = false

  return {
    setIsActive: (value: boolean) => {
      isActive = value
      isActiveRef = value
    },
    getIsActive: () => isActive,
    getIsActiveRef: () => isActiveRef,
    getIsRestoredRef: () => isRestoredRef,
    // 模拟第一个 useEffect：检查是否有重复学习记录
    checkAndRestore: async () => {
      if (!dictId) return
      if (hasCheckedForRestoreRef) return

      const state = await manager.initialize(dictId)
      if (state && state.learningWords.length > 0) {
        onStateRestored?.(state.learningWords, state.currentIndex)
        hasCheckedForRestoreRef = true
      }
    },
    // 模拟第二个 useEffect：当 isActive 时恢复状态
    restore: async () => {
      if (!isActive) {
        isRestoredRef = false
        return
      }
      if (!dictId) return
      if (isRestoredRef) return

      const state = await manager.initialize(dictId)
      if (state && state.learningWords.length > 0) {
        dispatch({
          type: TypingStateActionType.SET_WORDS,
          payload: { words: state.learningWords },
        })
        dispatch({
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: state.currentIndex,
        })
        isRestoredRef = true
      }
    },
    saveProgress: async (index: number) => {
      if (!dictId || !isActiveRef) {
        console.log(`saveProgress: 跳过保存 - dictId=${dictId}, isActiveRef=${isActiveRef}`)
        return
      }
      console.log(`saveProgress: 保存 index=${index}`)
      await manager.updateIndex(dictId, index)
    },
    startNew: async (words: WordWithIndex[]) => {
      if (!dictId || words.length === 0) return
      await manager.start(dictId, words)
      isRestoredRef = true
    },
    clearState: async () => {
      if (!dictId) return
      await manager.clear(dictId)
      isRestoredRef = false
    },
  }
}

describe('模拟真实 React 流程测试', () => {
  const dictId = 'test-dict-real-flow'
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

  it('场景1：进入重复学习 → 学习几个单词 → 重新打开界面', async () => {
    // ========== 阶段1：正常学习 ==========
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

    let state = initialState
    const dispatch = (action: any) => {
      state = typingReducer(state, action)
    }

    dispatch({ type: TypingStateActionType.SET_WORDS, payload: { words: session.learningWords } })
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })

    // 学习20个单词
    const todayStart = Math.floor(getTodayStartTime() / 1000)
    for (let i = 0; i < 20; i++) {
      const currentWord = state.wordListData.words[state.wordListData.index]
      if (!currentWord) break
      await db.wordRecords.add({
        word: currentWord.name,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })
      dispatch({ type: TypingStateActionType.NEXT_WORD })
    }

    console.log(`阶段1完成：学习了20个单词`)

    // ========== 阶段2：进入重复学习 ==========
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

    console.log(`阶段2：获取到 ${repeatWords.length} 个重复学习单词`)

    // 模拟 handleStartRepeatLearning 的逻辑
    const manager = new RepeatLearningManager()
    const sync = simulateUseRepeatLearningSync(
      manager,
      dictId,
      dispatch,
      (words, index) => {
        console.log(`onStateRestored: words.length=${words.length}, index=${index}`)
      }
    )

    // 模拟 handleStartRepeatLearning 的执行顺序
    // 1. 先启动新的重复学习
    await sync.startNew(repeatWords)
    // 2. dispatch SET_WORDS 和 SET_CURRENT_INDEX
    dispatch({ type: TypingStateActionType.SET_WORDS, payload: { words: repeatWords } })
    dispatch({ type: TypingStateActionType.SET_CURRENT_INDEX, payload: 0 })
    dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
    // 3. 切换模式
    sync.setIsActive(true)

    console.log(`阶段2完成：进入重复学习，当前单词=${state.wordListData.words[state.wordListData.index]?.name}`)
    expect(state.wordListData.index).toBe(0)

    // ========== 阶段3：学习5个单词并保存进度 ==========
    for (let i = 0; i < 5; i++) {
      dispatch({ type: TypingStateActionType.NEXT_WORD })
      // 模拟 useEffect 中的 saveProgress
      await sync.saveProgress(state.wordListData.index)
    }

    console.log(`阶段3完成：学习了5个单词，当前 index=${state.wordListData.index}`)
    expect(state.wordListData.index).toBe(5)

    // ========== 阶段4：模拟重新打开界面 ==========
    // 模拟组件卸载后重新挂载
    const manager2 = new RepeatLearningManager()
    let state2 = initialState
    const dispatch2 = (action: any) => {
      state2 = typingReducer(state2, action)
    }

    const sync2 = simulateUseRepeatLearningSync(
      manager2,
      dictId,
      dispatch2,
      (words, index) => {
        console.log(`阶段4 onStateRestored: words.length=${words.length}, index=${index}`)
        // 模拟 handleRepeatLearningRestored
        dispatch2({ type: TypingStateActionType.SET_WORDS, payload: { words } })
        dispatch2({ type: TypingStateActionType.SET_CURRENT_INDEX, payload: index })
        dispatch2({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
        sync2.setIsActive(true)
      }
    )

    // 模拟组件挂载时的行为
    // 1. mode 初始为 'normal'，isActive = false
    sync2.setIsActive(false)

    // 2. 第一个 useEffect 执行：checkAndRestore
    await sync2.checkAndRestore()

    // 3. 检查恢复后的状态
    console.log(`阶段4完成：重新打开界面，当前 index=${state2.wordListData.index}`)
    console.log(`当前单词=${state2.wordListData.words[state2.wordListData.index]?.name}`)

    // 验证进度是否正确恢复
    expect(state2.wordListData.index).toBe(5)
    expect(state2.wordListData.words[state2.wordListData.index]?.name).toBe(repeatWords[5].name)
  })

  it('场景2：验证 saveProgress 在 isActive=false 时不保存', async () => {
    const wordList = createWordList(20)
    const repeatWords: WordWithIndex[] = wordList.map((w, i) => ({ ...w, index: i }))

    let state = initialState
    const dispatch = (action: any) => {
      state = typingReducer(state, action)
    }

    const manager = new RepeatLearningManager()
    await manager.start(dictId, repeatWords)

    const sync = simulateUseRepeatLearningSync(
      manager,
      dictId,
      dispatch,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {} // onSaveRecord 回调在测试中不需要
    )

    // 设置 isActive = false（模拟 mode !== 'repeat'）
    sync.setIsActive(false)

    // 模拟学习单词
    dispatch({ type: TypingStateActionType.SET_WORDS, payload: { words: repeatWords } })
    dispatch({ type: TypingStateActionType.SET_CURRENT_INDEX, payload: 0 })

    for (let i = 0; i < 5; i++) {
      dispatch({ type: TypingStateActionType.NEXT_WORD })
      // 尝试保存进度
      await sync.saveProgress(state.wordListData.index)
    }

    console.log(`学习5个单词后，当前 index=${state.wordListData.index}`)

    // 验证 IndexedDB 中的进度没有被更新（因为 isActive=false）
    const savedState = await manager.initialize(dictId)
    console.log(`IndexedDB 中保存的 index=${savedState?.currentIndex}`)
    // 由于 start() 时 index=0，且 saveProgress 因为 isActive=false 没有保存
    // 所以 index 应该还是 0
    expect(savedState?.currentIndex).toBe(0)
  })

  it('场景3：验证两个独立的 manager 实例问题', async () => {
    const wordList = createWordList(20)
    const repeatWords: WordWithIndex[] = wordList.map((w, i) => ({ ...w, index: i }))

    // 模拟 useTypingMode 中的 manager
    const managerForMode = new RepeatLearningManager()

    // 模拟 useRepeatLearningSync 中的 manager
    const managerForSync = new RepeatLearningManager()

    // useTypingMode 检查是否有重复学习记录
    const modeCheckResult = await managerForMode.initialize(dictId)
    console.log(`useTypingMode 检查结果: ${modeCheckResult ? '有记录' : '无记录'}`)
    expect(modeCheckResult).toBeNull()

    // 开始重复学习（通过 managerForSync）
    await managerForSync.start(dictId, repeatWords)
    console.log(`通过 managerForSync 开始重复学习`)

    // 验证两个 manager 的状态
    const state1 = managerForMode.getState()
    const state2 = managerForSync.getState()
    console.log(`managerForMode.runtimeState: ${state1 ? '存在' : 'null'}`)
    console.log(`managerForSync.runtimeState: ${state2 ? '存在' : 'null'}`)

    // managerForSync 应该有状态，managerForMode 应该没有
    expect(state1).toBeNull()
    expect(state2).not.toBeNull()

    // 更新进度（通过 managerForSync）
    await managerForSync.updateIndex(dictId, 5)
    console.log(`通过 managerForSync 更新 index=5`)

    // 验证 IndexedDB 中的状态
    const savedState = await db.typingStates.toArray()
    console.log(`IndexedDB 中的 index=${savedState[0]?.currentIndex}`)
    expect(savedState[0]?.currentIndex).toBe(5)

    // 模拟重新打开界面
    const managerForMode2 = new RepeatLearningManager()
    const managerForSync2 = new RepeatLearningManager()

    // useTypingMode 检查
    const modeCheckResult2 = await managerForMode2.initialize(dictId)
    console.log(`重新打开后 useTypingMode 检查结果: index=${modeCheckResult2?.currentIndex}`)
    expect(modeCheckResult2?.currentIndex).toBe(5)

    // useRepeatLearningSync 恢复
    const syncCheckResult = await managerForSync2.initialize(dictId)
    console.log(`重新打开后 useRepeatLearningSync 检查结果: index=${syncCheckResult?.currentIndex}`)
    expect(syncCheckResult?.currentIndex).toBe(5)
  })
})
