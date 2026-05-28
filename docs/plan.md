# 开发计划文档

## 项目目标

重构 Qwerty Learner 学习逻辑，采用分层架构，确保核心业务逻辑可独立测试。

---

## 分层架构设计

```
┌─────────────────────────────────────────┐
│  UI 层                                   │
│  - 页面组件（React）                     │
│  - 输入处理                              │
│  - 样式展示                              │
│  测试：E2E 测试                          │
└─────────────────────────────────────────┘
        ↓ 调用
┌─────────────────────────────────────────┐
│  服务层                                  │
│  - LearningService                       │
│  - 纯业务逻辑，无 UI 依赖                 │
│  测试：纯函数单元测试                     │
└─────────────────────────────────────────┘
        ↓ 调用
┌─────────────────────────────────────────┐
│  存储层                                  │
│  - Repository 接口                       │
│  - localStorage 实现（Web）              │
│  - Mock 实现（测试）                     │
└─────────────────────────────────────────┘
```

---

## 开发阶段

### Phase 1：核心业务逻辑（服务层 + 存储层）

| 任务 | 状态 | 说明 |
|-----|:----:|-----|
| 类型定义 | ✓ 完成 | `src/types/learning.ts` |
| Repository 接口定义 | ✓ 完成 | `IProgressRepository`, `IDailyRecordRepository` |
| Mock Repository 实现 | ✓ 完成 | 用于测试的内存存储 |
| localStorage Repository 实现 | ✓ 完成 | Web 平台实际存储 |
| LearningService 实现 | ✓ 完成 | 核心业务逻辑 |
| LearningService 测试 | ✓ 完成 | 13 个测试场景全部通过 |

**测试覆盖场景：**

| 场景 | 测试状态 |
|-----|:-------:|
| 首次打开，无进度 | ✓ |
| 新词不足上限 | ✓ |
| 无新词可学 | ✓ |
| 今日已学部分 | ✓ |
| 有到期词（正常数量） | ✓ |
| 有到期词（超上限） | ✓ |
| 到期词 + 今日已学 | ✓ |
| 完成新词升级 | ✓ |
| 完成复习词升级 | ✓ |
| 达到上限判断 | ✓ |
| 达到掌握状态 | ✓ |
| 统计数据计算 | ✓ |

---

### Phase 2：UI 层实现

| 任务 | 状态 | 说明 |
|-----|:----:|-----|
| 页面布局组件 | ✓ 完成 | `TypingPageLayout.tsx` |
| 单词显示组件 | ✓ 完成 | `WordDisplay.tsx` |
| 字母状态组件 | ✓ 完成 | `Letter.tsx` |
| 输入处理逻辑 | ✓ 完成 | `WordInputProcessor.ts` |
| 主页面集成 | ✓ 完成 | `NormalTypingPage.tsx` |
| TypeScript 编译 | ✓ 完成 | 无错误 |
| 页面可访问 | ✓ 完成 | http://localhost:8080 |

---

### Phase 3：功能完善

| 任务 | 状态 | 说明 |
|-----|:----:|-----|
| 词库加载 | ✓ 完成 | 从配置加载自定义词库 |
| Gallery 页面 | ✓ 完成 | 词库管理页面（导入、删除、切换） |
| 发音功能 | 待开发 | 播放单词音频 |
| 翻译显示 | 待开发 | 显示单词释义 |
| 进度统计展示 | ✓ 完成 | 今日学习统计 |
| 配置项 | 待开发 | 每日上限、大小写忽略等 |

---

### Phase 4：测试完善

| 任务 | 状态 | 说明 |
|-----|:----:|-----|
| E2E 测试 | 待开发 | Playwright 测试完整流程 |
| 跨天场景测试 | 待开发 | 模拟第二天打开 |
| 多次学习测试 | 待开发 | 学满上限后再次打开 |

---

### Phase 5：uTools 适配

| 任务 | 状态 | 说明 |
|-----|:----:|-----|
| uTools Repository 实现 | 待开发 | 使用 uTools DB 存储 |
| 多词库支持 | 待开发 | 选择不同词库 |
| 多模式支持 | 待开发 | 重复学习、巩固学习 |

---

## 当前目录结构

```
src/
├── types/
│   ├── learning.ts          # 核心类型（已完成）
│   ├── index.ts             # 类型导出（已完成）
│   ├── dict.ts              # 词库类型（已完成）
│   └── resource.ts          # 资源类型（已完成）
│
├── repositories/
│   ├── interfaces/
│   │   ├── IProgressRepository.ts     # 进度存储接口（已完成）
│   │   └── IDailyRecordRepository.ts  # 每日记录接口（已完成）
│   ├── implementations/
│   │   ├── LocalStorageProgressRepository.ts      # Web 实现（已完成）
│   │   ├── LocalStorageDailyRecordRepository.ts   # Web 实现（已完成）
│   │   ├── MockProgressRepository.ts              # 测试实现（已完成）
│   │   └── MockDailyRecordRepository.ts           # 测试实现（已完成）
│
├── services/
│   ├── LearningService.ts              # 核心业务逻辑（已完成）
│   ├── LearningService.test.ts         # 13 个测试（已完成）
│
├── pages/Typing/
│   ├── NormalTypingPage.tsx            # 主页面（已完成）
│   ├── components/
│   │   ├── TypingPageLayout.tsx        # 页面布局（已完成）
│   │   ├── WordDisplay.tsx             # 单词显示（已完成）
│   │   ├── WordInputProcessor.ts       # 输入逻辑（已完成）
│   │   └── Letter.tsx                  # 字母组件（已完成）
│
├── test/
│   └── testUtils.ts                    # 测试工具（已完成）
│
└── index.tsx                           # 入口（已完成）
```

---

## 备份说明

老代码已备份到 `bak/code/`：

```
bak/code/
├── Typing/
│   ├── NormalTypingPage.tsx        # 老的主页面
│   ├── RepeatTypingPage.tsx        # 老的重复学习页面
│   ├── ConsolidateTypingPage.tsx   # 老的巩固学习页面
│   ├── hooks/                      # 老的 hooks（已删除）
│   ├── store/                      # 老的状态管理（已删除）
│   └── components/                 # 老的组件
│
├── storage/
│   ├── progress.ts                 # 老的进度存储
│   ├── daily.ts                    # 老的每日记录
│   └── session.ts                  # 老的会话存储
│
└── Analysis/                       # 老的分析页面
```

---

## 关键改进

### 1. 业务逻辑独立测试

**之前：**
- 测试需要 mock React、Jotai、uTools
- 只能测试单个函数，无法测试完整流程

**现在：**
- LearningService 是纯类，无需 mock
- MockRepository 替换存储层
- 13 个场景覆盖完整流程

### 2. 今日配额逻辑正确

**之前的问题：**
- 到期词和新词互斥（要么全是到期词，要么全是新词）
- 不考虑今日已学数量
- 每次固定获取 20 个

**现在的逻辑：**
- 先检查今日已学数量
- 计算剩余配额 = 上限 - 已学
- 到期词优先，剩余配额给新词
- 正确处理各种边界场景

### 3. 数据结构统一

**之前：**
- 多处定义 `WordProgress`，字段名不一致（dict vs dictId）
- `DailyRecord` 缺少 `wordTypes` 字段

**现在：**
- 统一在 `types/learning.ts` 定义
- 所有代码使用同一类型定义

---

## 下一步工作

1. **在浏览器中手动测试**
   - 输入单词流程
   - 完成单词后进度保存
   - localStorage 数据查看

2. **完善词库加载**
   - 从 JSON 文件加载单词列表
   - 支持选择不同词库

3. **添加 E2E 测试**
   - Playwright 测试完整流程
   - 验证跨天场景