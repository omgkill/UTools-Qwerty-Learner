# UTools-Qwerty-Learner 重构方案

> 文档版本：v1.0
> 更新日期：2026-03-18
> 基于分析报告：[REFACTOR-ANALYSIS.md](./REFACTOR-ANALYSIS.md)

---

## 一、重构目标

### 1.1 量化目标

| 指标 | 当前值 | 目标值 | 说明 |
|-----|-------|-------|------|
| 代码总行数 | ~10,342 行 | ~9,000 行 | 减少约 13% |
| 重复代码比例 | ~15% | <5% | 消除冗余 |
| useState 数量 | 84 处 | ~70 处 | 减少不必要的状态 |
| Typing 页面文件 | 3 个（295 行） | 2 个（~150 行） | 合并重复页面 |

### 1.2 质量目标

- ✅ 保持所有功能不变
- ✅ 不引入新的 bug
- ✅ 每阶段可独立测试和回滚
- ✅ 代码可读性提升

### 1.3 范围边界

**本次重构包含**：
- 高优先级问题 #1-#5
- 中优先级问题 #6-#7（部分）

**本次重构不包含**：
- 类型定义重构（#8）- 影响范围大，建议单独处理
- Volume 图标合并（#9）- 优先级低，可延后
- UI/UX 改动
- 新功能开发

---

## 二、重构阶段规划

### 依赖关系图

```
阶段1（基础清理） ──→ 阶段2（Hooks整合） ──→ 阶段3（页面统一）
                                                    │
                              阶段4（组件优化） ←────┘
```

### 阶段概览

| 阶段 | 名称 | 预估工时 | 风险等级 | 验收标准 |
|-----|------|---------|---------|---------|
| 阶段1 | 基础清理 | 1h | 低 | 所有测试通过 |
| 阶段2 | Hooks 整合 | 2h | 中 | 所有测试通过 |
| 阶段3 | 学习页面统一 | 3h | 中 | 功能不变，测试通过 |
| 阶段4 | 组件优化 | 2h | 低 | 所有测试通过 |

---

## 三、阶段一：基础清理

### 3.1 目标

- 消除命名混淆
- 提取重复常量
- 为后续重构做准备

### 3.2 改动清单

#### 任务 1.1：移除 store 别名导出

**文件**：`src/store/index.ts`

**改动内容**：

```typescript
// ❌ 删除这些别名
export const dictionariesAtom = wordBanksAtom
export const idDictionaryMapAtom = idWordBankMapAtom
export const currentDictIdAtom = currentWordBankIdAtom
export const currentDictInfoAtom = currentWordBankAtom
```

**影响范围**：需要更新所有导入 `currentDictIdAtom` 的文件

**迁移映射表**：

| 旧导入 | 新导入 |
|-------|-------|
| `currentDictIdAtom` | `currentWordBankIdAtom` |
| `currentDictInfoAtom` | `currentWordBankAtom` |
| `dictionariesAtom` | `wordBanksAtom` |
| `idDictionaryMapAtom` | `idWordBankMapAtom` |

**涉及文件**：
- `src/pages/Typing/hooks/useLearningSession/index.ts`
- `src/pages/Typing/hooks/useTypingInitializer.ts`
- 其他使用别名的文件

#### 任务 1.2：提取 emptyStats 常量

**文件**：`src/pages/Typing/hooks/useLearningSession/strategies.ts`

**改动内容**：

```typescript
// 新增：提取公共常量
import type { LearningStats } from '@/types'

export const EMPTY_STATS: LearningStats = {
  todayLearned: 0,
  todayReviewed: 0,
  todayMastered: 0,
  dueCount: 0,
  newCount: 0,
  masteredCount: 0,
}

// 修改：使用常量
export const repeatStrategy: WordSourceStrategy = {
  getStats(): LearningStats {
    return EMPTY_STATS
  },
  // ...
}

export const consolidateStrategy: WordSourceStrategy = {
  getStats(): LearningStats {
    return EMPTY_STATS
  },
  // ...
}
```

### 3.3 验收标准

- [ ] `npm test` 全部通过
- [ ] `npm run lint` 无错误
- [ ] 手动测试三种学习模式正常
- [ ] 无 TypeScript 编译错误

### 3.4 回滚方案

```bash
# 如果出现问题，回滚到阶段1开始前的提交
git revert <commit-hash>
```

---

## 四、阶段二：Hooks 整合

### 4.1 目标

- 消除 hooks 职责重叠
- 创建统一的学习页面初始化 hook
- 减少页面代码重复

### 4.2 改动清单

#### 任务 2.1：增强 useTypingPageBase

**文件**：`src/pages/Typing/hooks/useTypingPageBase.ts`

**当前问题**：
- 只包含部分基础 hooks
- 三个页面仍需重复调用多个 hooks

**改动方案**：

```typescript
// src/pages/Typing/hooks/useTypingPageBase.ts
import { useTypingTimer } from './useTypingTimer'
import { useKeyboardStartListener } from './useKeyboardStartListener'
import { useTypingHotkeys } from './useTypingHotkeys'
import { useUtoolsMode } from './useUtoolsMode'
import { useWindowBlur } from './useWindowBlur'
import { useLearningRecordSaver } from './useLearningRecordSaver'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import {
  isImmersiveModeAtom,
  isTypingAtom,
  setIsTypingAtom,
  toggleImmersiveModeAtom,
} from '../store/atoms/index'

export interface UseTypingPageBaseOptions {
  /** 是否启用学习记录保存，默认 true */
  enableRecordSaver?: boolean
}

export interface UseTypingPageBaseResult {
  isTyping: boolean
  isImmersiveMode: boolean
  toggleImmersiveMode: (value?: boolean) => void
  setIsTyping: (value: boolean) => void
}

export function useTypingPageBase(
  options: UseTypingPageBaseOptions = {}
): UseTypingPageBaseResult {
  const { enableRecordSaver = true } = options

  const isTyping = useAtomValue(isTypingAtom)
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const toggleImmersiveMode = useSetAtom(toggleImmersiveModeAtom)
  const setIsTyping = useSetAtom(setIsTypingAtom)

  // 基础 hooks
  useUtoolsMode()
  useWindowBlur()
  useTypingHotkeys()
  useTypingTimer(isTyping)
  useKeyboardStartListener(isTyping, false)

  // 可选的学习记录保存
  if (enableRecordSaver) {
    useLearningRecordSaver({ uiState: { isTyping } } as Parameters<typeof useLearningRecordSaver>[0])
  }

  // 模式切换监听
  useEffect(() => {
    const handleModeChange = () => {
      const windowMode = window.getMode()
      if (windowMode === 'conceal' || windowMode === 'moyu') {
        toggleImmersiveMode(true)
      } else {
        toggleImmersiveMode(false)
      }
    }

    handleModeChange()
    window.addEventListener('utools-mode-change', handleModeChange)
    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
  }, [toggleImmersiveMode])

  // 窗口失焦处理
  useEffect(() => {
    const onBlur = () => {
      setIsTyping(false)
    }
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [setIsTyping])

  return {
    isTyping,
    isImmersiveMode,
    toggleImmersiveMode,
    setIsTyping,
  }
}
```

#### 任务 2.2：删除未使用的 useLearningPage

**文件**：`src/pages/Typing/hooks/useLearningPage.ts`

**改动内容**：删除此文件，因为：
1. 当前没有被使用
2. 职责已被 `useTypingPageBase` 覆盖
3. 保留会增加维护成本

#### 任务 2.3：创建 useTypingPageSetup

**新文件**：`src/pages/Typing/hooks/useTypingPageSetup.ts`

**目的**：提供统一的页面初始化入口，进一步减少重复代码

```typescript
import { useTypingInitializer } from './useTypingInitializer'
import { useTypingPageBase, type UseTypingPageBaseResult } from './useTypingPageBase'
import { useConfetti } from './useConfetti'
import type { WordBank, LearningMode } from '@/types'

export interface UseTypingPageSetupOptions {
  mode: LearningMode
}

export interface UseTypingPageSetupResult extends UseTypingPageBaseResult {
  isInitialized: boolean
  currentWordBank: WordBank | null
}

/**
 * 统一的学习页面初始化 hook
 * 整合了所有页面共用的初始化逻辑
 */
export function useTypingPageSetup(options: UseTypingPageSetupOptions): UseTypingPageSetupResult {
  const { mode } = options

  const { isInitialized, currentWordBank } = useTypingInitializer()
  const pageBase = useTypingPageBase()

  // Normal 模式特有的彩带效果
  useConfetti(
    mode === 'normal' && pageBase.isTyping === false && !pageBase.isImmersiveMode
  )

  return {
    ...pageBase,
    isInitialized,
    currentWordBank,
  }
}
```

### 4.3 迁移路径

**步骤 1**：创建新 hook，保持旧代码不变

**步骤 2**：逐个页面迁移

```typescript
// 迁移前（NormalTypingPage.tsx）
const NormalTypingAppInner: React.FC<NormalTypingAppInnerProps> = ({ currentWordBank }) => {
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const isTyping = useAtomValue(isTypingAtom)

  useUtoolsMode()
  useWindowBlur()
  useTypingHotkeys(isImmersiveMode)
  useLearningRecordSaver({ uiState: { isTyping } } as Parameters<typeof useLearningRecordSaver>[0])
  useTypingTimer(isTyping)
  useKeyboardStartListener(isTyping, false)
  useConfetti(isFinished && !isImmersiveMode)
  // ...
}

// 迁移后
const NormalTypingAppInner: React.FC<NormalTypingAppInnerProps> = ({ currentWordBank }) => {
  const { isTyping, isImmersiveMode } = useTypingPageSetup({ mode: 'normal' })
  // ...
}
```

**步骤 3**：删除旧的 hooks 调用

### 4.4 验收标准

- [ ] `npm test` 全部通过
- [ ] 三种学习模式功能正常
- [ ] 沉浸模式切换正常
- [ ] 窗口失焦行为正确

### 4.5 回滚方案

```bash
# 恢复被删除的文件
git checkout HEAD~1 -- src/pages/Typing/hooks/useLearningPage.ts
# 恢复页面文件的 hooks 调用
git checkout HEAD~1 -- src/pages/Typing/*TypingPage.tsx
```

---

## 五、阶段三：学习页面统一

### 5.1 目标

- 合并 RepeatTypingPage 和 ConsolidateTypingPage
- 创建配置化的页面组件
- 减少约 100 行重复代码

### 5.2 分析：页面差异点

| 差异项 | NormalTypingPage | RepeatTypingPage | ConsolidateTypingPage |
|-------|-----------------|-----------------|----------------------|
| 学习模式 | normal | repeat | consolidate |
| 空状态文案 | 今日学习完成 | 暂无可重复学习的单词 | 暂无可巩固的单词 |
| 退出按钮 | 无 | 有 | 有 |
| 学习统计 | 有 | 无 | 无 |
| handleMastered | 有 | 无 | 无 |
| headerExtra | 复杂统计 | 简单进度 | 简单进度 |

**结论**：RepeatTypingPage 和 ConsolidateTypingPage 差异仅在于文案，可以合并。

### 5.3 改动方案

#### 任务 3.1：创建配置化页面组件

**新文件**：`src/pages/Typing/ExtraTypingPage.tsx`

```typescript
import WordPanel from './components/WordPanel'
import { LearningPageLayout } from './components/LearningPageLayout'
import { TypingPageEmptyState, TypingPageLoading } from './components/TypingPageStates'
import { useLearningSession } from './hooks/useLearningSession'
import { useTypingPageSetup } from './hooks/useTypingPageSetup'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import type { WordBank, LearningMode } from '@/types'

/** 页面配置 */
interface ExtraTypingPageConfig {
  mode: 'repeat' | 'consolidate'
  labels: {
    typeIcon: string
    typeLabel: string
    emptyIcon: string
    emptyTitle: string
    emptyDescription: string
    exitButtonText: string
  }
}

const PAGE_CONFIGS: Record<'repeat' | 'consolidate', ExtraTypingPageConfig> = {
  repeat: {
    mode: 'repeat',
    labels: {
      typeIcon: '🔄',
      typeLabel: '重复学习',
      emptyIcon: '📚',
      emptyTitle: '暂无可重复学习的单词',
      emptyDescription: '请先进行正常学习，积累一定数量的单词后再来重复学习',
      exitButtonText: '退出重复学习',
    },
  },
  consolidate: {
    mode: 'consolidate',
    labels: {
      typeIcon: '🔁',
      typeLabel: '巩固学习',
      emptyIcon: '📚',
      emptyTitle: '暂无可巩固的单词',
      emptyDescription: '请先进行正常学习，积累一定数量的单词后再来巩固学习',
      exitButtonText: '退出巩固学习',
    },
  },
}

interface ExtraTypingAppInnerProps {
  currentWordBank: WordBank
  config: ExtraTypingPageConfig
}

const ExtraTypingAppInner: React.FC<ExtraTypingAppInnerProps> = ({ currentWordBank, config }) => {
  const navigate = useNavigate()
  const { isImmersiveMode, isTyping } = useTypingPageSetup({ mode: config.mode })

  const { words, isLoading, hasWords, displayIndex, handleExit } = useLearningSession({
    mode: config.mode,
    currentWordBank,
  })

  if (isLoading) {
    return <TypingPageLoading />
  }

  if (!hasWords) {
    return (
      <TypingPageEmptyState
        icon={config.labels.emptyIcon}
        title={config.labels.emptyTitle}
        description={config.labels.emptyDescription}
        buttonText="返回正常学习"
        onButtonClick={() => navigate('/')}
      />
    )
  }

  const headerExtra = (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-indigo-200">
        {config.labels.typeIcon} {config.labels.typeLabel}
      </span>
      <span className="rounded bg-white/20 px-2 py-0.5">
        {displayIndex + 1} / {words.length}
      </span>
    </div>
  )

  const handleExitAndNavigate = () => {
    handleExit()
    navigate('/')
  }

  return (
    <LearningPageLayout
      wordBankName={currentWordBank.name}
      isImmersiveMode={isImmersiveMode}
      headerExtra={headerExtra}
      showExitButton
      exitButtonText={config.labels.exitButtonText}
      onExit={handleExitAndNavigate}
    >
      <WordPanel />
    </LearningPageLayout>
  )
}

// 导出两个工厂函数
export function RepeatTypingApp({ currentWordBank }: { currentWordBank: WordBank }) {
  return <ExtraTypingAppInner currentWordBank={currentWordBank} config={PAGE_CONFIGS.repeat} />
}

export function ConsolidateTypingApp({ currentWordBank }: { currentWordBank: WordBank }) {
  return <ExtraTypingAppInner currentWordBank={currentWordBank} config={PAGE_CONFIGS.consolidate} />
}
```

#### 任务 3.2：更新页面入口

**文件**：`src/pages/Typing/RepeatTypingPage.tsx`

```typescript
import { RepeatTypingApp } from './ExtraTypingPage'
import { TypingPageLoading } from './components/TypingPageStates'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import type React from 'react'

const RepeatTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <RepeatTypingApp currentWordBank={currentWordBank} />
}

export default RepeatTypingPage
```

**文件**：`src/pages/Typing/ConsolidateTypingPage.tsx`

```typescript
import { ConsolidateTypingApp } from './ExtraTypingPage'
import { TypingPageLoading } from './components/TypingPageStates'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import type React from 'react'

const ConsolidateTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <ConsolidateTypingApp currentWordBank={currentWordBank} />
}

export default ConsolidateTypingPage
```

#### 任务 3.3：优化 NormalTypingPage

使用 `useTypingPageSetup` 简化 NormalTypingPage：

```typescript
import WordPanel from './components/WordPanel'
import { LearningPageLayout } from './components/LearningPageLayout'
import { TypingPageEmptyState, TypingPageLoading } from './components/TypingPageStates'
import { useLearningSession } from './hooks/useLearningSession'
import { useTypingPageSetup } from './hooks/useTypingPageSetup'
import { useTypingInitializer } from './hooks/useTypingInitializer'
import type React from 'react'
import { useCallback } from 'react'
import type { WordBank } from '@/types'

const LEARNING_TYPE_LABELS = {
  review: { icon: '🔄', label: '复习' },
  new: { icon: '📚', label: '新词' },
  complete: { icon: '✅', label: '完成' },
} as const

interface NormalTypingAppInnerProps {
  currentWordBank: WordBank
}

const NormalTypingAppInner: React.FC<NormalTypingAppInnerProps> = ({ currentWordBank }) => {
  const { isTyping, isImmersiveMode } = useTypingPageSetup({ mode: 'normal' })

  const { isLoading, hasWords, isFinished, learningType, stats, handleMastered } = useLearningSession({
    mode: 'normal',
    currentWordBank,
  })

  const handleCompleteClick = useCallback(() => {
    // 完成状态无需操作
  }, [])

  if (isLoading) {
    return <TypingPageLoading />
  }

  if (!hasWords || learningType === 'complete') {
    return (
      <TypingPageEmptyState
        icon="🎉"
        title="✓ 学习完成"
        description={`今日学习 ${stats.todayLearned + stats.todayReviewed} 个单词（新词 ${stats.todayLearned} 个，复习 ${stats.todayReviewed} 个）`}
        buttonText="明天继续加油！"
        onButtonClick={handleCompleteClick}
      />
    )
  }

  const typeInfo = LEARNING_TYPE_LABELS[learningType]

  const headerExtra = (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="rounded bg-white/20 px-2 py-0.5">
        {typeInfo.icon} {typeInfo.label}
      </span>
      {(stats.todayLearned > 0 || stats.todayReviewed > 0) && (
        <span className="rounded bg-white/20 px-2 py-0.5">今日 {stats.todayLearned + stats.todayReviewed} 词</span>
      )}
      {stats.todayMastered > 0 && (
        <span className="rounded bg-purple-500/30 px-2 py-0.5 text-purple-200">✓ 已掌握 {stats.todayMastered}</span>
      )}
      {stats.dueCount > 0 && (
        <span className="rounded bg-orange-500/30 px-2 py-0.5 text-orange-200">待复习 {stats.dueCount}</span>
      )}
      {stats.newCount > 0 && learningType === 'new' && (
        <span className="rounded bg-green-500/30 px-2 py-0.5 text-green-200">新词 {stats.newCount}</span>
      )}
    </div>
  )

  return (
    <LearningPageLayout
      wordBankName={currentWordBank.name}
      isImmersiveMode={isImmersiveMode}
      headerExtra={headerExtra}
    >
      <WordPanel onMastered={handleMastered} />
    </LearningPageLayout>
  )
}

const NormalTypingPage: React.FC = () => {
  const { isInitialized, currentWordBank } = useTypingInitializer()

  if (!isInitialized || !currentWordBank) {
    return <TypingPageLoading />
  }

  return <NormalTypingAppInner currentWordBank={currentWordBank} />
}

export default NormalTypingPage
```

### 5.4 预期效果

| 指标 | 改动前 | 改动后 | 减少 |
|-----|-------|-------|-----|
| RepeatTypingPage.tsx | 93 行 | ~15 行 | -78 行 |
| ConsolidateTypingPage.tsx | 93 行 | ~15 行 | -78 行 |
| 新增 ExtraTypingPage.tsx | 0 行 | ~100 行 | +100 行 |
| **净减少** | - | - | **~56 行** |

### 5.5 验收标准

- [ ] `npm test` 全部通过
- [ ] 正常学习模式功能完整（统计、掌握按钮等）
- [ ] 重复学习模式功能正确（退出按钮、进度显示）
- [ ] 巩固学习模式功能正确（退出按钮、进度显示）
- [ ] 空状态文案正确显示
- [ ] 沉浸模式切换正常

### 5.6 回滚方案

```bash
# 恢复原始页面文件
git checkout HEAD~1 -- src/pages/Typing/RepeatTypingPage.tsx
git checkout HEAD~1 -- src/pages/Typing/ConsolidateTypingPage.tsx
# 删除新增文件
rm src/pages/Typing/ExtraTypingPage.tsx
```

---

## 六、阶段四：组件优化

### 6.1 目标

- 拆分 WordPanel 组件
- 提高可测试性和可维护性

### 6.2 WordPanel 职责分析

当前 `WordPanel/index.tsx` 承担以下职责：

| 职责 | 行数 | 可拆分性 |
|-----|------|---------|
| 单词显示 | ~30 行 | 低（核心渲染） |
| MDX 查询 | ~40 行 | 高 → 提取为 hook |
| 快捷键处理 | ~10 行 | 高 → 提取为 hook |
| 发音预加载 | ~10 行 | 中 → 提取为 hook |
| 上下词显示 | ~15 行 | 低 |

### 6.3 改动方案

#### 任务 4.1：提取 useWordMeaning hook

**新文件**：`src/pages/Typing/hooks/useWordMeaning.ts`

```typescript
import { useCallback, useEffect, useRef } from 'react'
import { useSetAtom } from 'jotai'
import { parseMdxEntry } from '@/utils/mdxParser'
import { updateWordDisplayInfoAtom, wordDisplayInfoMapAtom } from '../store'
import type { Word } from '@/types'

export function useWordMeaning() {
  const updateWordDisplayInfo = useSetAtom(updateWordDisplayInfoAtom)
  const wordDisplayInfoMapRef = useRef<Record<string, unknown>>({})
  const queriedWordsRef = useRef(new Set<string>())

  const requestWordMeaning = useCallback(
    async (targetWord: Word | undefined) => {
      if (!targetWord) return
      if (!window.queryFirstMdxWord) return
      const dicts = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
      if (!dicts[0]) return
      if (queriedWordsRef.current.has(targetWord.name)) return

      const existingInfo = wordDisplayInfoMapRef.current[targetWord.name]
      const hasTranslations = existingInfo?.trans && existingInfo.trans.length > 0
      const hasPhonetics = Boolean(existingInfo?.ukphone)
      if (hasTranslations && hasPhonetics) return

      queriedWordsRef.current.add(targetWord.name)
      try {
        const result = await window.queryFirstMdxWord(targetWord.name)
        if (!result || !result.ok || !result.content) return

        const parsed = parseMdxEntry(result.content)
        if (parsed.translations.length === 0 && !parsed.phonetics.uk && !parsed.tense) return

        updateWordDisplayInfo({
          wordName: targetWord.name,
          data: {
            trans: parsed.translations.length > 0 ? parsed.translations : undefined,
            ukphone: parsed.phonetics.uk || undefined,
            tense: parsed.tense || undefined,
          },
        })
      } catch (e) {
        console.error('Failed to query word meaning:', targetWord.name, e)
      }
    },
    [updateWordDisplayInfo],
  )

  return { requestWordMeaning }
}
```

#### 任务 4.2：提取 useWordDetailNavigation hook

**新文件**：`src/pages/Typing/hooks/useWordDetailNavigation.ts`

```typescript
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { useAtomValue } from 'jotai'
import { hotkeyConfigAtom } from '@/store'
import { currentWordAtom } from '../store'

export function useWordDetailNavigation() {
  const navigate = useNavigate()
  const currentWord = useAtomValue(currentWordAtom)
  const hotkeyConfig = useAtomValue(hotkeyConfigAtom)

  const handleViewDetail = useCallback(() => {
    if (currentWord) {
      navigate(`/query/${encodeURIComponent(currentWord.name)}`)
    }
  }, [currentWord, navigate])

  useHotkeys(
    hotkeyConfig.viewDetail,
    () => {
      handleViewDetail()
    },
    { preventDefault: true },
    [handleViewDetail],
  )

  return { handleViewDetail }
}
```

#### 任务 4.3：重构 WordPanel

**文件**：`src/pages/Typing/components/WordPanel/index.tsx`

简化后的结构：

```typescript
import PrevAndNextWord from '../PrevAndNextWord'
import Phonetic from './components/Phonetic'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import Tooltip from '@/components/Tooltip'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import { phoneticConfigAtom, isShowPrevAndNextWordAtom } from '@/store'
import type { Word } from '@/types'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import {
  currentWordAtom,
  finishLearningAtom,
  isImmersiveModeAtom,
  isTypingAtom,
  isTransVisibleAtom,
  nextWordAtom,
  nextWordDisplayAtom,
  prevWordAtom,
  timerDataAtom,
  wordDisplayInfoMapAtom,
} from '../../store'
import { useWordMeaning } from '../../hooks/useWordMeaning'
import { useWordDetailNavigation } from '../../hooks/useWordDetailNavigation'

export default function WordPanel({ onMastered }: { onMastered?: () => void }) => {
  const handleMastered = onMastered ?? (() => undefined)

  // 状态
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)
  const currentWord = useAtomValue(currentWordAtom)
  const prevWord = useAtomValue(prevWordAtom)
  const nextWord = useAtomValue(nextWordDisplayAtom)
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const isTyping = useAtomValue(isTypingAtom)
  const isTransVisible = useAtomValue(isTransVisibleAtom)
  const wordDisplayInfoMap = useAtomValue(wordDisplayInfoMapAtom)
  const timerData = useAtomValue(timerDataAtom)

  // Actions
  const goToNextWord = useSetAtom(nextWordAtom)
  const finishLearning = useSetAtom(finishLearningAtom)

  // 自定义 hooks
  const { requestWordMeaning } = useWordMeaning()
  const { handleViewDetail } = useWordDetailNavigation()

  // 发音预加载
  usePrefetchPronunciationSound(currentWord?.name)
  usePrefetchPronunciationSound(prevWord?.name)
  usePrefetchPronunciationSound(nextWord?.name)

  // MDX 查询
  useEffect(() => {
    void requestWordMeaning(prevWord)
    void requestWordMeaning(currentWord)
    void requestWordMeaning(nextWord)
  }, [requestWordMeaning, prevWord, currentWord, nextWord])

  // 完成当前单词
  const onFinish = () => {
    const finished = goToNextWord()
    if (finished) {
      finishLearning()
    }
  }

  // 显示数据
  const wordDisplayInfo = currentWord ? wordDisplayInfoMap[currentWord.name] : undefined
  const displayTrans = wordDisplayInfo?.trans || currentWord?.trans || []
  const displayUkphone = wordDisplayInfo?.ukphone || currentWord?.ukphone || ''
  const displayTense = wordDisplayInfo?.tense || currentWord?.tense
  const wordWithInfo = currentWord
    ? { ...currentWord, trans: displayTrans, ukphone: displayUkphone, tense: displayTense }
    : null

  return (
    <div className="container flex w-full flex-col items-center justify-center">
      {/* 上下词显示 */}
      {!isImmersiveMode && (
        <div className="container flex h-24 w-full shrink-0 grow-0 justify-between px-12 pt-10">
          {isShowPrevAndNextWord && isTyping && (
            <>
              <PrevAndNextWord type="prev" />
              <PrevAndNextWord type="next" />
            </>
          )}
        </div>
      )}

      {/* 单词面板 */}
      <div className="container flex flex-col items-center justify-center">
        {currentWord && (
          <div className="group relative flex w-full justify-center">
            {/* 开始提示 */}
            {!isTyping && (
              <div className="absolute flex h-full w-full justify-center">
                <div className="z-10 flex w-full items-center backdrop-blur-sm">
                  <p className="w-full select-none text-center text-xl text-gray-600 dark:text-gray-50">
                    按任意键{timerData.time ? '继续' : '开始'}
                  </p>
                </div>
              </div>
            )}

            {/* 单词显示 */}
            <div className="relative">
              <WordComponent word={currentWord} onFinish={onFinish} />
              {phoneticConfig.isOpen && <Phonetic word={wordWithInfo || currentWord} />}
              {isTransVisible && <Translation trans={displayTrans} tense={displayTense} />}

              {/* 查看详情 */}
              {!isImmersiveMode && isTyping && (
                <div
                  onClick={handleViewDetail}
                  className="mt-3 cursor-pointer text-center text-xs text-gray-400 hover:text-indigo-400"
                >
                  点击查看详细释义
                </div>
              )}
            </div>

            {/* 掌握按钮 */}
            {!isImmersiveMode && (
              <div className="absolute bottom-4 right-4 opacity-60 transition-opacity duration-200 ease-in-out hover:opacity-100">
                <Tooltip content="标记已掌握">
                  <span
                    className="cursor-pointer font-mono text-2xl font-normal text-gray-700 dark:text-gray-400"
                    onClick={handleMastered}
                  >
                    掌握
                  </span>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 6.4 预期效果

| 文件 | 改动前 | 改动后 |
|-----|-------|-------|
| WordPanel/index.tsx | 186 行 | ~120 行 |
| useWordMeaning.ts | 0 行 | ~50 行 |
| useWordDetailNavigation.ts | 0 行 | ~25 行 |
| **总计** | 186 行 | 195 行 |

虽然总行数略增，但职责更清晰，可测试性大幅提升。

### 6.5 验收标准

- [ ] 单词显示正常
- [ ] MDX 查询功能正常
- [ ] 快捷键查看详情正常
- [ ] 掌握按钮功能正常
- [ ] 沉浸模式正常

### 6.6 回滚方案

```bash
# 恢复原始 WordPanel
git checkout HEAD~1 -- src/pages/Typing/components/WordPanel/index.tsx
# 删除新增 hooks
rm src/pages/Typing/hooks/useWordMeaning.ts
rm src/pages/Typing/hooks/useWordDetailNavigation.ts
```

---

## 七、风险与回滚策略

### 7.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 命名修改导致运行时错误 | 中 | 高 | 分阶段修改，每阶段运行测试 |
| Hooks 调用顺序变化导致 bug | 低 | 中 | 保持 hooks 调用顺序一致 |
| 页面合并后功能缺失 | 低 | 高 | 详细的功能测试清单 |
| 组件拆分后状态丢失 | 低 | 中 | 确保 atoms 正确传递 |

### 7.2 验证策略

每个阶段完成后执行：

```bash
# 1. 类型检查
npm run build

# 2. 单元测试
npm test

# 3. Lint 检查
npm run lint

# 4. 手动测试清单
# - 正常学习模式完整流程
# - 重复学习模式完整流程
# - 巩固学习模式完整流程
# - 沉浸模式切换
# - 摸鱼模式
# - 窗口失焦行为
```

### 7.3 回滚命令速查

```bash
# 查看最近提交
git log --oneline -5

# 回滚到指定阶段前
git reset --hard <commit-hash>

# 仅恢复特定文件
git checkout <commit-hash> -- <file-path>

# 查看文件改动
git diff HEAD~1
```

---

## 八、实施时间表

| 阶段 | 预估工时 | 累计 | 产出物 |
|-----|---------|------|-------|
| 阶段1 | 1h | 1h | 清理后的代码 |
| 阶段2 | 2h | 3h | 整合后的 hooks |
| 阶段3 | 3h | 6h | 统一的学习页面 |
| 阶段4 | 2h | 8h | 优化后的组件 |

建议每天完成 1-2 个阶段，确保有足够时间验证。

---

## 九、附录

### A. 文件改动汇总

| 操作 | 文件 |
|-----|------|
| 修改 | `src/store/index.ts` |
| 修改 | `src/pages/Typing/hooks/useLearningSession/strategies.ts` |
| 修改 | `src/pages/Typing/hooks/useTypingPageBase.ts` |
| 删除 | `src/pages/Typing/hooks/useLearningPage.ts` |
| 新增 | `src/pages/Typing/hooks/useTypingPageSetup.ts` |
| 新增 | `src/pages/Typing/ExtraTypingPage.tsx` |
| 修改 | `src/pages/Typing/NormalTypingPage.tsx` |
| 修改 | `src/pages/Typing/RepeatTypingPage.tsx` |
| 修改 | `src/pages/Typing/ConsolidateTypingPage.tsx` |
| 新增 | `src/pages/Typing/hooks/useWordMeaning.ts` |
| 新增 | `src/pages/Typing/hooks/useWordDetailNavigation.ts` |
| 修改 | `src/pages/Typing/components/WordPanel/index.tsx` |

### B. 测试用例清单

```
正常学习模式：
□ 进入页面，单词正确加载
□ 输入正确字母，变绿
□ 输入错误字母，变红，重新开始
□ 完成单词，自动跳下一个
□ 统计信息正确显示
□ 点击掌握，跳到下一个单词
□ 沉浸模式切换正常
□ 所有单词完成，显示完成页面

重复学习模式：
□ 进入页面，今日单词正确加载
□ 进度显示正确
□ 退出按钮正常工作
□ 空状态正确显示

巩固学习模式：
□ 进入页面，已学单词正确加载
□ 进度显示正确
□ 退出按钮正常工作
□ 空状态正确显示
```

---

*本方案基于代码静态分析设计，执行前请确认与实际需求一致。*