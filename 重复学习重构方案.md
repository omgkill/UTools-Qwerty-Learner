# 重复学习重构方案

## 一、问题根源

### 1.1 核心问题：状态管理混乱

当前重复学习存在**三个独立的状态源**，它们之间没有可靠的同步机制：

| 状态源 | 位置 | 问题 |
|--------|------|------|
| `store.uiState.isRepeatLearning` | Redux/Immer store | 是唯一被信任的状态源，但更新时机不可靠 |
| `learningWords` | useWordList 内部 state | 通过 `setLearningWords` 设置，但与 store 状态没有强制同步 |
| IndexedDB 中的状态 | typingStates 表 | 读取是异步的，恢复时机与 React 渲染周期不同步 |

### 1.2 问题链路图

```
用户点击"重复学习"
  ↓
handleStartRepeatLearning (并行执行三个操作)
  ├─ dispatch(SET_IS_REPEAT_LEARNING) → 更新 store
  ├─ setLearningWords(repeatWords) → 更新 learningWords
  └─ saveRepeatLearningState() → 异步写入 IndexedDB
       ↓
  问题：三个操作没有等待关系
  - saveRepeatLearningState 是异步的，但没人等它完成
  - 如果用户快速刷新页面，IndexedDB 可能还没写入
  
页面刷新后恢复
  ├─ 组件重新挂载
  ├─ useEffect 异步恢复状态
  └─ 保存逻辑可能已经触发
       ↓
  问题：竞态条件
  - 恢复操作和保存操作同时执行
  - 旧数据可能覆盖新恢复的数据
```

### 1.3 具体场景重现

**场景 1：用户学到第 10 个词，刷新页面，进度丢失**

```
T0: currentIndex = 10
T1: useEffect 触发，开始保存（异步）
T2: 用户刷新页面
T3: 页面重新加载，组件重新挂载
T4: 恢复 useEffect 开始执行（异步）
T5: 保存操作完成，写入 IndexedDB (currentIndex: 10)
T6: 恢复操作完成，设置 currentIndex = 10
T7: 但由于 React 渲染周期，currentIndex 可能被重置为 0
T8: 新的保存逻辑触发，写入 currentIndex: 0
T9: 用户看到从头开始 ❌
```

**场景 2：跨天后状态无法恢复**

```
T0: 23:50 用户开始重复学习
T1: 00:10 第二天，用户打开应用
T2: 日期检查失败 (saved.date !== today)
T3: 状态无法恢复，进度丢失 ❌
```

**场景 3：快速学习导致状态覆盖**

```
T0: 用户学到第 5 个词，触发保存
T1: 用户快速学到第 6 个词，触发保存
T2: 两次保存读取到相同的旧数据
T3: 第二次保存覆盖第一次，currentIndex 停留在 5 ❌
```

## 二、解决方案

### 2.1 核心设计原则

1. **单一状态源**：所有状态都通过 `RepeatLearningManager` 管理
2. **原子操作**：每次更新都是原子的，避免并发问题
3. **版本控制**：使用 version 检测并发更新
4. **同步优先**：关键操作使用同步逻辑

### 2.2 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                 RepeatLearningManager                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │           内存状态 (runtimeState)                 │  │
│  │  - isRepeatLearning: boolean                      │  │
│  │  - learningWords: WordWithIndex[]                 │  │
│  │  - currentIndex: number                           │  │
│  │  - version: number                                │  │
│  └───────────────────────────────────────────────────┘  │
│                         ↓ 同步                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          操作方法 (原子化)                        │  │
│  │  - initialize()  → 初始化/恢复状态                │  │
│  │  - start()       → 开始新的重复学习               │  │
│  │  - updateIndex() → 更新当前位置                   │  │
│  │  - clear()       → 清除状态                       │  │
│  └───────────────────────────────────────────────────┘  │
│                         ↓ 异步                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │       IndexedDB (持久化，带版本控制)              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.3 数据流

```
用户操作
  ↓
调用 Manager 方法（同步更新内存）
  ↓
立即返回最新状态（同步）
  ↓
异步保存到 IndexedDB（带版本检查）
  ↓
如果版本冲突，放弃保存（避免覆盖）
```

## 三、实施步骤

### 3.1 新增文件

- `src/pages/Typing/hooks/useRepeatLearningManager.ts`

### 3.2 修改文件

#### 1. 修改 `src/pages/Typing/index.tsx`

**修改前**：
```typescript
const { loadRepeatLearningState, saveRepeatLearningState, clearRepeatLearningState } = useRepeatLearningPersistence()
const normalLearningWordsRef = useRef<typeof words>(undefined)
const normalLearningTypeRef = useRef<LearningType>(learningType)
const prevIsRepeatLearningRef = useRef(isRepeatLearning)

// 恢复逻辑
useEffect(() => {
  const restore = async () => {
    if (!currentDictId || hasRestoredRef.current) return
    const saved = await loadRepeatLearningState(currentDictId)
    if (saved?.isRepeatLearning && saved.learningWords.length > 0) {
      dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
      setLearningWords(saved.learningWords)
      setLearningType('review')
      if (saved.currentIndex > 0 && saved.currentIndex < saved.learningWords.length) {
        dispatch({ type: TypingStateActionType.SET_CURRENT_INDEX, payload: saved.currentIndex })
      }
      hasRestoredRef.current = true
    }
  }
  restore()
}, [currentDictId, loadRepeatLearningState, dispatch, setLearningWords, setLearningType])

// 保存逻辑
useEffect(() => {
  if (isRepeatLearning && learningWords && learningWords.length > 0) {
    saveRepeatLearningState(currentDictId, {
      isRepeatLearning: true,
      learningWords: learningWords,
      currentIndex: state.wordListData.index,
    })
  }
}, [isRepeatLearning, learningWords, state.wordListData.index, currentDictId, saveRepeatLearningState])
```

**修改后**：
```typescript
import { useRepeatLearningManager } from './hooks/useRepeatLearningManager'

const repeatLearningManager = useRepeatLearningManager()
const normalLearningWordsRef = useRef<typeof words>(undefined)
const normalLearningTypeRef = useRef<LearningType>(learningType)

// 初始化（组件挂载时立即执行）
useEffect(() => {
  if (!currentDictId) return
  
  const initializeRepeatLearning = async () => {
    const state = await repeatLearningManager.initialize(currentDictId)
    if (state) {
      dispatch({ type: TypingStateActionType.SET_IS_REPEAT_LEARNING, payload: true })
      setLearningWords(state.learningWords)
      setLearningType('review')
      if (state.currentIndex > 0) {
        dispatch({ type: TypingStateActionType.SET_CURRENT_INDEX, payload: state.currentIndex })
      }
    }
  }
  
  initializeRepeatLearning()
}, [currentDictId, dispatch, setLearningWords, setLearningType, repeatLearningManager])

// 保存逻辑（每次 currentIndex 变化时）
useEffect(() => {
  if (!currentDictId || !repeatLearningManager.isRepeatLearning()) return
  
  // 同步更新内存状态，异步保存到 IndexedDB
  repeatLearningManager.updateIndex(currentDictId, state.wordListData.index)
}, [currentDictId, state.wordListData.index, repeatLearningManager])
```

#### 2. 修改 `src/pages/Typing/hooks/useWordList.ts`

移除对 `isRepeatLearning` 参数的依赖，改为通过外部控制：

```typescript
// 移除 isRepeatLearning 参数
export function useWordList(): UseWordListResult {
  // ... 其他逻辑
  
  // 移除对 isRepeatLearning 的检查
  const loadLearningWords = useCallback(async () => {
    // 不再检查 isRepeatLearning
    // 由外部通过 setLearningWords 控制
  }, [])
  
  // ...
}
```

#### 3. 删除或废弃 `useRepeatLearningPersistence.ts`

该文件的功能已被 `useRepeatLearningManager` 替代。

### 3.3 新增测试用例

创建 `src/pages/Typing/hooks/repeatLearningManager.test.ts`：

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { db } from '@/utils/db'
import { useRepeatLearningManager } from './useRepeatLearningManager'
import 'fake-indexeddb/auto'

describe('RepeatLearningManager', () => {
  const dictId = 'test-dict'
  
  beforeEach(async () => {
    await db.typingStates.clear()
  })
  
  afterEach(async () => {
    await db.typingStates.clear()
  })
  
  it('应该能够初始化和恢复状态', async () => {
    const manager = useRepeatLearningManager()
    
    // 初始状态为空
    expect(manager.getState()).toBeNull()
    
    // 创建测试数据
    const learningWords = [
      { name: 'word1', trans: ['测试 1'], index: 0 },
      { name: 'word2', trans: ['测试 2'], index: 1 },
    ]
    
    // 开始重复学习
    const state = await manager.start(dictId, learningWords)
    
    expect(state.isRepeatLearning).toBe(true)
    expect(state.learningWords.length).toBe(2)
    expect(state.currentIndex).toBe(0)
    
    // 更新索引
    await manager.updateIndex(dictId, 5)
    
    expect(manager.getCurrentIndex()).toBe(5)
    expect(manager.isRepeatLearning()).toBe(true)
  })
  
  it('应该能够跨页面刷新保持状态', async () => {
    // 模拟第一个页面
    const manager1 = useRepeatLearningManager()
    const learningWords = [
      { name: 'word1', trans: ['测试 1'], index: 0 },
      { name: 'word2', trans: ['测试 2'], index: 1 },
    ]
    
    await manager1.start(dictId, learningWords)
    await manager1.updateIndex(dictId, 3)
    
    // 等待 IndexedDB 保存完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 模拟第二个页面（刷新后）
    const manager2 = useRepeatLearningManager()
    const restoredState = await manager2.initialize(dictId)
    
    expect(restoredState).not.toBeNull()
    expect(restoredState?.currentIndex).toBe(3)
    expect(restoredState?.learningWords.length).toBe(2)
  })
  
  it('应该使用版本控制避免并发覆盖', async () => {
    const manager = useRepeatLearningManager()
    const learningWords = [
      { name: 'word1', trans: ['测试 1'], index: 0 },
    ]
    
    await manager.start(dictId, learningWords)
    
    // 模拟快速连续更新
    await Promise.all([
      manager.updateIndex(dictId, 1),
      manager.updateIndex(dictId, 2),
      manager.updateIndex(dictId, 3),
    ])
    
    // 最终状态应该是最新的
    expect(manager.getCurrentIndex()).toBe(3)
  })
  
  it('应该能够清除状态', async () => {
    const manager = useRepeatLearningManager()
    const learningWords = [
      { name: 'word1', trans: ['测试 1'], index: 0 },
    ]
    
    await manager.start(dictId, learningWords)
    await manager.clear(dictId)
    
    expect(manager.getState()).toBeNull()
    expect(manager.isRepeatLearning()).toBe(false)
  })
})
```

## 四、验证标准

### 4.1 功能测试

- [ ] 开始重复学习后，状态正确初始化
- [ ] 学习过程中，currentIndex 正确保存
- [ ] 刷新页面后，能够恢复到正确的进度
- [ ] 跨天后，状态正确失效
- [ ] 退出重复学习后，状态正确清除

### 4.2 边界测试

- [ ] 快速连续更新 currentIndex，不会丢失进度
- [ ] 网络/IO 延迟时，状态不会覆盖
- [ ] 多个标签页同时操作，版本控制生效

### 4.3 性能测试

- [ ] 内存状态读取时间 < 1ms
- [ ] IndexedDB 保存不阻塞 UI
- [ ] 版本检查不增加明显延迟

## 五、回滚方案

如果新方案出现问题，可以：

1. 保留 `useRepeatLearningPersistence.ts`
2. 在 `index.tsx` 中切换回原来的实现
3. 新方案作为可选功能，通过配置开关控制

## 六、时间线

| 阶段 | 时间 | 任务 |
|------|------|------|
| Phase 1 | Day 1 | 创建 `useRepeatLearningManager`，编写单元测试 |
| Phase 2 | Day 2 | 集成到 `index.tsx`，修改相关逻辑 |
| Phase 3 | Day 3 | 集成测试，修复 bug |
| Phase 4 | Day 4 | 性能优化，文档更新 |
| Phase 5 | Day 5 | 灰度测试，收集反馈 |

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 版本控制逻辑复杂 | 中 | 中 | 详细注释，单元测试覆盖 |
| 内存状态与 IndexedDB 不一致 | 低 | 高 | 版本检查，日志记录 |
| 旧代码残留导致混淆 | 中 | 低 | 彻底清理旧代码，文档说明 |
