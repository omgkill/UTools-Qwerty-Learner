# 架构设计文档

## 开发策略

**本次开发：先实现 Web 平台版本**
- 存储层使用 localStorage（方便测试和调试）
- 不依赖 uTools API
- 测试验证完成后再适配 uTools

---

## 一、分层架构概览

```
┌─────────────────────────────────────────┐
│  UI 层（纯展示和交互）                   │
│  - 页面组件                              │
│  - 输入处理                              │
│  - 样式动画                              │
│                                         │
│  职责：接收用户输入，调用服务层，展示结果 │
│  测试：E2E 测试（Playwright）            │
└─────────────────────────────────────────┘
        ↓ 调用
┌─────────────────────────────────────────┐
│  服务层（纯业务逻辑）                    │
│  - LearningService                      │
│  - ProgressService                      │
│  - DailyRecordService                   │
│                                         │
│  职责：核心业务逻辑，不依赖 UI 框架       │
│  测试：纯函数测试，无需 mock React        │
└─────────────────────────────────────────┘
        ↓ 调用
┌─────────────────────────────────────────┐
│  存储层（数据持久化）                    │
│  - Repository 接口                      │
│  - uTools 实现                          │
│  - Mock 实现（测试用）                   │
│                                         │
│  职责：数据读写，提供接口抽象            │
│  测试：切换 Mock 实现                    │
└─────────────────────────────────────────┘
```

---

## 二、各层职责详解

### 2.1 UI 层

**职责：**
- 渲染界面（单词、输入状态、进度）
- 处理用户交互（键盘输入、点击）
- 调用服务层获取数据
- 展示服务层返回的结果

**不包含：**
- 业务决策逻辑（如"该学哪个单词"）
- 数据计算（如"今日配额"）
- 持久化操作

**测试方式：**
- E2E 测试（Playwright）
- 不需要单元测试

---

### 2.2 服务层

**职责：**
- 实现核心业务逻辑
- 调用存储层读写数据
- 返回结构化结果给 UI 层

**不包含：**
- UI 相关代码（组件、样式）
- React Hooks
- Jotai 状态管理

**测试方式：**
- 纯函数单元测试
- 使用 MockRepository 替换存储层

---

### 2.3 存储层

**职责：**
- 提供数据读写接口
- 实现具体存储方式（uTools DB / Mock）

**不包含：**
- 业务逻辑
- 数据计算

**测试方式：**
- 服务层测试时使用 Mock 实现

---

## 三、服务层接口设计

### 3.1 LearningService

```
LearningService
│
├── getTodayWords(dictId, wordList, dailyLimit)
│   获取今日学习单词列表
│   输入：词库ID、全部单词列表、每日上限
│   输出：{ words: Word[], learningType: 'new'|'review', stats: Stats }
│   逻辑：
│   - 获取今日已学数量
│   - 计算剩余配额 = 上限 - 已学
│   - 获取到期词（不超过剩余配额）
│   - 剩余配额给新词
│
├── completeWord(dictId, word, wordList, dailyLimit)
│   完成一个单词的处理
│   输入：词库ID、单词、词库列表、每日上限
│   输出：{ progress: Progress, dailyRecord: DailyRecord, nextWords: Word[] }
│   逻辑：
│   - 升级掌握等级
│   - 设置下次复习时间
│   - 更新今日记录
│   - 判断是否需要补充新词
│
├── getStats(dictId, wordList)
│   获取学习统计
│   输入：词库ID、全部单词列表
│   输出：{ todayLearned, todayReviewed, dueCount, newCount, masteredCount }
│
├── isSessionComplete(dictId, dailyLimit)
│   判断今日学习是否完成
│   输入：词库ID、每日上限
│   输出：boolean
```

### 3.2 ProgressService

```
ProgressService
│
├── getProgress(dictId, word)
│   获取单个单词进度
│
├── setProgress(dictId, word, progress)
│   设置单个单词进度
│
├── getAllProgress(dictId)
│   获取词库所有进度
│
├── getDueWords(dictId, wordList, limit)
│   获取到期单词
│
├── getNewWords(dictId, wordList, limit)
│   获取新单词
│
├── upgradeLevel(dictId, word)
│   升级掌握等级，设置复习时间
```

### 3.3 DailyRecordService

```
DailyRecordService
│
├── getTodayRecord(dictId)
│   获取今日记录
│
├── addLearnedWord(dictId, word)
│   记录今日新学单词
│
├── addReviewedWord(dictId, word)
│   记录今日复习单词
│
├── getTodayLearnedCount(dictId)
│   今日新学数量
│
├── getTodayReviewedCount(dictId)
│   今日复习数量
│
├── getTodayTotalCount(dictId)
│   今日学习总数 = 新学 + 复习
│
├── clearOldRecords(dictId, beforeDate)
│   清理旧记录
```

---

## 四、存储层接口设计

### 4.1 IProgressRepository

```
IProgressRepository
│
├── get(dictId, word): Progress | null
├── set(dictId, word, progress): void
├── getAll(dictId): Progress[]
├── remove(dictId, word): void
├── clear(dictId): void
```

### 4.2 IDailyRecordRepository

```
IDailyRecordRepository
│
├── get(dictId, date): DailyRecord | null
├── set(dictId, date, record): void
├── getAll(dictId): DailyRecord[]
├── remove(dictId, date): void
├── clear(dictId): void
```

---

## 五、核心流程详解

### 5.1 获取今日学习单词流程

```
用户打开应用
        ↓
调用 LearningService.getTodayWords()
        ↓
┌─────────────────────────────────────────┐
│  步骤 1：获取今日已学数量                 │
│  todayTotal = DailyRecordService         │
│               .getTodayTotalCount(dictId) │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 2：计算剩余配额                     │
│  remaining = dailyLimit - todayTotal     │
│  如果 remaining <= 0，返回空列表          │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 3：获取到期词                       │
│  dueWords = ProgressService              │
│             .getDueWords(dictId,         │
│                        wordList,         │
│                        remaining)        │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 4：获取新词（如果有剩余配额）        │
│  if dueWords.length < remaining:         │
│    newQuota = remaining - dueWords.length│
│    newWords = ProgressService            │
│               .getNewWords(dictId,       │
│                           wordList,      │
│                           newQuota)      │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 5：合并返回                         │
│  words = dueWords + newWords             │
│  learningType = dueWords.length > 0      │
│                 ? 'review' : 'new'       │
└─────────────────────────────────────────┘
```

### 5.2 完成单词流程

```
用户正确输入完成单词
        ↓
调用 LearningService.completeWord()
        ↓
┌─────────────────────────────────────────┐
│  步骤 1：升级掌握等级                     │
│  ProgressService.upgradeLevel(dictId, word) │
│  - masteryLevel + 1                     │
│  - nextReviewTime = 计算复习间隔          │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 2：判断是新词还是复习               │
│  wasNew = masteryLevel 变化前为 0         │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 3：更新今日记录                     │
│  if wasNew:                              │
│    DailyRecordService.addLearnedWord()  │
│  else:                                   │
│    DailyRecordService.addReviewedWord() │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│  步骤 4：判断是否需要补充新词             │
│  todayTotal = 更新后的总数               │
│  if todayTotal < dailyLimit:            │
│    检查是否还有新词可学                  │
│    返回下一个单词                        │
│  else:                                   │
│    返回"完成"状态                        │
└─────────────────────────────────────────┘
```

---

## 六、测试策略

### 6.1 服务层测试（核心）

**测试场景清单：**

| 测试场景 | 输入条件 | 期望输出 |
|---------|---------|---------|
| 首次打开 | 无进度、无今日记录 | 返回 20 个新词，learningType='new' |
| 今日已学部分 | 今日已学 10，上限 20 | 返回 10 个单词 |
| 今日已达上限 | 今日已学 20，上限 20 | 返回空列表 |
| 有到期词 | 到期词 5，上限 20 | 返回 5 到期词 + 15 新词 |
| 只有到期词 | 到期词 30，上限 20 | 返回 20 个到期词 |
| 无到期词无新词 | 全部已掌握 | 返回空列表 |
| 完成单词升级 | masteryLevel=1 → 完成 → masteryLevel=2 |
| 跨天数据 | 第二天打开 | 昨日记录不影响今日 |

### 6.2 存储层测试

**测试要点：**
- MockRepository 正确读写数据
- 数据隔离（不同词库）
- 清理功能

### 6.3 UI 层测试

**使用 Playwright E2E 测试：**
- 启动应用
- 输入单词
- 完成学习
- 查看统计

---

## 七、目录结构

```
src/
├── services/                    # 服务层（核心业务逻辑）
│   ├── LearningService.ts       # 学习流程服务
│   ├── ProgressService.ts       # 进度管理服务
│   ├── DailyRecordService.ts    # 每日记录服务
│   └── services.test.ts         # 服务层完整测试
│
├── repositories/                # 存储层（数据持久化）
│   ├── interfaces/
│   │   ├── IProgressRepository.ts
│   │   └── IDailyRecordRepository.ts
│   ├── implementations/
│   │   ├── UtoolsProgressRepository.ts
│   │   ├── UtoolsDailyRecordRepository.ts
│   │   ├── MockProgressRepository.ts    # 测试用
│   │   └ MockDailyRecordRepository.ts   # 测试用
│   └── repositories.test.ts     # 存储层测试
│
├── pages/                       # UI 层
│   └── Typing/
│       ├── NormalTypingPage.tsx  # 页面组件
│       ├── components/           # UI 组件
│       └── hooks/                # UI hooks（只处理交互）
│
├── types/                       # 类型定义
│   ├── learning.ts
│   ├── progress.ts
│   └── dailyRecord.ts
│
└── test/                        # 测试工具
    ├── testUtils.ts
    └── mockFactories.ts
```

---

## 八、实施计划

### Phase 1：搭建骨架
1. 创建目录结构
2. 定义接口类型
3. 实现 MockRepository

### Phase 2：实现服务层
1. 实现 ProgressService
2. 实现 DailyRecordService
3. 实现 LearningService
4. 完成服务层测试

### Phase 3：实现存储层
1. 实现 UtoolsRepository
2. 完成存储层测试

### Phase 4：重构 UI 层
1. UI 层调用服务层
2. 移除旧的 hooks 和 atoms
3. E2E 测试验证