# 反思文档

## 2026-02-18 测试通过但界面没释义的深层原因

### 问题描述

**现象**：测试全部通过，但实际使用时界面没有单词释义。

### 问题分析

#### 1. 测试数据与实际数据脱节

**测试中**：
```typescript
// mock 数据有释义
mockState.chapterData.words = [
  { name: 'apple', trans: ['n. 苹果'], ... }  // ✅ 有释义
]
```

**实际使用中**：
```typescript
// 实际数据可能没有释义
const currentWord = state.chapterData.words[state.chapterData.index]
// currentWord.trans 可能是 [] 或 undefined
```

#### 2. mock 行为与实际行为不一致

**测试中**：
```typescript
// mock 的 Translation 组件总是渲染
vi.mock('./components/Translation', () => ({
  default: ({ trans }) => (
    <div data-testid="translation">{trans?.join(', ')}</div>  // 总是渲染
  ),
}))
```

**实际行为**：
```typescript
// 实际 Translation 组件在 trans 为空时返回 null
if (displayTrans.length === 0 && !tense) {
  return null  // 不渲染
}
```

#### 3. 没有测试数据来源

测试没有验证 `requestWordMeaning` 是否正确获取释义：

```typescript
// WordPanel 组件中的数据加载逻辑
useEffect(() => {
  void requestWordMeaning(state.chapterData.index)  // 调用 mdx 词典查询
}, [requestWordMeaning, state.chapterData.index])
```

如果 `window.queryFirstMdxWord` 失败或返回空，释义就不会显示。

### 修复后的测试

```typescript
// 修复：mock 行为与实际一致
vi.mock('./components/Translation', () => ({
  default: ({ trans, tense }) => {
    if (!trans || trans.length === 0) return null  // 与实际行为一致
    return <div data-testid="translation">{trans.join(', ')}</div>
  },
}))

// 新增：测试空数据场景
it('should NOT render translation when trans is empty', async () => {
  mockState.chapterData.words = [{ name: 'test', trans: [], ... }]
  const { container } = render(<WordPanel />)
  
  expect(container.querySelector('[data-testid="translation"]')).not.toBeInTheDocument()
})
```

### 教训总结

| 问题 | 教训 |
|------|------|
| 测试数据与实际脱节 | 测试数据应该模拟真实场景，包括空数据、异常数据 |
| mock 行为不一致 | mock 组件的行为应该与实际组件完全一致 |
| 没有测试数据来源 | 应该测试数据加载逻辑，而不仅仅是渲染结果 |

### 测试改进方向

1. **测试数据多样性**
   - 测试有释义的情况
   - 测试无释义的情况
   - 测试数据加载失败的情况

2. **mock 行为一致性**
   - mock 组件应该与实际组件行为完全一致
   - 包括边界情况的处理

3. **端到端测试**
   - 添加 E2E 测试验证完整数据流
   - 从数据加载到界面渲染

---

## 2026-02-18 测试盲区：界面没有单词释义

### 问题描述

**现象**：打开背单词界面，界面没有单词释义。

**根本原因**：测试只覆盖了逻辑层，没有覆盖UI层。

### 测试覆盖分析

```
当前测试金字塔（缺失组件测试）：

        /\
       /  \  E2E测试 ← 缺失
      /----\
     /      \  集成测试 ✅
    /--------\
   /          \  单元测试 ✅
  /------------\
  
缺失层次：组件测试（UI层）
```

### 测试覆盖对比

| 层次 | 覆盖状态 | 测试内容 |
|------|---------|---------|
| 单元测试 | ✅ 已覆盖 | determineLearningType(), WordProgress, DailyRecord |
| 集成测试 | ✅ 已覆盖 | 状态变化、计数逻辑 |
| 组件测试 | ❌ 未覆盖 | Translation组件渲染、数据传递 |
| E2E测试 | ❌ 未覆盖 | 完整用户流程 |

### 为什么没有发现这个问题

1. **测试用例没有验证UI**
   - 测试只验证了 `trans: []` 的数据结构
   - 没有验证组件是否正确渲染

2. **测试数据与实际数据脱节**
   ```typescript
   // 测试中
   const dueWords = [{ name: 'word1', trans: [], ... }]  // trans 为空
   
   // 实际使用中
   // trans 可能为空，组件应该处理这种情况
   ```

3. **缺少组件级测试**
   - 没有测试 Translation 组件
   - 没有测试 WordPanel 组件
   - 没有测试数据传递链路

### 应该添加的测试

#### 组件测试（使用 @testing-library/react）

```typescript
// Translation.test.tsx
describe('Translation Component', () => {
  it('should render translations when trans is not empty', () => {
    render(<Translation trans={['n. 苹果', 'n. 公司']} />)
    expect(screen.getByText('苹果')).toBeInTheDocument()
  })

  it('should show placeholder when trans is empty', () => {
    render(<Translation trans={[]} />)
    expect(screen.getByText('暂无释义')).toBeInTheDocument()
  })

  it('should handle undefined trans', () => {
    render(<Translation trans={undefined as any} />)
    // 不应该崩溃
  })
})

// WordPanel.test.tsx
describe('WordPanel Component', () => {
  it('should display word translation when available', () => {
    const word = { name: 'apple', trans: ['n. 苹果'], ... }
    render(<WordPanel word={word} />)
    expect(screen.getByText('苹果')).toBeInTheDocument()
  })

  it('should fetch translation when trans is empty', async () => {
    const word = { name: 'apple', trans: [], ... }
    render(<WordPanel word={word} />)
    await waitFor(() => {
      expect(screen.getByText('苹果')).toBeInTheDocument()
    })
  })
})
```

### 教训总结

> **测试应该覆盖用户实际看到的内容**，而不仅仅是数据结构。

> **组件测试是必要的**，纯逻辑测试无法发现UI问题。

> **测试数据应该模拟真实场景**，包括空数据、异常数据。

---

## 2026-02-18 测试通过但逻辑错误的反思

### 问题描述

**现象**：点击"继续复习"按钮后没有反应，但所有测试都通过。

**根本原因**：测试用例断言了错误的行为，导致"错误逻辑 + 错误断言 = 测试通过"。

### 错误示例

#### 错误的代码逻辑

```typescript
// 错误：目标达成时返回了所有到期单词
if (!isExtraReview && reviewedCount + learnedCount >= DAILY_LIMIT) {
  if (dueWords.length > 0) {
    return {
      learningType: 'review',
      learningWords: dueWords,  // ❌ 应该返回空列表
    }
  }
}
```

#### 错误的测试断言

```typescript
// 错误：断言了错误的行为
it('should return review mode when target reached with due words', () => {
  const result = determineLearningType({ ..., isExtraReview: false })
  
  expect(result.learningType).toBe('review')      // ❌ 应该是 'complete'
  expect(result.learningWords.length).toBe(18)    // ❌ 应该是 0
})
```

### 问题分析

| 问题类型 | 描述 |
|---------|------|
| **测试基于实现** | 测试用例是根据当前代码行为写的，而不是根据需求文档 |
| **缺少变化验证** | 没有验证点击前后状态的变化 |
| **缺少反向测试** | 只测试了 `isExtraReview=false` 的情况，没有对比 `true` 的情况 |

### 正确的测试方法

#### 1. 基于需求文档编写测试

```typescript
// 需求：目标达成时，应该返回空列表等待用户点击
it('should return EMPTY learningWords when target reached', () => {
  const result = determineLearningType({ ..., isExtraReview: false })
  
  expect(result.learningType).toBe('complete')  // ✅ 基于"完成"状态
  expect(result.learningWords.length).toBe(0)   // ✅ 空列表等待用户
  expect(result.hasMoreDueWords).toBe(true)     // ✅ 提示有更多单词
})
```

#### 2. 验证状态变化

```typescript
it('should show DIFFERENT results before and after clicking', () => {
  // 点击前
  const before = determineLearningType({ ..., isExtraReview: false })
  expect(before.learningWords.length).toBe(0)
  
  // 点击后
  const after = determineLearningType({ ..., isExtraReview: true })
  expect(after.learningWords.length).toBe(18)
  
  // 关键：验证变化
  expect(before.learningWords.length).not.toBe(after.learningWords.length)
})
```

#### 3. 对比测试

```typescript
it('should behave differently based on isExtraReview flag', () => {
  const params = { dueWords: [...], reviewedCount: 20, ... }
  
  // 对比两种情况
  const normal = determineLearningType({ ...params, isExtraReview: false })
  const extra = determineLearningType({ ...params, isExtraReview: true })
  
  // 验证差异
  expect(normal.learningType).toBe('complete')
  expect(extra.learningType).toBe('review')
  expect(normal.learningWords.length).toBe(0)
  expect(extra.learningWords.length).toBe(18)
})
```

### 测试改进建议

#### 测试金字塔

```
        /\
       /  \  E2E测试（真实用户操作）
      /----\
     /      \  集成测试（状态变化验证）← 本次缺失
    /--------\
   /          \  单元测试（纯函数）← 原有
  /------------\
```

#### 测试原则

1. **测试需求，不是测试实现**
   - 测试用例应该基于需求文档
   - 不要根据当前代码行为写断言

2. **验证变化**
   - 用户操作前后应该有不同的状态
   - 测试应该验证这种变化

3. **对比测试**
   - 同一函数不同参数应该有不同行为
   - 测试应该验证这种差异

4. **边界场景**
   - 目标达成时的行为
   - 额外复习场景
   - React StrictMode 重复调用

### 本次修复总结

| 修复内容 | 文件 |
|---------|------|
| 修复核心逻辑 | `learningLogic.ts` |
| 修复测试断言 | `learningLogic.test.ts` |
| 新增变化验证测试 | `integration.test.ts` |

### 后续改进

1. **添加 E2E 测试** - 模拟真实用户操作流程
2. **添加组件测试** - 测试按钮点击后的界面变化
3. **测试覆盖率检查** - 确保关键路径都有测试

---

## 经验教训

> **测试通过不代表逻辑正确**。测试用例本身可能断言了错误的行为。

> **测试应该验证"变化"**，而不仅仅是验证"结果"。用户操作前后应该有不同的状态。

> **测试应该基于需求文档**，而不是基于当前代码实现。

---

## 2026-02-18 模拟测试不是真实测试

### 问题描述

**现象**：`integration.test.ts` 中的测试全部通过，但这些测试是"虚假测试"。

**根本原因**：测试使用了模拟函数 `simulateWordCompletion`，复制了实际代码的逻辑，而不是调用实际代码。

### 问题代码

#### 模拟函数（复制逻辑）

```typescript
// integration.test.ts - 这是模拟函数，不是真实代码！
function simulateWordCompletion(params) {
  const { isCorrect, wrongCount, isExtraReview, dailyRecord } = params
  
  // ... 复制了实际代码的逻辑
  
  if (isNewWord) {
    newDailyRecord.learnedCount++
  } else {
    if (isExtraReview) {
      newDailyRecord.extraReviewedCount++  // 模拟逻辑
    } else {
      newDailyRecord.reviewedCount++       // 模拟逻辑
    }
  }
  
  return { newProgress, dailyRecord: newDailyRecord, isNewWord }
}
```

#### 实际代码

```typescript
// useProgress.ts - 这是真实代码
const incrementReviewed = useCallback(async (isExtra = false) => {
  const record = await getTodayRecord()
  if (isExtra) {
    record.extraReviewedCount++   // 真实逻辑
  } else {
    record.reviewedCount++        // 真实逻辑
  }
  await db.dailyRecords.update(record.id!, record)
}, [dictID, getTodayRecord])
```

### 问题分析

| 问题 | 说明 |
|------|------|
| **复制逻辑** | 模拟函数复制了实际代码的逻辑，而不是调用实际代码 |
| **不同步** | 如果实际代码改了，模拟函数不会自动更新 |
| **虚假通过** | 测试可能仍然通过，即使实际代码有 bug |

### 验证实验

如果修改实际代码：

```typescript
// 修改实际代码（故意引入 bug）
get totalReviewed(): number {
  return this.reviewedCount  // 缺少 + this.extraReviewedCount
}
```

**真实测试**（`progress.test.ts`）会失败：
```
FAIL  expected 20 to be 25
```

**模拟测试**（`integration.test.ts`）仍然通过，因为它没有调用实际代码！

### 测试类型对比

| 测试文件 | 测试方式 | 是否真实 |
|----------|----------|----------|
| `progress.test.ts` | 直接调用 `DailyRecord` 类 | ✅ 真实测试 |
| `learningLogic.test.ts` | 直接调用 `determineLearningType` 函数 | ✅ 真实测试 |
| `learningSimulation.test.ts` | 直接调用 `determineLearningType` 函数 | ✅ 真实测试 |
| `integration.test.ts` | 使用 `simulateWordCompletion` 模拟函数 | ❌ 虚假测试 |

### 为什么会出现这个问题

1. **React Hooks 难以直接测试**
   ```typescript
   // React Hook 需要 React 组件上下文
   export function useWordProgress() {
     const dictID = useAtomValue(currentDictIdAtom)  // 需要 Jotai 上下文
     // ...
   }
   ```

2. **选择了"复制逻辑"的捷径**
   - 为了避免设置 React 测试环境
   - 创建了模拟函数来"模拟"行为
   - 但这导致测试与实际代码脱节

### 正确的测试方法

#### 方法1：测试纯函数

```typescript
// ✅ 正确：直接测试纯函数
import { updateMasteryLevel, getNextReviewTime } from '@/utils/db/progress'
import { determineLearningType } from './learningLogic'

it('should update mastery level correctly', () => {
  const result = updateMasteryLevel(MASTERY_LEVELS.NEW, true, 0, 2.5)
  expect(result.newLevel).toBe(MASTERY_LEVELS.LEARNED)  // 调用真实函数
})
```

#### 方法2：测试类实例

```typescript
// ✅ 正确：直接实例化类
import { DailyRecord, WordProgress } from '@/utils/db/progress'

it('should calculate totalReviewed correctly', () => {
  const record = new DailyRecord('dict-1', '2026-02-18')  // 真实类
  record.reviewedCount = 20
  record.extraReviewedCount = 5
  expect(record.totalReviewed).toBe(25)  // 调用真实的 getter
})
```

#### 方法3：使用测试库渲染真实组件

```typescript
// ✅ 正确：使用 @testing-library/react
import { render, screen, fireEvent } from '@testing-library/react'
import WordPanel from './WordPanel'

it('should increment count when clicking extra review button', async () => {
  render(<WordPanel word={mockWord} />)
  
  const button = screen.getByText('继续复习')
  fireEvent.click(button)
  
  // 验证真实组件的行为
  await waitFor(() => {
    expect(screen.getByText('复习中...')).toBeInTheDocument()
  })
})
```

### 改进方案

1. **删除模拟测试** ✅ 已完成
   - `integration.test.ts` 中的模拟函数测试已重写为真实测试

2. **保留真实测试** ✅ 已完成
   - `progress.test.ts` - 直接测试 `DailyRecord` 类 ✅
   - `learningLogic.test.ts` - 直接测试 `determineLearningType` 函数 ✅
   - `integration.test.ts` - 已重构为直接调用实际代码 ✅

3. **添加组件测试** ✅ 已完成
   - 使用 `@testing-library/react` 测试真实组件
   - 测试用户交互流程

### 教训总结

> **模拟函数不是测试**。如果测试代码复制了实际代码的逻辑，那只是"自我验证"，不是真正的测试。

> **测试应该调用实际代码**。只有调用实际代码，才能在代码改变时检测到问题。

> **避免"复制逻辑"的捷径**。虽然设置测试环境可能麻烦，但这是保证测试质量的必要代价。

---

## 2026-02-18 重构模拟测试为真实测试（已完成）

### 修改内容

将 `integration.test.ts` 中的模拟测试重构为真实测试：

| 修改前 | 修改后 |
|--------|--------|
| `simulateWordCompletion` 模拟函数 | 直接使用 `WordProgress` 和 `DailyRecord` 类 |
| `MockWordProgress` 类型 | 使用真实的 `WordProgress` 类 |
| `MockDailyRecord` 类型 | 使用真实的 `DailyRecord` 类 |
| 复制逻辑的测试 | 调用实际代码的测试 |

### 测试结果

```
Test Files  7 passed (7)
     Tests  128 passed (128)
```

### 验证真实性

修改实际代码后，测试会立即失败，证明测试是真实的。

---

## 2026-02-19 状态架构问题：数据生命周期混乱导致状态重置

### 问题描述

**现象**：背单词界面释义"出现了又没了"，统计数据在进入下一个单词时被重置。

**用户反馈**：
> "背单词界面没有释义，好像出现了又没了。是因为发音缓存的原因吗"

**实际原因**：不是发音缓存，而是状态管理架构设计问题。

### 问题分析

#### 1. 状态结构混乱

原有状态结构将不同生命周期的数据混合在一起：

```typescript
type TypingState = {
  chapterData: {
    words: [],           // 来自词库（外部数据）
    index: 0,            // 运行时状态
    wordCount: 0,        // 统计数据（累积）
    correctCount: 0,     // 统计数据（累积）
    wrongCount: 0,       // 统计数据（累积）
    wrongWordIndexes: [],// 统计数据（累积）
    // ...
  },
  timerData: {...},      // 统计数据（累积）
  wordInfoMap: {...},    // 缓存数据（持久）
  isTyping: false,       // UI状态（临时）
  isTransVisible: true,  // 用户偏好（持久）
}
```

#### 2. 重置策略粗暴

`SETUP_CHAPTER` 使用 `structuredClone(initialState)` 重置所有状态：

```typescript
case TypingStateActionType.SETUP_CHAPTER: {
  const newState = structuredClone(initialState)  // 重置了所有状态！
  newState.chapterData.words = newWords
  // ...
}
```

#### 3. 触发时机不可控

`SETUP_CHAPTER` 在 `words` 变化时自动触发：

```typescript
useEffect(() => {
  if (words !== undefined && words !== wordsRef.current) {
    dispatch({ type: TypingStateActionType.SETUP_CHAPTER, ... })
  }
}, [words])
```

而 `words` 变化的原因很多：
- `dailyRecord` 异步加载完成
- `loadVersion` 变化
- `learningWords` 重新计算

### 问题流程图

```
初始渲染
    │
    ├─ dailyRecord = null
    ├─ words 被设置
    └─ SETUP_CHAPTER 触发
           │
           ▼
    MDX 异步查询成功
    释义被添加到 wordInfoMap
           │
           ▼
    dailyRecord 异步加载完成
    从 null 变为有值
           │
           ▼
    触发 reloadWords()
           │
           ▼
    words 引用变化
           │
           ▼
    SETUP_CHAPTER 再次触发
           │
           ▼
    structuredClone(initialState)
    重置了所有状态！
           │
           ▼
    释义丢失、统计重置
```

### 为什么会出现这个问题

| 原因 | 说明 |
|------|------|
| **数据生命周期未分离** | 外部数据、统计数据、缓存数据、UI状态混在一起 |
| **重置策略粗暴** | "全有或全无"的重置，无法精确控制 |
| **触发时机不可控** | 异步数据加载导致多次触发重置 |
| **缺少架构设计** | 状态结构随功能增加而膨胀，没有规划 |

### 修复过程

#### 第一阶段：打补丁（临时修复）

```typescript
case TypingStateActionType.SETUP_CHAPTER: {
  const newState = structuredClone(initialState)
  // ... 手动保留各种数据
  newState.wordInfoMap = state.wordInfoMap
  newState.timerData = state.timerData
  newState.chapterData.wordCount = state.chapterData.wordCount
  // ... 更多补丁
}
```

**问题**：容易遗漏，维护成本高，代码冗余。

#### 第二阶段：架构重构（根本解决）

按数据生命周期分离状态：

```typescript
type TypingState = {
  // 1. 章节数据 - 每次加载重置
  chapterData: { words, index }

  // 2. 统计数据 - 会话内累积，不重置
  statsData: { wordCount, correctCount, timerData, ... }

  // 3. 缓存数据 - 持久化
  wordInfoMap: WordInfoMap

  // 4. UI状态 - 临时，可重置
  uiState: { isTyping, isFinished, ... }

  // 5. 用户偏好 - 持久化
  isTransVisible, isImmersiveMode
}
```

重置时只重置需要的部分：

```typescript
case TypingStateActionType.SETUP_CHAPTER: {
  return {
    ...state,
    chapterData: { words: newWords, index: 0 },  // 只重置这部分
    uiState: { ...initialUIState, isTyping: true },
    // statsData 和 wordInfoMap 保持不变
  }
}
```

### 架构优点

| 改进点 | 说明 |
|--------|------|
| **职责清晰** | 每部分数据有明确的生命周期 |
| **重置精确** | 可以只重置需要重置的部分 |
| **易于维护** | 修改一个部分不影响其他部分 |
| **易于扩展** | 可轻松添加新的状态分类 |

### 教训总结

> **状态管理需要架构设计**。随功能增加而膨胀的状态结构，最终会变得难以维护。

> **数据生命周期应该分离**。不同生命周期的数据应该分开管理，避免"一损俱损"。

> **重置策略应该精确**。"全有或全无"的重置策略是危险的，应该根据数据生命周期精确控制。

> **打补丁不是长久之计**。临时修复可以解决眼前问题，但根本解决需要架构重构。

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `store/index.ts` | 重构状态结构，按生命周期分离 |
| `Typing/index.tsx` | 更新状态访问路径 |
| `WordPanel/index.tsx` | 更新状态访问路径 |
| `Speed/index.tsx` | 更新状态访问路径 |
| `ResultScreen/index.tsx` | 更新状态访问路径 |
| `StartButton/index.tsx` | 更新状态访问路径 |
| `WordSound/index.tsx` | 更新状态访问路径 |
| `TextAreaHandler/index.tsx` | 更新状态访问路径 |
| `KeyEventHandler/index.tsx` | 更新状态访问路径 |
| `SharePicDialog.tsx` | 更新状态访问路径 |
| `utils/mixpanel.ts` | 更新统计数据访问路径 |
| `utils/db/index.ts` | 更新统计数据访问路径 |

### 测试结果

```
Test Files  1 passed (1)
     Tests  10 passed (10)
```

---

## 2026-02-19 架构重构遗漏组件的教训

### 问题描述

架构重构后，`PrevAndNextWord`、`WordChip`、`MiniWordChip`、`WordCard` 等组件仍然没有显示释义。

### 问题分析

#### 两个问题的根本原因不同

| 问题 | 根本原因 | 解决方案 |
|------|---------|---------|
| **释义消失** | `SETUP_CHAPTER` 重置了 `wordInfoMap` | 架构重构：保留 `wordInfoMap` |
| **组件没释义** | 组件没有使用 `wordInfoMap` | 组件修复：使用 `wordInfoMap` |

#### 架构重构做了什么

```
架构重构解决的问题：
┌─────────────────────────────────────────────────────────────────────┐
│  ✅ 数据层：wordInfoMap 不再被重置                                  │
│                                                                     │
│  SETUP_CHAPTER 触发                                                 │
│       │                                                             │
│       ▼                                                             │
│  重置前：wordInfoMap = { word1: { trans: [...] } }                  │
│  重置后：wordInfoMap = { word1: { trans: [...] } }  ← 保留了！      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 但组件层没有完全更新

```
架构重构遗漏的问题：
┌─────────────────────────────────────────────────────────────────────┐
│  WordPanel 组件                                                     │
│       └── ✅ 已更新：使用 wordInfoMap                               │
│                                                                     │
│  PrevAndNextWord 组件                                               │
│       └── ❌ 遗漏：仍然使用 word.trans                              │
│                                                                     │
│  WordChip 组件                                                      │
│       └── ❌ 遗漏：仍然使用 word.trans                              │
│                                                                     │
│  结果：wordInfoMap 有数据，但组件没用它                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 为什么会出现这个问题

| 原因 | 说明 |
|------|------|
| **搜索不完整** | 只搜索了使用旧状态结构的组件，没有搜索使用 `word.trans` 的组件 |
| **关注点偏差** | 专注于状态结构重构，忽略了组件层的数据使用方式 |
| **缺少全局视角** | 没有梳理所有使用释义数据的组件 |

### 正确的重构方法

#### 1. 搜索所有使用该数据的组件

```bash
# 搜索所有使用 word.trans 的地方
grep -r "word\.trans" src/
```

#### 2. 建立数据使用清单

| 数据 | 使用组件 | 是否更新 |
|------|---------|---------|
| `wordInfoMap` | `WordPanel` | ✅ |
| `word.trans` | `PrevAndNextWord` | ❌ 遗漏 |
| `word.trans` | `WordChip` | ❌ 遗漏 |
| `word.trans` | `MiniWordChip` | ❌ 遗漏 |
| `word.trans` | `WordCard` | ❌ 遗漏 |

#### 3. 逐个更新所有组件

### 教训总结

> **重构时需要检查所有使用该数据的组件**，而不仅仅是主要组件。

> **搜索应该基于数据使用**，而不仅仅是状态结构。搜索 `word.trans` 比搜索 `state.xxx` 更能发现问题。

> **建立数据使用清单**，确保所有使用该数据的组件都被更新。

> **架构重构解决数据层问题，组件修复解决组件层问题**，两者缺一不可。
