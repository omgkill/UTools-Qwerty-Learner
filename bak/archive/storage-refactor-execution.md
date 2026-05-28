---

# IndexedDB 表使用情况分析报告

## 一、数据库表结构概览

根据 [index.ts](file:///e:\UTools-Qwerty-Learner\src\utils\db\index.ts#L24-L42)，共有 6 个表：

| 表名 | 索引 | 用途 |
|------|------|------|
| `wordRecords` | `++id,word,timeStamp,dict,learning,errorCount,[dict+learning],[dict+timeStamp]` | 单词练习记录 |
| `learningRecords` | `++id,timeStamp,dict,learning,time,[dict+learning]` | 学习会话记录 |
| `wordProgress` | `++id,word,dict,masteryLevel,nextReviewTime,lastReviewTime,[dict+word],[dict+masteryLevel]` | 单词学习进度 |
| `dictProgress` | `++id,dict` | 词库整体进度 |
| `dailyRecords` | `++id,dict,date,[dict+date]` | 每日学习统计 |
| `typingStates` | `++id,dict,date,[dict+date]` | 打字页面状态持久化 |

---

## 二、各表详细分析

### 1. dailyRecords 表

#### 写入操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useDailyRecord.ts:24](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L24) | `db.dailyRecords.add()` | `getTodayRecord()` - 首次获取今日记录时创建 |
| [useDailyRecord.ts:57](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L57) | `db.dailyRecords.put()` | `incrementReviewed()` - 增加复习计数 |
| [useDailyRecord.ts:79](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L79) | `db.dailyRecords.put()` | `incrementLearned()` - 增加新学计数 |
| [useDailyRecord.ts:101](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L101) | `db.dailyRecords.put()` | `incrementMastered()` - 增加掌握计数 |
| [services/index.ts:198](file:///e:\UTools-Qwerty-Learner\src\services\index.ts#L198) | `db.dailyRecords.add()` | `DailyRecordService.getTodayRecord()` |
| [services/index.ts:215-232](file:///e:\UTools-Qwerty-Learner\src\services\index.ts#L215-L232) | `db.dailyRecords.update()/add()` | `incrementReviewed/incrementLearned/incrementMastered` |

#### 读取操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useDailyRecord.ts:20](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L20) | `where('[dict+date]').equals().first()` | `getTodayRecord()` - 获取今日记录 |
| [useDailyRecord.ts:47,73,95](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L47) | `where('[dict+date]').equals().first()` | 事务内读取今日记录 |
| [useStudyStats.ts:138](file:///e:\UTools-Qwerty-Learner\src\pages\Analysis\hooks\useStudyStats.ts#L138) | `where('dict').equals().toArray()` | `useDayStats()` - 获取某词库所有日期记录 |
| [services/index.ts:254](file:///e:\UTools-Qwerty-Learner\src\services\index.ts#L254) | `where('[dict+date]').equals().first()` | `getRecord()` - 获取指定日期记录 |
| [services/index.ts:258](file:///e:\UTools-Qwerty-Learner\src\services\index.ts#L258) | `where('[dict+date]').between()` | `getRecordsInRange()` - 获取日期范围记录 |

#### 写入时机
- **页面加载时**：`refreshDailyRecord()` 触发 `getTodayRecord()`
- **学习过程中**：每完成一个单词的复习/新学/掌握时调用对应 increment 方法
- **使用事务**：increment 方法都使用了事务保证原子性

#### 潜在问题
- **冗余读取**：`incrementReviewed/Learned/Mastered` 每次都先读取再写入，在高频场景下可能有性能问题

---

### 2. dictProgress 表

#### 写入操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useDictProgress.ts:28](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDictProgress.ts#L28) | `db.dictProgress.add()` | `updateDictProgress()` - 新建词库进度 |
| [useDictProgress.ts:36](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDictProgress.ts#L36) | `db.dictProgress.add()` | `updateDictProgress()` - 无 id 时添加 |
| [useDictProgress.ts:40](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDictProgress.ts#L40) | `db.dictProgress.update()` | `updateDictProgress()` - 更新已有进度 |

#### 读取操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useDictProgress.ts:15](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDictProgress.ts#L15) | `where('dict').equals().first()` | `getDictProgress()` - 获取词库进度 |
| [useDictProgress.ts:63](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDictProgress.ts#L63) | `db.wordProgress.where('dict')` | `recalculateStats()` - 重算统计数据（读取 wordProgress） |

#### 写入时机
- **更新词库进度时**：通过 `updateDictProgress()` 更新 `learnedWords`、`masteredWords`、`studyDays` 等字段
- **重算统计时**：`recalculateStats()` 会重新计算并更新

#### 潜在问题
- **使用频率较低**：只有 `useDictProgress` hook 使用，且调用场景有限
- **冗余逻辑**：`updateDictProgress` 中存在重复判断 `progress.id` 的逻辑

---

### 3. learningRecords 表

#### 写入操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [index.ts:174](file:///e:\UTools-Qwerty-Learner\src\utils\db\index.ts#L174) | `db.learningRecords.add()` | `useSaveLearningRecord()` - 保存学习会话记录 |

#### 读取操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [data-export.ts:24](file:///e:\UTools-Qwerty-Learner\src\utils\db\data-export.ts#L24) | `db.learningRecords.count()` | 导出数据时统计数量 |
| [data-export.ts:120](file:///e:\UTools-Qwerty-Learner\src\utils\db\data-export.ts#L120) | `db.learningRecords.count()` | 导出数据时统计数量 |

#### 写入时机
- **学习会话结束时**：调用 `saveLearningRecord()` 保存本次学习的整体统计

#### 特点
- **仅追加写入**：只有 `add` 操作，没有 `update` 或 `delete`
- **读取场景单一**：仅用于数据导出统计

---

### 4. typingStates 表

#### 写入操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useRepeatLearningPersistence.ts:73](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L73) | `db.typingStates.update()` | `saveRepeatLearningState()` - 更新已存在的状态 |
| [useRepeatLearningPersistence.ts:75](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L75) | `db.typingStates.add()` | `saveRepeatLearningState()` - 新增状态 |
| [useRepeatLearningPersistence.ts:93](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L93) | `db.typingStates.update()` | `clearRepeatLearningState()` - 清除状态 |

#### 读取操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useRepeatLearningPersistence.ts:27](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L27) | `db.typingStates.toArray()` | `loadRepeatLearningState()` - 加载状态 |
| [useRepeatLearningPersistence.ts:61](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L61) | `db.typingStates.toArray()` | `saveRepeatLearningState()` - 查找已存在记录 |
| [useRepeatLearningPersistence.ts:89](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L89) | `db.typingStates.toArray()` | `clearRepeatLearningState()` - 查找已存在记录 |

#### 写入时机
- **进入打字页面时**：加载持久化状态
- **学习过程中**：保存重复学习状态
- **完成/退出学习时**：清除状态

#### 潜在问题
- **全量读取**：所有操作都使用 `toArray()` 全量读取后在内存中 filter，应该使用索引查询
- **建议优化**：
  ```typescript
  // 当前写法（低效）
  const allStates = await db.typingStates.toArray()
  const saved = allStates.find(item => item.dictId === dictId && item.date === getTodayDate())
  
  // 建议写法（使用索引）
  const saved = await db.typingStates.where('[dict+date]').equals([dictId, getTodayDate()]).first()
  ```

---

### 5. wordProgress 表

#### 写入操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useWordProgress.ts:67](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useWordProgress.ts#L67) | `db.wordProgress.put()` | `updateWordProgress()` - 更新单词进度 |
| [useWordProgress.ts:82](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useWordProgress.ts#L82) | `db.wordProgress.add()` | `initWordProgress()` - 初始化单词进度 |
| [useWordProgress.ts:98](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useWordProgress.ts#L98) | `db.wordProgress.bulkAdd()` | `batchInitWordProgress()` - 批量初始化 |
| [useWordProgress.ts:121](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useWordProgress.ts#L121) | `db.wordProgress.put()` | `markAsMastered()` - 标记为已掌握 |
| [services/index.ts:50,62,80,121](file:///e:\UTools-Qwerty-Learner\src\services\index.ts#L50) | `add/update/bulkAdd` | `WordProgressService` 各方法 |

#### 读取操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useWordProgress.ts:16](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useWordProgress.ts#L16) | `where('[dict+word]').equals().first()` | `getWordProgress()` - 获取单个单词进度 |
| [useWordProgress.ts:26-29](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useWordProgress.ts#L26-L29) | `where('[dict+word]').anyOf().toArray()` | `getWordsProgress()` - 批量获取单词进度 |
| [useLearningStats.ts:37,64](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useLearningStats.ts#L37) | `where('dict').equals().toArray()` | `refreshStats()` - 获取所有进度计算统计 |
| [useReviewWords.ts:19](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useReviewWords.ts#L19) | `where('dict').equals().toArray()` | `getDueWords()` - 获取到期复习单词 |
| [useReviewWords.ts:45](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useReviewWords.ts#L45) | `where('dict').equals().toArray()` | `getNewWords()` - 获取新单词 |
| [useDictStats.ts:31](file:///e:\UTools-Qwerty-Learner\src\pages\Gallery-N\hooks\useDictStats.ts#L31) | `where('dict').equals().toArray()` | `getDictStats()` - 获取词库统计 |
| [useDictProgress.ts:63](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDictProgress.ts#L63) | `where('dict').equals().toArray()` | `recalculateStats()` - 重算统计 |
| [services/index.ts:132,145,163](file:///e:\UTools-Qwerty-Learner\src\services\index.ts#L132) | `where('dict').equals().toArray()` | `getNewWords/getDueWords/getAllProgress` |

#### 写入时机
- **学习单词时**：每次答题后调用 `updateWordProgress()`
- **初始化单词时**：`initWordProgress()` 或 `batchInitWordProgress()`
- **标记掌握时**：`markAsMastered()`

#### 读取时机
- **页面加载时**：获取学习统计、到期单词、新单词
- **学习过程中**：获取单词当前进度
- **统计页面**：计算学习进度

#### 特点
- **高频读写**：是使用最频繁的表
- **全量读取较多**：多处使用 `where('dict').equals().toArray()` 全量加载后再 filter

---

### 6. wordRecords 表

#### 写入操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [index.ts:222](file:///e:\UTools-Qwerty-Learner\src\utils\db\index.ts#L222) | `db.wordRecords.add()` | `useSaveWordRecord()` - 保存单词练习记录 |
| [Typing/index.tsx:86](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\index.tsx#L86) | `db.wordRecords.add()` | 打字页面直接写入 |

#### 读取操作

| 文件位置 | 方法 | 场景 |
|----------|------|------|
| [useStudyStats.ts:47](file:///e:\UTools-Qwerty-Learner\src\pages\Analysis\hooks\useStudyStats.ts#L47) | `db.wordRecords.toArray()` | `useStudyStats()` - 全量获取所有记录 |
| [useStudyStats.ts:199](file:///e:\UTools-Qwerty-Learner\src\pages\Analysis\hooks\useStudyStats.ts#L199) | `where('dict').equals().toArray()` | `useWordDetails()` - 获取某词库所有记录 |
| [useWordStats.ts:54](file:///e:\UTools-Qwerty-Learner\src\pages\Analysis\hooks\useWordStats.ts#L54) | `where('timeStamp').between().toArray()` | `getChapterStats()` - 按时间范围查询 |
| [data-export.ts:119](file:///e:\UTools-Qwerty-Learner\src\utils\db\data-export.ts#L119) | `db.wordRecords.count()` | 导出统计 |

#### 写入时机
- **每次输入单词后**：调用 `saveWordRecord()` 保存该单词的输入记录

#### 读取时机
- **统计页面**：计算学习天数、单词数等
- **详情页面**：查看某天的学习详情
- **数据导出**：统计数量

#### 特点
- **仅追加**：只有 `add` 操作，记录每次输入
- **数据量大**：随使用时间增长，数据量会很大

---

## 三、冗余读写问题总结

### 1. typingStates 表 - 全量读取问题

**问题**：所有操作都使用 `toArray()` 全量读取

**位置**：[useRepeatLearningPersistence.ts:27,61,89](file:///e:\UTools-Qwerty-Learner\src\pages\Typing\hooks\useRepeatLearningPersistence.ts#L27)

**建议**：使用复合索引 `[dict+date]` 直接查询

### 2. wordProgress 表 - 多次全量读取

**问题**：多处使用 `where('dict').equals().toArray()` 后再 filter

**位置**：
- [useLearningStats.ts:37,64](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useLearningStats.ts#L37)
- [useReviewWords.ts:19,45](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useReviewWords.ts#L19)
- [useDictStats.ts:31](file:///e:\UTools-Qwerty-Learner\src\pages\Gallery-N\hooks\useDictStats.ts#L31)

**影响**：当词库单词量大时，性能下降明显

### 3. dailyRecords 表 - 事务内重复读取

**问题**：`incrementReviewed/Learned/Mastered` 每次都先读取再写入

**位置**：[useDailyRecord.ts:46-58,72-79,94-101](file:///e:\UTools-Qwerty-Learner\src\utils\db\hooks\useDailyRecord.ts#L46-L58)

**现状**：已使用事务保证原子性，但高频调用时仍有优化空间

### 4. useStudyStats - 全量加载 wordRecords

**问题**：`useStudyStats()` 使用 `db.wordRecords.toArray()` 全量加载

**位置**：[useStudyStats.ts:47](file:///e:\UTools-Qwerty-Learner\src\pages\Analysis\hooks\useStudyStats.ts#L47)

**影响**：随着使用时间增长，数据量会非常大，加载变慢

### 5. useWordDetails - 双重全量加载

**问题**：先加载所有记录再 filter

**位置**：[useStudyStats.ts:199-209](file:///e:\UTools-Qwerty-Learner\src\pages\Analysis\hooks\useStudyStats.ts#L199-L209)

**建议**：使用 `[dict+timeStamp]` 索引范围查询

---

## 四、各表读写场景汇总

| 表名 | 写入时机 | 读取时机 | 数据量趋势 |
|------|----------|----------|------------|
| `dailyRecords` | 每日首次学习、每次计数更新 | 页面加载、统计展示 | 每词库每天1条 |
| `dictProgress` | 词库进度更新时 | 获取词库进度时 | 每词库1条 |
| `learningRecords` | 学习会话结束时 | 数据导出时 | 每次学习1条 |
| `typingStates` | 学习过程中状态变化 | 进入打字页面时 | 每词库每天1条 |
| `wordProgress` | 每次学习单词时 | 页面加载、学习过程、统计 | 每词库每单词1条 |
| `wordRecords` | 每次输入单词时 | 统计页面、详情页面 | 每次输入1条（增长最快） |

---

## 五、优化建议

1. **typingStates 表**：改用索引查询替代 `toArray()` + `find()`
2. **wordProgress 表**：考虑分页或使用更精确的索引查询
3. **wordRecords 表**：统计页面考虑使用聚合查询或缓存
4. **dailyRecords 表**：高频更新场景可考虑内存缓存 + 批量写入
5. **统一服务层**：`useDailyRecord` 和 `DailyRecordService` 功能重复，建议统一


现在我来制定详细的存储重构方案。


toolName: Write

status: success


filePath: e:\UTools-Qwerty-Learner\存储架构重构方案.md

changes: undefined

已创建详细的存储架构重构方案文档：[存储架构重构方案.md](file:///e:/UTools-Qwerty-Learner/存储架构重构方案.md)

## 方案核心要点

### 1. 当前问题

| 问题类型 | 具体问题 |
|----------|----------|
| **存储位置混乱** | 配置在 uTools DB，学习数据在 IndexedDB，自定义词库又在 uTools DB |
| **数据冗余** | `learningRecords`、`dailyRecords`、`dictProgress` 都可从原始数据聚合 |
| **查询效率低** | 多处使用 `toArray()` 全量加载后再 filter |
| **临时状态持久化** | `typingStates` 不应存在 IndexedDB |
| **代码重复** | `useDailyRecord` 与 `DailyRecordService` 功能完全重复 |

### 2. 目标架构

```
业务层 (Pages/Components)
       ↓
服务层 (LearningService, DictService, ConfigService)  ← 统一入口
       ↓
存储层 (Repository)  ← 统一接口
       ↓
适配器
```

### 3. 表结构变更

| 表 | 操作 | 原因 |
|----|------|------|
| `wordRecords` | ✅ 保留 + 优化索引 | 原始数据源 |
| `wordProgress` | ✅ 保留 + 优化索引 | SRS 算法状态 |
| `learningRecords` | ❌ 删除 | 可从 wordRecords 聚合 |
| `dictProgress` | ❌ 删除 | 可从 wordProgress 聚合 |
| `typingStates` | ❌ 删除 | 临时状态改用内存存储 |
| `dailyStatsCache` | ➕ 可选新增 | 加速统计查询 |

### 4. 迁移策略

```
Phase 1: 准备阶段 → 创建新架构，不影响现有功能
Phase 2: 并行运行 → 新功能用新架构，逐步迁移
Phase 3: 清理阶段 → 删除旧代码和冗余表
```

是否需要我开始实施这个重构方案？可以从创建统一的存储接口和 Repository 层开始。