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

**服务层** (`src/services/index.ts`):
- `WordProgressService`: 单词进度的增删改查，判断到期/新单词
- `DailyRecordService`: 追踪每日学习数量
- `loadTypingSession()`: 加载学习会话的单词编排
- `handleMasteredFlow()`: 处理用户标记单词为已掌握的流程

### 学习算法

**掌握等级** (`src/utils/db/progress/constants.ts`):
- 8 个等级: NEW(0) → LEARNED(1) → FAMILIAR(2) → KNOWN(3) → PROFICIENT(4) → ADVANCED(5) → EXPERT(6) → MASTERED(7)
- 复习间隔: 0小时、1天、2天、4天、7天、15天、21天、30天

**学习流程** (`src/pages/Typing/hooks/learningLogic.ts`):
1. 优先复习到期单词
2. 若配额剩余，学习新单词（不超过每日上限）
3. 若无到期/新单词，巩固已学单词
4. 每日上限默认: 20 个单词

### 数据持久化

- **IndexedDB**: 学习数据跨会话持久化
- **uTools DB**: 配置数据通过 `getUtoolsValue`/`setUtoolsValue` 存储
- **备份机制**: 在 `visibilitychange`、`beforeunload` 事件及 30 秒定时自动备份到 uTools

### 关键文件

- `src/index.tsx`: 应用入口，模式路由，数据恢复逻辑
- `src/pages/Typing/NormalTypingPage.tsx`: 主学习页面
- `src/pages/Typing/RepeatTypingPage.tsx`: 重复学习今日单词
- `src/pages/Typing/hooks/useWordList.ts`: 单词列表加载逻辑
- `src/services/index.ts`: 核心业务逻辑服务

## 测试说明

使用 vitest + Testing Library。组件测试使用 `.component.test.tsx` 或页面/组件目录下的 `.test.tsx` 后缀，自动使用 jsdom 环境。测试配置文件: `src/test/setup.ts`。

## uTools 集成

- `public/plugin.json`: 定义插件功能和命令
- `public/preload.js`: uTools 预加载脚本
- 构建输出到 `./build`，然后 `npm run utools` 打包
