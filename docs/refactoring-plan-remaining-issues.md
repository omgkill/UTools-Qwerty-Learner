# 遗留问题重构方案

## 问题一：Progress 组件状态冗余

### 问题描述

[Progress/index.tsx](../src/pages/Typing/components/Progress/index.tsx) 组件存在状态冗余问题：

```typescript
// 当前实现
const currentIndex = useAtomValue(currentIndexAtom)
const words = useAtomValue(wordsAtom)
const [progress, setProgress] = useState(0)      // 冗余！
const [phase, setPhase] = useState(0)            // 冗余！

useEffect(() => {
  const newProgress = Math.floor((currentIndex / words.length) * 100)
  setProgress(newProgress)
  const colorPhase = Math.floor(newProgress / 33.4)
  setPhase(colorPhase)
}, [currentIndex, words.length])
```

**问题分析：**
1. `progress` 和 `phase` 完全可以从 `currentIndex` 和 `words.length` 派生计算
2. 使用 `useState` + `useEffect` 存在额外的渲染周期
3. 已有 `progressAtom` 派生 atom 但未使用

### 重构方案

#### 方案 A：使用现有 progressAtom（推荐）

```typescript
// 重构后
import { useAtomValue } from 'jotai'
import { progressAtom } from '../../store'

export default function Progress({ className }: { className?: string }) {
  const progress = useAtomValue(progressAtom)
  
  // phase 直接计算，无需 useState
  const phase = Math.floor(progress / 33.4)
  
  const colorSwitcher: { [key: number]: string } = {
    0: 'bg-indigo-200 dark:bg-indigo-300',
    1: 'bg-indigo-300 dark:bg-indigo-400',
    2: 'bg-indigo-400 dark:bg-indigo-500',
  }

  return (
    <div className={`relative w-1/4 pt-1 ${className}`}>
      <div className="mb-4 flex h-2 overflow-hidden rounded-xl bg-indigo-100 text-xs transition-all duration-300 dark:bg-indigo-200">
        <div
          style={{ width: `${progress}%` }}
          className={`flex flex-col justify-center whitespace-nowrap rounded-xl text-center text-white shadow-none transition-all duration-300 ${
            colorSwitcher[phase] ?? 'bg-indigo-200 dark:bg-indigo-300'
          }`}
        ></div>
      </div>
    </div>
  )
}
```

#### 方案 B：创建派生 atom

如果需要更复杂的计算逻辑，可创建派生 atom：

```typescript
// store/atoms/wordListAtoms.ts 新增
export const progressPhaseAtom = atom((get) => {
  const progress = get(progressAtom)
  return Math.floor(progress / 33.4)
})
```

### 重构收益

| 指标 | 重构前 | 重构后 |
|-----|-------|-------|
| useState 数量 | 2 个 | 0 个 |
| useEffect 数量 | 1 个 | 0 个 |
| 渲染周期 | 2 次（useState 触发） | 1 次 |
| 代码行数 | 36 行 | ~25 行 |

---

## 问题二：useWordState 使用 useImmer 而非 Jotai

### 问题描述

[useWordState.ts](../src/pages/Typing/components/WordPanel/components/Word/hooks/useWordState.ts) 使用 `useImmer` 管理单词输入状态：

```typescript
// 当前实现
export function useWordState(wordName: string) {
  const [wordState, setWordState] = useImmer<WordState>(structuredClone(initialWordState))
  const lastWordNameRef = useRef<string | null>(null)

  useEffect(() => {
    // 单词切换时重置状态
    const prevWord = lastWordNameRef.current
    if (prevWord === wordName) return
    lastWordNameRef.current = wordName
    
    // 重新初始化状态
    const newWordState = structuredClone(initialWordState)
    newWordState.wordName = wordName
    newWordState.displayWord = headword
    // ...
    setWordState(newWordState)
  }, [wordName, setWordState])

  return { wordState, setWordState }
}
```

**问题分析：**
1. 状态无法在组件外部访问（如其他 hooks 或组件）
2. 单词切换时需要手动重置状态，容易遗漏
3. 与其他 Jotai 状态无法联动
4. `useImmer` 与 Jotai 的 `atomWithImmer` 功能重复

### 重构方案

#### 已创建的 wordInputAtoms

重构已创建了 `wordInputAtoms.ts`，包含：

```typescript
// store/atoms/wordInputAtoms.ts
export const wordInputStateAtom = atomWithImmer<WordInputState>(...)

export const resetWordInputAtom = atom(null, (_get, set, wordName: string) => {
  // 重置并初始化新单词状态
  let headword = wordName.replace(new RegExp(' ', 'g'), EXPLICIT_SPACE)
  headword = headword.replace(new RegExp('…', 'g'), '..')

  set(wordInputStateAtom, {
    wordName,
    displayWord: headword,
    inputWord: '',
    letterStates: new Array(headword.length).fill('normal'),
    // ...
  })
})

export const updateInputWordAtom = atom(...)
export const markLetterCorrectAtom = atom(...)
export const markLetterWrongAtom = atom(...)
export const markWordFinishedAtom = atom(...)
```

#### 迁移步骤

**步骤 1：创建 useWordInput hook**

```typescript
// hooks/useWordInput.ts
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import {
  wordInputStateAtom,
  resetWordInputAtom,
  updateInputWordAtom,
  markLetterCorrectAtom,
  markLetterWrongAtom,
  markWordFinishedAtom,
  pushLetterTimeAtom,
} from '../store'

export function useWordInput(wordName: string) {
  const wordState = useAtomValue(wordInputStateAtom)
  const resetWordInput = useSetAtom(resetWordInputAtom)
  const updateInputWord = useSetAtom(updateInputWordAtom)
  const markLetterCorrect = useSetAtom(markLetterCorrectAtom)
  const markLetterWrong = useSetAtom(markLetterWrongAtom)
  const markWordFinished = useSetAtom(markWordFinishedAtom)
  const pushLetterTime = useSetAtom(pushLetterTimeAtom)

  // 单词切换时自动重置
  useEffect(() => {
    resetWordInput(wordName)
  }, [wordName, resetWordInput])

  return {
    wordState,
    updateInputWord,
    markLetterCorrect,
    markLetterWrong,
    markWordFinished,
    pushLetterTime,
  }
}
```

**步骤 2：更新使用方**

```typescript
// 重构前
import { useWordState } from './hooks/useWordState'

function WordComponent({ wordName }) {
  const { wordState, setWordState } = useWordState(wordName)
  
  const handleInput = (char: string) => {
    setWordState(draft => {
      draft.inputWord += char
      draft.inputCount++
    })
  }
}

// 重构后
import { useWordInput } from './hooks/useWordInput'

function WordComponent({ wordName }) {
  const { wordState, updateInputWord, markLetterCorrect, ... } = useWordInput(wordName)
  
  const handleInput = (char: string) => {
    updateInputWord(wordState.inputWord + char)
  }
}
```

### 重构收益

| 指标 | 重构前 | 重构后 |
|-----|-------|-------|
| 状态管理 | useImmer (局部) | Jotai atom (全局) |
| 外部访问 | ❌ 不可访问 | ✅ 任意组件可访问 |
| 状态联动 | ❌ 需手动同步 | ✅ Jotai 自动响应 |
| 单词切换重置 | useEffect 手动处理 | atom 自动处理 |
| 类型安全 | setWordState 无类型约束 | 每个 action 有明确类型 |

---

## 问题三：类型定义分散（已完成）

### 问题描述

类型定义分散在多个位置：
- `src/dict/types.ts` - 字典相关类型
- `src/utils/storage/types.ts` - 存储相关类型
- `src/pages/Typing/store/types.ts` - 学习模块类型

### 重构方案

详见 [type-consolidation-plan.md](./type-consolidation-plan.md)

### 重构结果

- ✅ 创建 `src/types/dict.ts`
- ✅ 创建 `src/types/storage.ts`
- ✅ 创建 `src/types/learning.ts`
- ✅ 更新所有导入路径
- ✅ 删除旧类型文件

---

## 实施优先级

| 优先级 | 问题 | 工作量 | 风险 |
|-------|-----|-------|-----|
| **高** | Progress 组件 | 小（~10分钟） | 低 |
| **中** | useWordState 迁移 | 中（~30分钟） | 中（需更新多个组件） |

---

## 验证清单

- [ ] Progress 组件不再使用 useState
- [ ] Progress 组件直接使用 progressAtom
- [ ] useWordInput hook 创建完成
- [ ] 所有使用 useWordState 的组件迁移到 useWordInput
- [ ] 删除 useWordState.ts 文件
- [ ] 运行测试验证功能正常
