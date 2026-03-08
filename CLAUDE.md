# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

一款基于 uTools 平台的单词学习工具，通过打字练习帮助用户记忆英语单词。用户在输入单词的过程中建立肌肉记忆，同时通过间隔重复算法学习词汇。

## 常用命令

```bash
npm run dev          # 启动开发服务器 (Vite, 端口 8080)
npm run build        # 生产构建 (输出到 ./build 目录)
npm test             # 运行单元测试 (vitest)
npm run test:watch   # 测试监听模式
npm run test:coverage # 测试覆盖率报告
npm run lint         # ESLint 代码检查
npm run prettier     # Prettier 格式化代码
npm run utools       # 打包为 uTools 插件格式
```

运行单个测试文件:
```bash
npm test -- --run src/pages/Typing/hooks/learningLogic.test.ts
```

## 架构说明

### 入口点（uTools 模式）

应用有多个入口点，定义在 `public/plugin.json` 中，通过 `window.getMode()` 和 `utools-mode-change` 事件控制：

- `typing` (默认): 正常学习模式 → `NormalTypingPage`
- `repeat`: 重复学习模式 → `RepeatTypingPage`
- `mdx-query`: 词典查询 → `MdxQueryPage`
- `mdx-manage`: MDX 词典管理 → `MdxManagePage`

### 状态管理（重要）

**核心原则：Jotai 是唯一状态源，禁止 useState 和 Jotai 同时管理相同数据。**

#### 状态分层

```
┌─────────────────────────────────────────┐
│  全局状态 (src/store/index.ts)          │
│  - currentDictIdAtom: 当前词库 ID       │
│  - pronunciationTypeAtom: 发音类型      │
│  - dailyLimitAtom: 每日学习上限         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  会话状态 (src/pages/Typing/store/atoms)│
│  - sessionAtoms: isLoading, learningType│
│  - wordListAtoms: words, currentIndex   │
│  - statsAtoms: correctCount, timerData  │
│  - wordInputAtoms: 输入状态             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  局部 UI 状态 (组件内 useState)          │
│  - 仅用于临时 UI 状态：isHovering, isOpen│
│  - 禁止用于业务数据                      │
└─────────────────────────────────────────┘
```

#### Atoms 模块说明

| 模块 | 文件 | 职责 |
|-----|-----|-----|
| sessionAtoms | `store/atoms/sessionAtoms.ts` | 会话状态：isLoading, hasWords, learningType, stats |
| wordListAtoms | `store/atoms/wordListAtoms.ts` | 单词列表：words, currentIndex, currentWord |
| statsAtoms | `store/atoms/statsAtoms.ts` | 统计数据：correctCount, wrongCount, timerData |
| uiAtoms | `store/atoms/uiAtoms.ts` | UI 状态：isTyping, isFinished, isImmersiveMode |
| wordInputAtoms | `store/atoms/wordInputAtoms.ts` | 输入状态：inputWord, letterStates |

#### 数据加载架构

```
useLearningSession (统一 hook)
    │
    ├── mode='normal' → normalStrategy (getDueWords + getNewWords)
    ├── mode='repeat' → repeatStrategy (getTodayWords)
    └── mode='consolidate' → consolidateStrategy (getAllProgress)
    │
    └── 更新 Jotai atoms (唯一写入点)
            │
            ↓
        Components (只读)
```

### 数据层

**uTools DB** (`src/utils/storage/`):

数据模块:
- `progress.ts`: 单词进度存储（掌握等级、下次复习时间）
- `daily.ts`: 每日学习统计（新学、复习、掌握数量、今日单词列表）
- `session.ts`: 学习会话状态持久化

类型定义 (`src/utils/storage/types.ts`):
- `WordProgress`: 单词进度数据结构
- `DailyRecord`: 每日记录数据结构
- `MasteryLevel`: 掌握等级类型 (0-7)
- `REVIEW_INTERVALS`: 复习间隔配置

### 学习算法

**掌握等级** (`src/utils/storage/types.ts`):
- 8 个等级: NEW(0) → LEARNED(1) → FAMILIAR(2) → KNOWN(3) → PROFICIENT(4) → ADVANCED(5) → EXPERT(6) → MASTERED(7)
- 复习间隔: 0小时、1天、2天、4天、7天、15天、30天

**学习流程** (`src/pages/Typing/hooks/learningLogic.ts`):
1. 优先复习到期单词
2. 若配额剩余，学习新单词（不超过每日上限）
3. 若无到期/新单词，巩固已学单词
4. 每日上限默认: 20 个单词

### 数据持久化

- **uTools DB**: 所有数据通过 uTools DB 存储，包括学习进度和配置
- **备份机制**: 在 `visibilitychange`、`beforeunload` 事件及 30 秒定时自动备份

### 关键文件

- `src/index.tsx`: 应用入口，模式路由，数据恢复逻辑
- `src/pages/Typing/NormalTypingPage.tsx`: 主学习页面
- `src/pages/Typing/RepeatTypingPage.tsx`: 重复学习今日单词
- `src/pages/Typing/ConsolidateTypingPage.tsx`: 巩固学习页面
- `src/pages/Typing/hooks/useLearningSession/`: 统一的数据加载 hook
- `src/pages/Typing/store/atoms/`: Jotai atoms 定义
- `src/utils/storage/`: 数据存储层

## 重构方法论

**重要：重构前必读 [docs/refactoring-retrospective.md](../docs/refactoring-retrospective.md)**

### 重构前检查清单

1. **先分析后动手**
   - 画出当前架构图
   - 找出状态流向
   - 识别重复和冗余

2. **确立单一数据源**
   - 同一数据只能在一个地方维护
   - 禁止 useState 和 Jotai 同时管理相同数据
   - 明确状态的写入点和读取点

3. **架构优先**
   - 先创建基础设施（atoms/hooks）
   - 再迁移使用方
   - 最后删除旧代码

### 重构验证指标

每次重构必须定义可量化的指标：

| 指标类型 | 示例 |
|---------|-----|
| useState 数量 | 从 5 个减少到 0 个 |
| 代码行数 | 从 762 行减少到 295 行 |
| 维护点数量 | 从 3 处减少到 1 处 |

### 常见错误

❌ **只移动代码，不改变架构**
```typescript
// 错误：从组件移动到 hook，但仍然是 useState
function useLearningSession() {
  const [words, setWords] = useState([])  // 仍然是 useState！
}
```

✅ **彻底改变状态管理方式**
```typescript
// 正确：迁移到 Jotai
function useLearningSession() {
  const words = useAtomValue(wordsAtom)  // 纯 Jotai
}
```

❌ **局部优化，没有整体规划**
```
修改 NormalTypingPage → 引入新 hook
修改 RepeatTypingPage → 引入另一套逻辑
结果：三套不同的实现并存
```

✅ **整体规划，统一架构**
```
1. 分析三个页面的共同点和差异
2. 设计统一的数据加载架构（策略模式）
3. 创建 sessionAtoms 统一状态管理
4. 逐个迁移页面
```

## 测试说明

使用 vitest + Testing Library。组件测试使用 `.component.test.tsx` 或页面/组件目录下的 `.test.tsx` 后缀，自动使用 jsdom 环境。测试配置文件: `src/test/setup.ts`。

## uTools 集成

- `public/plugin.json`: 定义插件功能和命令
- `public/preload.js`: uTools 预加载脚本
- 构建输出到 `./build`，然后 `npm run utools` 打包

## 相关文档

- [重构反思](../docs/refactoring-retrospective.md): 为什么之前多次重构失败
- [遗留问题重构方案](../docs/refactoring-plan-remaining-issues.md): 待完成的重构任务
