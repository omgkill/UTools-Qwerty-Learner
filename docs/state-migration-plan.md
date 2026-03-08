# 状态管理架构迁移计划

## 一、现状分析

### 1.1 当前架构问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **状态来源分散** | 全局配置使用 Jotai，Typing 页面使用 Context + useImmerReducer | 学习成本高、心智负担重、调试困难 |
| **Reducer 过大** | 单个 reducer 文件 290+ 行，包含 26 种 action type | 难以维护、测试复杂、职责不清 |
| **类型定义分散** | types.ts、actions.ts 分离，action payload 类型定义冗长 | 类型跳转困难、修改时容易遗漏 |

### 1.2 当前状态结构

```
TypingState
├── wordListData: WordListData     # 单词列表数据
│   ├── words: WordWithIndex[]
│   └── index: number
├── statsData: StatsData           # 统计数据
│   ├── wordCount: number
│   ├── correctCount: number
│   ├── wrongCount: number
│   ├── wrongWordIndexes: number[]
│   ├── correctWordIndexes: number[]
│   ├── wordRecordIds: number[]
│   └── timerData: TimerData
├── wordInfoMap: WordInfoMap       # 单词信息映射
├── uiState: UIState               # UI 状态
│   ├── isTyping: boolean
│   ├── isFinished: boolean
│   ├── isShowSkip: boolean
│   ├── isExtraReview: boolean
│   ├── isRepeatLearning: boolean
│   ├── isCurrentWordMastered: boolean
│   └── isSavingRecord: boolean
├── isTransVisible: boolean        # 翻译可见性
└── isImmersiveMode: boolean       # 沉浸模式
```

### 1.3 当前 Action 分布

| 功能域 | Action Types | 数量 |
|--------|--------------|------|
| **wordListData** | SET_WORDS, RESET_PROGRESS, NEXT_WORD, SKIP_WORD, SKIP_2_WORD_INDEX, SET_CURRENT_INDEX, ADD_REPLACEMENT_WORD | 7 |
| **statsData** | REPORT_WRONG_WORD, REPORT_CORRECT_WORD, INCREASE_CORRECT_COUNT, INCREASE_WRONG_COUNT, TICK_TIMER, ADD_WORD_RECORD_ID, RESET_STATS | 7 |
| **uiState** | SET_IS_SKIP, SET_IS_TYPING, TOGGLE_IS_TYPING, FINISH_WORDS, FINISH_LEARNING, SET_IS_SAVING_RECORD, SET_IS_CURRENT_WORD_MASTERED, SET_IS_REPEAT_LEARNING | 8 |
| **其他** | TOGGLE_TRANS_VISIBLE, TOGGLE_IMMERSIVE_MODE, UPDATE_WORD_INFO, CLEAR_WORD_INFO_MAP | 4 |

---

## 二、迁移目标

### 2.1 架构统一

将 Context + Reducer 迁移到 Jotai，实现：
- 统一的状态管理方案
- 更细粒度的状态订阅
- 更好的 TypeScript 支持
- 更简单的测试方式

### 2.2 Reducer 拆分

按功能域拆分为独立的 atom 组：

```
src/pages/Typing/store/
├── atoms/
│   ├── index.ts              # 统一导出
│   ├── wordListAtoms.ts      # 单词列表相关 atoms
│   ├── statsAtoms.ts         # 统计数据相关 atoms
│   ├── uiAtoms.ts            # UI 状态相关 atoms
│   └── wordInfoAtoms.ts      # 单词信息相关 atoms
├── types.ts                  # 类型定义（保留）
├── initialState.ts           # 初始状态（保留）
└── index.ts                  # 导出入口
```

---

## 三、详细迁移计划

### 阶段一：准备工作（预计 1 天）

#### 任务 1.1：创建新的 atom 结构

**文件：`src/pages/Typing/store/atoms/wordListAtoms.ts`**

```typescript
import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import type { WordWithIndex } from '@/typings'
import { initialWordListData } from '../initialState'

// 基础 atoms（可写）
export const wordsAtom = atomWithImmer<WordWithIndex[]>([])
export const currentIndexAtom = atomWithImmer<number>(0)

// 派生 atoms（只读）
export const currentWordAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return words[index] ?? null
})

export const isLastWordAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return index >= words.length - 1
})

export const progressAtom = atom((get) => {
  const words = get(wordsAtom)
  const index = get(currentIndexAtom)
  return words.length > 0 ? Math.round((index / words.length) * 100) : 0
})

// 操作 atoms（写操作）
export const setWordsAtom = atom(null, (get, set, words: WordWithIndex[]) => {
  const currentWord = get(currentWordAtom)
  const newIndex = currentWord 
    ? words.findIndex(w => w.name === currentWord.name)
    : 0
  set(wordsAtom, words)
  set(currentIndexAtom, newIndex >= 0 ? newIndex : 0)
})

export const nextWordAtom = atom(null, (get, set) => {
  const words = get(wordsAtom)
  const currentIndex = get(currentIndexAtom)
  const newIndex = currentIndex + 1
  if (newIndex < words.length) {
    set(currentIndexAtom, newIndex)
    return false // 未结束
  }
  return true // 已结束
})

export const skipWordAtom = atom(null, (get, set) => {
  const words = get(wordsAtom)
  const currentIndex = get(currentIndexAtom)
  const newIndex = currentIndex + 1
  if (newIndex < words.length) {
    set(currentIndexAtom, newIndex)
    return false
  }
  return true
})

export const skipToIndexAtom = atom(null, (get, set, newIndex: number) => {
  const words = get(wordsAtom)
  if (newIndex < words.length) {
    set(currentIndexAtom, newIndex)
    return false
  }
  return true
})

export const addReplacementWordAtom = atom(null, (get, set, word: WordWithIndex) => {
  set(wordsAtom, (draft) => {
    draft.push(word)
  })
})

export const resetProgressAtom = atom(null, (get, set) => {
  set(currentIndexAtom, 0)
})
```

**文件：`src/pages/Typing/store/atoms/statsAtoms.ts`**

```typescript
import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import { initialStatsData } from '../initialState'
import type { StatsData, TimerData } from '../types'

// 基础 atoms
export const wordCountAtom = atomWithImmer<number>(0)
export const correctCountAtom = atomWithImmer<number>(0)
export const wrongCountAtom = atomWithImmer<number>(0)
export const wrongWordIndexesAtom = atomWithImmer<number[]>([])
export const correctWordIndexesAtom = atomWithImmer<number[]>([])
export const wordRecordIdsAtom = atomWithImmer<number[]>([])
export const timerDataAtom = atomWithImmer<TimerData>({ time: 0, accuracy: 0, wpm: 0 })

// 派生 atoms
export const totalInputCountAtom = atom((get) => {
  return get(correctCountAtom) + get(wrongCountAtom)
})

export const accuracyAtom = atom((get) => {
  const total = get(totalInputCountAtom)
  if (total === 0) return 0
  return Math.round((get(correctCountAtom) / total) * 100)
})

// 操作 atoms
export const reportWrongWordAtom = atom(null, (get, set, wordIndex: number) => {
  const wrongIndexes = get(wrongWordIndexesAtom)
  if (!wrongIndexes.includes(wordIndex)) {
    set(wrongWordIndexesAtom, (draft) => {
      draft.push(wordIndex)
    })
  }
})

export const reportCorrectWordAtom = atom(null, (get, set, wordIndex: number) => {
  const correctIndexes = get(correctWordIndexesAtom)
  const wrongIndexes = get(wrongWordIndexesAtom)
  if (!correctIndexes.includes(wordIndex) && !wrongIndexes.includes(wordIndex)) {
    set(correctWordIndexesAtom, (draft) => {
      draft.push(wordIndex)
    })
  }
})

export const increaseCorrectCountAtom = atom(null, (get, set) => {
  set(correctCountAtom, (draft) => draft + 1)
})

export const increaseWrongCountAtom = atom(null, (get, set) => {
  set(wrongCountAtom, (draft) => draft + 1)
})

export const tickTimerAtom = atom(null, (get, set, increment = 1) => {
  const newTime = get(timerDataAtom).time + increment
  const wordCount = get(wordCountAtom)
  const correctCount = get(correctCountAtom)
  const totalInput = correctCount + get(wrongCountAtom)
  
  set(timerDataAtom, (draft) => {
    draft.time = newTime
    draft.accuracy = totalInput === 0 ? 0 : Math.round((correctCount / totalInput) * 100)
    draft.wpm = newTime === 0 ? 0 : Math.round((wordCount / newTime) * 60)
  })
})

export const addWordRecordIdAtom = atom(null, (get, set, id: number) => {
  set(wordRecordIdsAtom, (draft) => {
    draft.push(id)
  })
})

export const incrementWordCountAtom = atom(null, (get, set) => {
  set(wordCountAtom, (draft) => draft + 1)
})

export const resetStatsAtom = atom(null, (get, set) => {
  set(wordCountAtom, 0)
  set(correctCountAtom, 0)
  set(wrongCountAtom, 0)
  set(wrongWordIndexesAtom, [])
  set(correctWordIndexesAtom, [])
  set(wordRecordIdsAtom, [])
  set(timerDataAtom, { time: 0, accuracy: 0, wpm: 0 })
})
```

**文件：`src/pages/Typing/store/atoms/uiAtoms.ts`**

```typescript
import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import { initialUIState } from '../initialState'

// 基础 atoms
export const isTypingAtom = atomWithImmer<boolean>(true)
export const isFinishedAtom = atomWithImmer<boolean>(false)
export const isShowSkipAtom = atomWithImmer<boolean>(false)
export const isExtraReviewAtom = atomWithImmer<boolean>(false)
export const isRepeatLearningAtom = atomWithImmer<boolean>(false)
export const isCurrentWordMasteredAtom = atomWithImmer<boolean>(false)
export const isSavingRecordAtom = atomWithImmer<boolean>(false)
export const isTransVisibleAtom = atomWithImmer<boolean>(true)
export const isImmersiveModeAtom = atomWithImmer<boolean>(false)

// 操作 atoms
export const setIsTypingAtom = atom(null, (get, set, value: boolean) => {
  set(isTypingAtom, value)
})

export const toggleIsTypingAtom = atom(null, (get, set) => {
  set(isTypingAtom, (draft) => !draft)
})

export const setIsShowSkipAtom = atom(null, (get, set, value: boolean) => {
  set(isShowSkipAtom, value)
})

export const finishLearningAtom = atom(null, (get, set) => {
  set(isTypingAtom, false)
  set(isFinishedAtom, true)
})

export const toggleTransVisibleAtom = atom(null, (get, set) => {
  set(isTransVisibleAtom, (draft) => !draft)
})

export const toggleImmersiveModeAtom = atom(null, (get, set, value?: boolean) => {
  set(isImmersiveModeAtom, value ?? (draft => !draft))
})

export const resetUIStateAtom = atom(null, (get, set) => {
  set(isTypingAtom, true)
  set(isFinishedAtom, false)
  set(isShowSkipAtom, false)
  set(isCurrentWordMasteredAtom, false)
})
```

**文件：`src/pages/Typing/store/atoms/wordInfoAtoms.ts`**

```typescript
import { atom } from 'jotai'
import { atomWithImmer } from 'jotai-immer'
import type { WordInfo, WordInfoMap } from '../types'

// 基础 atom
export const wordInfoMapAtom = atomWithImmer<WordInfoMap>({})

// 派生 atom
export const getWordInfoAtom = (wordName: string) => 
  atom((get) => get(wordInfoMapAtom)[wordName])

// 操作 atoms
export const updateWordInfoAtom = atom(null, (get, set, payload: { wordName: string; data: WordInfo }) => {
  set(wordInfoMapAtom, (draft) => {
    draft[payload.wordName] = { ...draft[payload.wordName], ...payload.data }
  })
})

export const clearWordInfoMapAtom = atom(null, (get, set) => {
  set(wordInfoMapAtom, {})
})
```

**文件：`src/pages/Typing/store/atoms/index.ts`**

```typescript
// Word List Atoms
export {
  wordsAtom,
  currentIndexAtom,
  currentWordAtom,
  isLastWordAtom,
  progressAtom,
  setWordsAtom,
  nextWordAtom,
  skipWordAtom,
  skipToIndexAtom,
  addReplacementWordAtom,
  resetProgressAtom,
} from './wordListAtoms'

// Stats Atoms
export {
  wordCountAtom,
  correctCountAtom,
  wrongCountAtom,
  wrongWordIndexesAtom,
  correctWordIndexesAtom,
  wordRecordIdsAtom,
  timerDataAtom,
  totalInputCountAtom,
  accuracyAtom,
  reportWrongWordAtom,
  reportCorrectWordAtom,
  increaseCorrectCountAtom,
  increaseWrongCountAtom,
  tickTimerAtom,
  addWordRecordIdAtom,
  incrementWordCountAtom,
  resetStatsAtom,
} from './statsAtoms'

// UI Atoms
export {
  isTypingAtom,
  isFinishedAtom,
  isShowSkipAtom,
  isExtraReviewAtom,
  isRepeatLearningAtom,
  isCurrentWordMasteredAtom,
  isSavingRecordAtom,
  isTransVisibleAtom,
  isImmersiveModeAtom,
  setIsTypingAtom,
  toggleIsTypingAtom,
  setIsShowSkipAtom,
  finishLearningAtom,
  toggleTransVisibleAtom,
  toggleImmersiveModeAtom,
  resetUIStateAtom,
} from './uiAtoms'

// Word Info Atoms
export {
  wordInfoMapAtom,
  getWordInfoAtom,
  updateWordInfoAtom,
  clearWordInfoMapAtom,
} from './wordInfoAtoms'
```

#### 任务 1.2：安装依赖

```bash
npm install jotai-immer
# 或
pnpm add jotai-immer
```

---

### 阶段二：创建复合操作 Hooks（预计 1 天）

由于部分操作涉及多个 atom 的协同更新，需要创建复合操作 hooks。

**文件：`src/pages/Typing/store/hooks/useTypingActions.ts`**

```typescript
import { useSetAtom, useAtomValue } from 'jotai'
import {
  nextWordAtom,
  skipWordAtom,
  incrementWordCountAtom,
  setIsShowSkipAtom,
  setIsTypingAtom,
  setisFinishedAtom,
  isRepeatLearningAtom,
  isLastWordAtom,
  resetUIStateAtom,
} from '../atoms'

export function useTypingActions() {
  const nextWord = useSetAtom(nextWordAtom)
  const skipWord = useSetAtom(skipWordAtom)
  const incrementWordCount = useSetAtom(incrementWordCountAtom)
  const setIsShowSkip = useSetAtom(setIsShowSkipAtom)
  const setIsTyping = useSetAtom(setIsTypingAtom)
  const setisFinished = useSetAtom(setisFinishedAtom)
  const isRepeatLearning = useAtomValue(isRepeatLearningAtom)
  const isLastWord = useAtomValue(isLastWordAtom)
  const resetUIState = useSetAtom(resetUIStateAtom)

  const goToNextWord = () => {
    const isEnd = nextWord()
    if (isEnd) {
      if (isRepeatLearning) {
        // 重复学习模式：重置索引继续
        resetUIState()
        return { finished: false }
      }
      setIsTyping(false)
      setisFinished(true)
    }
    incrementWordCount()
    setIsShowSkip(false)
    return { finished: isEnd && !isRepeatLearning }
  }

  const skipCurrentWord = () => {
    const isEnd = skipWord()
    if (isEnd) {
      setIsTyping(false)
      setisFinished(true)
    }
    setIsShowSkip(false)
    return { finished: isEnd }
  }

  return {
    goToNextWord,
    skipCurrentWord,
  }
}
```

**文件：`src/pages/Typing/store/hooks/useResetAll.ts`**

```typescript
import { useSetAtom } from 'jotai'
import { resetProgressAtom, resetStatsAtom, resetUIStateAtom, clearWordInfoMapAtom } from '../atoms'

export function useResetAll() {
  const resetProgress = useSetAtom(resetProgressAtom)
  const resetStats = useSetAtom(resetStatsAtom)
  const resetUIState = useSetAtom(resetUIStateAtom)
  const clearWordInfoMap = useSetAtom(clearWordInfoMapAtom)

  return () => {
    resetProgress()
    resetStats()
    resetUIState()
    clearWordInfoMap()
  }
}
```

---

### 阶段三：迁移组件（预计 2-3 天）

#### 任务 3.1：创建迁移映射表

| 原 Context 用法 | 新 Jotai 用法 |
|----------------|---------------|
| `const { state, dispatch } = useTypingContext()` | `const [state, setState] = useAtom(xxxAtom)` |
| `dispatch({ type: SET_IS_TYPING, payload: true })` | `setIsTyping(true)` |
| `state.uiState.isTyping` | `useAtomValue(isTypingAtom)` |
| `state.wordListData.index` | `useAtomValue(currentIndexAtom)` |

#### 任务 3.2：组件迁移顺序

按依赖关系从底层到顶层迁移：

1. **叶子组件**（无子组件依赖）
   - `WordProgress.tsx` - 进度显示
   - `Timer.tsx` - 计时器
   - `SkipButton.tsx` - 跳过按钮
   - `TransDisplay.tsx` - 翻译显示

2. **中间组件**
   - `WordInput.tsx` - 输入框
   - `WordCard.tsx` - 单词卡片
   - `StatsDisplay.tsx` - 统计显示

3. **容器组件**
   - `TypingMain.tsx` - 主容器
   - `NormalTypingPage.tsx` - 页面入口

#### 任务 3.3：迁移示例

**迁移前（Context 方式）：**

```typescript
// WordProgress.tsx
function WordProgress() {
  const { state } = useTypingContext()
  const { wordListData, statsData } = state
  const progress = Math.round((wordListData.index / wordListData.words.length) * 100)
  
  return (
    <div>
      <span>{wordListData.index + 1}/{wordListData.words.length}</span>
      <span>{progress}%</span>
    </div>
  )
}
```

**迁移后（Jotai 方式）：**

```typescript
// WordProgress.tsx
import { useAtomValue } from 'jotai'
import { currentIndexAtom, wordsAtom, progressAtom } from '../store/atoms'

function WordProgress() {
  const index = useAtomValue(currentIndexAtom)
  const words = useAtomValue(wordsAtom)
  const progress = useAtomValue(progressAtom)
  
  return (
    <div>
      <span>{index + 1}/{words.length}</span>
      <span>{progress}%</span>
    </div>
  )
}
```

---

### 阶段四：测试迁移（预计 1 天）

#### 任务 4.1：测试文件重构

**原测试文件：** `reducer.test.ts`（测试 reducer 纯函数）

**新测试文件结构：**

```
src/pages/Typing/store/
├── atoms/
│   ├── wordListAtoms.test.ts
│   ├── statsAtoms.test.ts
│   └── uiAtoms.test.ts
└── hooks/
    └── useTypingActions.test.ts
```

#### 任务 4.2：测试示例

**文件：`src/pages/Typing/store/atoms/wordListAtoms.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from 'vitest'
import { createStore } from 'jotai/store'
import {
  wordsAtom,
  currentIndexAtom,
  currentWordAtom,
  nextWordAtom,
  skipWordAtom,
} from './wordListAtoms'
import type { WordWithIndex } from '@/typings'

const createWord = (name: string, index = 0): WordWithIndex => ({
  name,
  trans: [],
  usphone: '',
  ukphone: '',
  tense: '',
  index,
})

describe('wordListAtoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  describe('nextWordAtom', () => {
    it('应该移动到下一个单词', () => {
      const words = [createWord('apple', 0), createWord('banana', 1)]
      store.set(wordsAtom, words)
      store.set(currentIndexAtom, 0)

      const isEnd = store.set(nextWordAtom)

      expect(isEnd).toBe(false)
      expect(store.get(currentIndexAtom)).toBe(1)
    })

    it('到达末尾时应该返回 true', () => {
      const words = [createWord('apple', 0)]
      store.set(wordsAtom, words)
      store.set(currentIndexAtom, 0)

      const isEnd = store.set(nextWordAtom)

      expect(isEnd).toBe(true)
      expect(store.get(currentIndexAtom)).toBe(0)
    })
  })

  describe('currentWordAtom', () => {
    it('应该返回当前单词', () => {
      const words = [createWord('apple', 0), createWord('banana', 1)]
      store.set(wordsAtom, words)
      store.set(currentIndexAtom, 1)

      expect(store.get(currentWordAtom)?.name).toBe('banana')
    })

    it('索引越界时应该返回 null', () => {
      const words = [createWord('apple', 0)]
      store.set(wordsAtom, words)
      store.set(currentIndexAtom, 5)

      expect(store.get(currentWordAtom)).toBeNull()
    })
  })
})
```

---

### 阶段五：清理与优化（预计 0.5 天）

#### 任务 5.1：删除旧代码

- 删除 `reducer.ts`
- 删除 `actions.ts`
- 删除 `TypingContext` 定义
- 更新 `index.ts` 导出

#### 任务 5.2：更新文档

- 更新组件使用说明
- 更新贡献指南

---

## 四、风险评估与缓解措施

### 4.1 风险矩阵

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 状态同步问题 | 中 | 高 | 使用 `jotai-immer` 保持不可变更新语义 |
| 性能退化 | 低 | 中 | 利用 Jotai 的细粒度订阅减少不必要的重渲染 |
| 测试覆盖不足 | 中 | 中 | 迁移前确保现有测试全部通过，迁移后补充新测试 |
| 迁移周期长 | 中 | 低 | 分阶段迁移，每个阶段独立可验证 |

### 4.2 回滚策略

保留旧代码分支，如遇重大问题可快速回滚：

```bash
# 创建迁移分支
git checkout -b feature/jotai-migration

# 每个阶段完成后打 tag
git tag -a migration-phase-1 -m "Phase 1: Atom structure created"
git tag -a migration-phase-2 -m "Phase 2: Hooks created"
# ...
```

---

## 五、验收标准

### 5.1 功能验收

- [ ] 所有现有功能正常工作
- [ ] 所有现有测试通过
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 警告

### 5.2 性能验收

- [ ] 组件渲染次数不增加
- [ ] 内存使用无明显增长
- [ ] 首屏加载时间无明显增加

### 5.3 代码质量验收

- [ ] 单个文件不超过 200 行
- [ ] 函数复杂度不超过 10
- [ ] 测试覆盖率不低于迁移前

---

## 六、时间估算

| 阶段 | 预计时间 | 依赖 |
|------|----------|------|
| 阶段一：准备工作 | 1 天 | 无 |
| 阶段二：创建 Hooks | 1 天 | 阶段一 |
| 阶段三：迁移组件 | 2-3 天 | 阶段二 |
| 阶段四：测试迁移 | 1 天 | 阶段三 |
| 阶段五：清理优化 | 0.5 天 | 阶段四 |
| **总计** | **5.5-6.5 天** | - |

---

## 七、附录

### A. Action 到 Atom 映射完整表

| 原 Action | 新 Atom/操作 |
|-----------|-------------|
| `SET_WORDS` | `setWordsAtom` |
| `RESET_PROGRESS` | `resetProgressAtom` |
| `SET_IS_SKIP` | `setIsShowSkipAtom` |
| `SET_IS_TYPING` | `setIsTypingAtom` |
| `TOGGLE_IS_TYPING` | `toggleIsTypingAtom` |
| `REPORT_WRONG_WORD` | `reportWrongWordAtom` |
| `REPORT_CORRECT_WORD` | `reportCorrectWordAtom` |
| `NEXT_WORD` | `useTypingActions().goToNextWord()` |
| `FINISH_WORDS` | `useTypingActions().goToNextWord()` |
| `INCREASE_CORRECT_COUNT` | `increaseCorrectCountAtom` |
| `INCREASE_WRONG_COUNT` | `increaseWrongCountAtom` |
| `SKIP_WORD` | `useTypingActions().skipCurrentWord()` |
| `SKIP_2_WORD_INDEX` | `skipToIndexAtom` |
| `FINISH_LEARNING` | `finishLearningAtom` |
| `TOGGLE_TRANS_VISIBLE` | `toggleTransVisibleAtom` |
| `TICK_TIMER` | `tickTimerAtom` |
| `ADD_WORD_RECORD_ID` | `addWordRecordIdAtom` |
| `SET_IS_SAVING_RECORD` | `setIsSavingRecordAtom` |
| `TOGGLE_IMMERSIVE_MODE` | `toggleImmersiveModeAtom` |
| `UPDATE_WORD_INFO` | `updateWordInfoAtom` |
| `SET_IS_CURRENT_WORD_MASTERED` | `setIsCurrentWordMasteredAtom` |
| `ADD_REPLACEMENT_WORD` | `addReplacementWordAtom` |
| `CLEAR_WORD_INFO_MAP` | `clearWordInfoMapAtom` |
| `RESET_STATS` | `resetStatsAtom` |
| `SET_IS_REPEAT_LEARNING` | `setIsRepeatLearningAtom` |
| `SET_CURRENT_INDEX` | `setCurrentIndexAtom` |

### B. 相关文件清单

**需要修改的文件：**
- `src/pages/Typing/store/index.ts`
- `src/pages/Typing/store/types.ts`（保留）
- `src/pages/Typing/store/initialState.ts`（保留）
- `src/pages/Typing/store/reducer.ts`（删除）
- `src/pages/Typing/store/actions.ts`（删除）
- `src/pages/Typing/store/reducer.test.ts`（删除，新建对应测试）
- 所有使用 `useTypingContext` 的组件

**需要新增的文件：**
- `src/pages/Typing/store/atoms/index.ts`
- `src/pages/Typing/store/atoms/wordListAtoms.ts`
- `src/pages/Typing/store/atoms/statsAtoms.ts`
- `src/pages/Typing/store/atoms/uiAtoms.ts`
- `src/pages/Typing/store/atoms/wordInfoAtoms.ts`
- `src/pages/Typing/store/hooks/useTypingActions.ts`
- `src/pages/Typing/store/hooks/useResetAll.ts`
- 各 atom 的测试文件
