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
npm run test:e2e     # Playwright 端到端测试 (e2e/ 目录)
```

运行单个测试文件:
```bash
npm test -- --run src/pages/Typing/hooks/learningLogic.test.ts
```

## 架构说明

### 分层架构（重要）

项目正处于重构中途状态，**新代码遵循以下分层，旧代码不要在其上扩展**：

```
src/pages/        # 页面薄壳：只做路由/模式分发，逻辑委托给 features
src/features/     # 业务功能层（新增代码的主要位置）
  <feature>/domain/        # 纯领域逻辑（无 React、无 DB 依赖）
  <feature>/application/   # 用例层 (use-cases)，编排仓库
  <feature>/presentation/  # 组件/hooks/适配器
src/infra/        # 基础设施：repositories（Dexie/utools 实现）、backup
src/platform/     # uTools 平台抽象（storage/mode/features/plugin-actions）
src/utils/db/     # 底层 Dexie 基础：db 实例、progress 模型、typingState —— 仓库层直接依赖它，不是死代码
src/services/     # 遗留 service 层（生产代码已不使用，仅测试引用）
src/dict/         # 遗留词典层（死代码，已被 features/dictionary 取代）
```

- **数据流**：pages → features/application (use-cases) → infra/repositories → utils/db
- **features** 包含：analysis、backup、dictionary、typing、word-bank
- **仓库注入**：use-cases 通过构造函数/参数接收仓库实例（见 `infra/repositories/*.repository.dexie.ts` 等），测试可注入 fake

### 入口点（uTools 模式）

应用有多个入口点，定义在 `public/plugin.json` 中，通过 `window.getMode()` 和 `utools-mode-change` 事件控制（`src/index.tsx`，HashRouter）：

- `typing` (默认): 正常学习模式 → `NormalTypingPage`
- `repeat`: 重复学习模式 → `RepeatTypingPage`
- `consolidate`: 巩固学习模式 → `ConsolidateTypingPage`
- `mdx-query`: 词典查询 → `MdxQueryPage`
- `mdx-manage`: MDX 词典管理 → `MdxManagePage`
- 另有 `/gallery`（词库画廊）、`/analysis`（学习统计）路由

### 状态管理

**Jotai Atoms** (`src/store/index.ts`):
- 全局 atoms 管理词库、发音配置、每日限制等
- 配置类 atoms 使用 `atomForConfig`，自动持久化到 uTools 存储

**Typing Context** (`src/pages/Typing/store/`):
- 打字练习的本地状态，使用 `useImmerReducer` 管理
- 包含单词列表、当前单词索引、统计数据、计时器数据

### 数据层

**IndexedDB (Dexie.js)** (`src/utils/db/`):

数据表:
- `wordProgress`: 每个单词的掌握等级、复习时间、连续正确次数
- `dailyRecords`: 每日学习统计（新学、复习、掌握数量）
- `wordRecords`: 单次打字记录，包含按键时间数据
- `learningRecords`: 学习会话级别的统计数据

**仓库层** (`src/infra/repositories/`):
- `word-progress.repository.dexie.ts`: 单词进度增删改查、到期/新词判断
- `daily-record.repository.dexie.ts`: 每日学习数量
- `typing-state.repository.dexie.ts`: 打字会话状态持久化
- `analysis.repository.dexie.ts`: 统计分析聚合
- `dictionary.repository.utools.ts`: MDX 词典管理（uTools 存储）
- `local-word-bank.repository.ts`: 自定义词库（运行时实现）

**学习会话编排** (`src/features/typing/application/use-cases/`):
- `start-typing-session` / `normal-typing-state`: 加载学习会话的单词编排
- `mark-current-word-mastered`: 标记单词已掌握
- `get-repeat-learning-words`: 重复学习今日单词
- `get-next-replacement-word`: 替换单词

### 学习算法

**掌握等级** (`src/utils/db/progress/constants.ts`):
- 8 个等级: NEW(0) → LEARNED(1) → FAMILIAR(2) → KNOWN(3) → PROFICIENT(4) → ADVANCED(5) → EXPERT(6) → MASTERED(7)
- 复习间隔: 0小时、1天、2天、4天、7天、15天、21天、30天

**学习流程**:
1. 优先复习到期单词
2. 若配额剩余，学习新单词（不超过每日上限）
3. 若无到期/新单词，巩固已学单词
4. 每日上限默认: 20 个单词

### 数据持久化

- **IndexedDB**: 学习数据跨会话持久化
- **uTools DB**: 配置数据通过 `getUtoolsValue`/`setUtoolsValue` 存储（`src/platform/` 封装）
- **备份机制**: `src/features/backup/` 在 `visibilitychange`、`beforeunload` 事件及 30 秒定时自动备份到 uTools；导入导出实现在 `src/infra/backup/data-export.ts`

## 测试说明

使用 vitest + Testing Library：
- `src/**/*.test.ts(x)` 全部被 vitest 执行（glob 包含）
- 组件测试使用 `.component.test.tsx` 后缀，自动使用 jsdom 环境；`src/pages/**`、`src/components/**` 下的 `.test.tsx` 同样用 jsdom，其余用 node 环境（`vitest.config.ts` 的 `environmentMatchGlobs`）
- IndexedDB 测试使用 `fake-indexeddb`，测试配置文件: `src/test/setup.ts`
- 注意：旧层代码（`src/services/`、`src/dict/` 等）有配套测试仍在运行，删除旧层时需同步删除其测试

## uTools 集成

- `public/plugin.json`: 定义插件功能和命令
- `public/preload.js`: uTools 预加载脚本（提供 `postUToolsUserData`/`getUToolsUserData` 等）
- 构建输出到 `./build`，然后 `npm run utools` 打包
