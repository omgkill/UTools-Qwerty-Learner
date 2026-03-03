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

describe('用户真实场景测试：100词 → 学习20词 → 重复学习5词 → 重新进入', () => {
  const dictId = 'test-dict-user-scenario'
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

  it('完整场景：验证重新进入重复学习后第一个单词是否正确', async () => {
    console.log('========================================')
    console.log('步骤1：准备100词词库')
    console.log('========================================')
    
    const wordList = createWordList(100)
    await wordProgressService.initProgressBatch(dictId, wordList.map((word) => word.name))
    console.log(`✓ 已初始化 ${wordList.length} 个单词的进度`)

    console.log('\n========================================')
    console.log('步骤2：获取今日学习单词（20个新词）')
    console.log('========================================')
    
    const record = await dailyRecordService.getTodayRecord(dictId)
    const session = await loadTypingSession({
      wordList,
      reviewedCount: record.reviewedCount,
      learnedCount: record.learnedCount,
            getDueWordsWithInfo: (list, limit) => wordProgressService.getDueWordsWithInfo(dictId, list, limit),
      getNewWords: (list, limit) => wordProgressService.getNewWords(dictId, list, limit),
      getWordProgress: (word) => wordProgressService.getProgress(dictId, word),
    })
    
    console.log(`✓ 今日学习单词数量: ${session.learningWords.length}`)
    console.log(`✓ 学习类型: ${session.learningType}`)
    console.log(`✓ 前5个单词: ${session.learningWords.slice(0, 5).map(w => w.name).join(', ')}`)

    console.log('\n========================================')
    console.log('步骤3：学习20个新词（模拟打字完成）')
    console.log('========================================')
    
    let state = initialState
    state = typingReducer(state, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: session.learningWords },
    })
    state = typingReducer(state, { type: TypingStateActionType.SET_IS_TYPING, payload: true })

    const todayStart = Math.floor(getTodayStartTime() / 1000)
    const learnedWords: string[] = []

    for (let i = 0; i < 20; i++) {
      const currentWord = state.wordListData.words[state.wordListData.index]
      if (!currentWord) break
      learnedWords.push(currentWord.name)

      // 记录学习记录（用于重复学习）
      await db.wordRecords.add({
        word: currentWord.name,
        dict: dictId,
        learning: null,
        timeStamp: todayStart + i * 60,
        timing: [100, 200, 300],
        wrongCount: 0,
        mistakes: {},
      })

      state = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })
    }

    console.log(`✓ 已学习单词: ${learnedWords.join(', ')}`)
    console.log(`✓ 学习完成后 state.index = ${state.wordListData.index}`)

    console.log('\n========================================')
    console.log('步骤4：获取重复学习单词列表')
    console.log('========================================')
    
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

    console.log(`✓ 重复学习单词数量: ${repeatWords.length}`)
    console.log(`✓ 重复学习单词列表: ${repeatWords.map(w => w.name).join(', ')}`)

    console.log('\n========================================')
    console.log('步骤5：进入重复学习（模拟 handleStartRepeatLearning）')
    console.log('========================================')
    
    // 创建 RepeatLearningManager
    const manager = new RepeatLearningManager()
    console.log(`5.1 创建 RepeatLearningManager 实例`)

    // 调用 start() 开始重复学习
    await manager.start(dictId, repeatWords)
    console.log(`5.2 调用 manager.start() 完成`)

    // 检查 manager 内部状态
    const managerState = manager.getState()
    console.log(`5.3 manager.getState():`)
    console.log(`    - learningWords.length = ${managerState?.learningWords.length}`)
    console.log(`    - currentIndex = ${managerState?.currentIndex}`)

    // 更新 Redux state
    state = typingReducer(state, {
      type: TypingStateActionType.SET_WORDS,
      payload: { words: repeatWords },
    })
    state = typingReducer(state, {
      type: TypingStateActionType.SET_CURRENT_INDEX,
      payload: 0,
    })
    state = typingReducer(state, {
      type: TypingStateActionType.SET_IS_REPEAT_LEARNING,
      payload: true,
    })
    console.log(`5.4 更新 Redux state 完成`)
    console.log(`    - state.wordListData.words.length = ${state.wordListData.words.length}`)
    console.log(`    - state.wordListData.index = ${state.wordListData.index}`)
    console.log(`    - 当前单词 = ${state.wordListData.words[0]?.name}`)

    console.log('\n========================================')
    console.log('步骤6：在重复学习中学习5个单词')
    console.log('========================================')
    
    for (let i = 0; i < 5; i++) {
      state = typingReducer(state, { type: TypingStateActionType.NEXT_WORD })
      const currentIndex = state.wordListData.index
      const currentWord = state.wordListData.words[currentIndex]
      
      // 保存进度到 IndexedDB
      await manager.updateIndex(dictId, currentIndex)
      
      console.log(`6.${i + 1} 学习第 ${i + 1} 个单词:`)
      console.log(`    - NEXT_WORD 后 index = ${currentIndex}`)
      console.log(`    - 当前单词 = ${currentWord?.name}`)
      console.log(`    - 已保存到 IndexedDB`)
    }

    console.log(`\n✓ 学习5个单词后:`)
    console.log(`    - state.wordListData.index = ${state.wordListData.index}`)
    console.log(`    - 当前单词 = ${state.wordListData.words[state.wordListData.index]?.name}`)

    // 验证 IndexedDB 中的状态
    const savedState = await manager.initialize(dictId)
    console.log(`✓ IndexedDB 中保存的状态:`)
    console.log(`    - currentIndex = ${savedState?.currentIndex}`)
    console.log(`    - learningWords.length = ${savedState?.learningWords.length}`)

    console.log('\n========================================')
    console.log('步骤7：模拟重新进入重复学习（新组件实例）')
    console.log('========================================')
    
    // 模拟组件卸载后重新挂载
    console.log(`7.1 模拟组件重新挂载`)

    // 模拟真实的 React state
    let mode: 'normal' | 'repeat' | null = null
    let isModeInitialized = false
    let restoredState = initialState

    // 模拟 useTypingMode 的 useEffect（现在会检查 IndexedDB）
    console.log(`7.2 useTypingMode useEffect: 检查 IndexedDB 是否有重复学习记录`)
    const managerForMode = new RepeatLearningManager()
    const savedModeState = await managerForMode.initialize(dictId)
    console.log(`    - managerForMode.initialize() 结果: ${savedModeState ? '有记录' : '无记录'}`)
    
    if (savedModeState && savedModeState.learningWords.length > 0) {
      mode = 'repeat'
      console.log(`    - 发现重复学习记录，设置 mode='repeat'`)
    } else {
      mode = 'normal'
      console.log(`    - 无重复学习记录，设置 mode='normal'`)
    }
    isModeInitialized = true
    console.log(`    - mode=${mode}, isModeInitialized=${isModeInitialized}`)

    // 模拟 useWordList 在 mode='repeat' 时不会加载正常学习单词
    console.log(`7.3 useWordList: mode='${mode}'`)
    if (mode === 'normal') {
      console.log(`    - 加载正常学习单词`)
    } else {
      console.log(`    - 跳过加载（mode 不是 'normal'）`)
    }

    // 模拟 useNormalLearningSync 的 useEffect
    const normalSyncIsActive = mode === 'normal' && isModeInitialized
    console.log(`7.4 useNormalLearningSync useEffect: isActive=${normalSyncIsActive}`)
    
    if (normalSyncIsActive && session.learningWords) {
      console.log(`    - dispatch SET_WORDS (正常学习单词)`)
      restoredState = typingReducer(restoredState, {
        type: TypingStateActionType.SET_WORDS,
        payload: { words: session.learningWords },
      })
      console.log(`    - restoredState.wordListData.index=${restoredState.wordListData.index}`)
    } else {
      console.log(`    - 跳过（isActive=false）`)
    }

    // 模拟 useRepeatLearningSync 的第一个 useEffect (checkAndRestore)
    console.log(`7.5 useRepeatLearningSync 第一个 useEffect: checkAndRestore`)
    const managerForRestore = new RepeatLearningManager()
    const hasCheckedForRestoreRef = { current: false }
    const isRestoredRef = { current: false }

    if (!hasCheckedForRestoreRef.current) {
      const restoredStateFromDB = await managerForRestore.initialize(dictId)
      console.log(`    - manager.initialize() 结果: ${restoredStateFromDB ? '成功' : '失败'}`)

      if (restoredStateFromDB && restoredStateFromDB.learningWords.length > 0) {
        console.log(`    - restoredStateFromDB.currentIndex=${restoredStateFromDB.currentIndex}`)
        console.log(`    - restoredStateFromDB.learningWords.length=${restoredStateFromDB.learningWords.length}`)

        // 模拟 onStateRestored 回调
        console.log(`    - 调用 onStateRestored 回调`)
        restoredState = typingReducer(restoredState, {
          type: TypingStateActionType.SET_WORDS,
          payload: { words: restoredStateFromDB.learningWords },
        })
        restoredState = typingReducer(restoredState, {
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: restoredStateFromDB.currentIndex,
        })
        restoredState = typingReducer(restoredState, {
          type: TypingStateActionType.SET_IS_REPEAT_LEARNING,
          payload: true,
        })
        console.log(`    - dispatch SET_WORDS, SET_CURRENT_INDEX, SET_IS_REPEAT_LEARNING 完成`)
        console.log(`    - restoredState.wordListData.index=${restoredState.wordListData.index}`)

        // switchToRepeat() - 但 mode 已经是 'repeat' 了
        if (mode !== 'repeat') {
          mode = 'repeat'
          console.log(`    - switchToRepeat(): mode=${mode}`)
        } else {
          console.log(`    - mode 已经是 'repeat'，无需切换`)
        }

        hasCheckedForRestoreRef.current = true
      }
    }

    // 模拟 useRepeatLearningSync 的第二个 useEffect (restore)
    const repeatSyncIsActive = mode === 'repeat' && isModeInitialized
    console.log(`7.6 useRepeatLearningSync 第二个 useEffect: isActive=${repeatSyncIsActive}`)

    if (repeatSyncIsActive && !isRestoredRef.current) {
      const restoredStateFromDB = await managerForRestore.initialize(dictId)
      if (restoredStateFromDB && restoredStateFromDB.learningWords.length > 0) {
        console.log(`    - dispatch SET_WORDS, SET_CURRENT_INDEX (restore)`)
        restoredState = typingReducer(restoredState, {
          type: TypingStateActionType.SET_WORDS,
          payload: { words: restoredStateFromDB.learningWords },
        })
        restoredState = typingReducer(restoredState, {
          type: TypingStateActionType.SET_CURRENT_INDEX,
          payload: restoredStateFromDB.currentIndex,
        })
        isRestoredRef.current = true
        console.log(`    - restore() 完成`)
      }
    } else {
      console.log(`    - 跳过（isRestoredRef.current=${isRestoredRef.current}）`)
    }

    console.log(`7.7 最终状态:`)
    console.log(`    - mode=${mode}`)
    console.log(`    - restoredState.wordListData.index=${restoredState.wordListData.index}`)
    console.log(`    - 当前单词=${restoredState.wordListData.words[restoredState.wordListData.index]?.name}`)

    console.log('\n========================================')
    console.log('步骤8：验证结果')
    console.log('========================================')
    
    const expectedIndex = 5
    const actualIndex = restoredState.wordListData.index
    const actualWord = restoredState.wordListData.words[actualIndex]?.name
    const expectedWord = repeatWords[5]?.name
    
    console.log(`预期:`)
    console.log(`    - index 应该是 ${expectedIndex}`)
    console.log(`    - 单词应该是 ${expectedWord}`)
    console.log(`实际:`)
    console.log(`    - index = ${actualIndex}`)
    console.log(`    - 单词 = ${actualWord}`)
    console.log(`结果: ${actualIndex === expectedIndex ? '✓ 通过' : '✗ 失败'}`)

    expect(actualIndex).toBe(expectedIndex)
    expect(actualWord).toBe(expectedWord)
  })
})
