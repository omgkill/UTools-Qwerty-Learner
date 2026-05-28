# 存储结构文档

## 学习记录与学习进度关系

- 学习记录与学习进度是独立存储的
- 学习记录存于 `learningRecords` 表，用于一次学习会话的统计
- 学习进度存于 `wordProgress`、`dictProgress`、`dailyRecords` 表，用于长期进度
- 关联方式是弱关联：`learningRecords.wordRecordIds` 记录对应的 `wordRecords` id 列表

## IndexedDB（Dexie：RecordDB）

数据库名：`RecordDB`

### wordRecords
- 主键：`id`（自增）
- 字段：`word`、`timeStamp`、`dict`、`learning`、`timing`、`wrongCount`、`mistakes`
- 索引：`word`、`timeStamp`、`dict`、`learning`、`errorCount`、`[dict+learning]`、`[dict+timeStamp]`
- 说明：`errorCount` 仅出现在索引定义中，字段实际为 `wrongCount`

### learningRecords
- 主键：`id`（自增）
- 字段：`dict`、`learning`、`timeStamp`、`time`、`correctCount`、`wrongCount`、`wordCount`、`correctWordIndexes`、`wordNumber`、`wordRecordIds`
- 索引：`timeStamp`、`dict`、`learning`、`time`、`[dict+learning]`

### wordProgress
- 主键：`id`（自增）
- 字段：`word`、`dict`、`masteryLevel`、`nextReviewTime`、`lastReviewTime`、`correctCount`、`wrongCount`、`streak`、`reps`
- 索引：`word`、`dict`、`masteryLevel`、`nextReviewTime`、`lastReviewTime`、`[dict+word]`、`[dict+masteryLevel]`

### dictProgress
- 主键：`id`（自增）
- 字段：`dict`、`totalWords`、`learnedWords`、`masteredWords`、`lastStudyTime`、`studyDays`、`currentChapter`
- 索引：`dict`

### dailyRecords
- 主键：`id`（自增）
- 字段：`dict`、`date`、`reviewedCount`、`learnedCount`、`extraReviewedCount`、`masteredCount`、`lastUpdateTime`
- 索引：`dict`、`date`、`[dict+date]`

## uTools DB（key-value）

### 学习与备份相关
- `currentWordBank`：当前词库 id
- `typing-state`：重复学习状态（含 date、dictId、learningWords）
- `utools-backup-meta`：备份状态（lastBackupAt、lastBackupOk、lastBackupError、lastBackupDurationMs）
- `utools-local-write-at`：本地写入时间戳
- `utools-restore-process-id`：主进程 id 恢复标记

### 词库配置与自定义词库
- `dict-service-config`：词库配置（词库列表、启用状态、排序）
- `<custom-dict-id>`：自定义词库数据，key 为词库 id

### 设置项（配置类）
- `pronunciation`
- `randomConfig`
- `phoneticConfig`
- `wordDictationConfig`
- `dailyLimitConfig`
- `hotkeyConfig`

### 设置项（开关类）
- `isShowPrevAndNextWord`
- `isIgnoreCase`
- `isShowAnswerOnHover`
- `isTextSelectable`
- `shouldShowProgress`

### 其他
- `dismissStartCardDate`：开始卡片关闭日期
- `x-vipState`：订阅状态
