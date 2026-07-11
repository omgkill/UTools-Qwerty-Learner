# 分层重构计划

## 背景

当前项目不是要拆出 HTTP 后端，而是要从代码结构上拆开页面表现、业务规则、数据访问和平台能力。核心问题是页面、Hook、Dexie、uTools API 和业务规则互相穿透，导致定位问题困难，也难以为核心逻辑写稳定测试。

第一阶段选择 `Analysis` 作为样板，因为它以读数据和聚合统计为主，改动风险低，能清晰验证分层后的收益。

## 修改目标

1. 页面层只负责渲染、交互和 loading/error 状态，不直接读写 Dexie。
2. 业务规则变成纯函数，能脱离 React、Jotai、IndexedDB 单独测试。
3. 数据访问通过 repository 接口收口，Dexie 只是其中一种实现。
4. uTools 平台能力统一放到 `platform/utools`，旧路径保留兼容转发。
5. 后续迁移 `Typing`、`Dictionary`、`Backup` 时沿用同一结构，避免继续扩大 `pages/utils/services` 的耦合。

## 分层约定

代码依赖方向：

```text
presentation -> application -> domain
application -> repository interface
infra -> repository implementation
platform -> uTools / window API wrapper
```

约束：

- `presentation` 不直接 import `@/utils/db`。
- `presentation` 不直接访问 `window.utools`。
- `domain` 不依赖 React、Jotai、Dexie、window。
- `application` 只编排用例，不关心 Dexie 具体查询语法。
- `infra` 可以依赖 Dexie、uTools 等外部实现细节。
- 旧路径可以短期保留转发，但新代码应优先写入新分层目录。

## 完成标准

为了避免“阶段完成”和“全项目完成”混用，后续统一按下面两个层级验收。

### 模块核心链路完成

一个模块只能在满足以下条件后标记为“核心链路完成”：

1. 该阶段明确列出的优先迁移页面或 Hook 已迁到新分层。
2. 被迁移的生产页面层不直接 import `@/utils/db`。
3. 被迁移的生产页面层不直接访问 `window.utools` 或同类平台全局 API。
4. 业务规则进入 `domain`，且不依赖 React、Jotai、Dexie、window。
5. 应用编排进入 `application/use-cases` 或 application service，并依赖 repository/adapter port。
6. Dexie、uTools、preload 暴露的 window API 等实现细节集中在 `infra` 或 `platform`。
7. 旧路径如需保留，只做兼容转发或薄兼容层。
8. 有至少一组 domain 纯函数测试或 use case mock repository 测试。
9. 相关测试和 `npm run build` 通过。

### 全项目完成

只有满足以下条件后，才能说“分层重构完成”：

1. `src/pages` 下的生产代码不再直接 import `@/utils/db`。
2. `src/pages` 下的生产代码不再直接访问 `window.utools`、`window.services`、`window.getMdxDictConfig`、`window.queryMdxWord` 等平台全局 API。
3. 非 infra/platform 目录不再直接操作 Dexie 或 uTools DB。
4. 旧 `src/services`、`src/utils/db`、`src/dict` 路径只承担兼容转发、底层模型或基础设施职责。
5. 仍使用旧路径的测试要么迁到新 port/use case 测试，要么明确标记为 legacy integration test。
6. 全量相关测试和 `npm run build` 通过。

## 目标目录

```text
src/
  platform/
    utools/
      features.ts
      index.ts
      storage.ts

  infra/
    repositories/
      analysis.repository.dexie.ts

  features/
    analysis/
      domain/
        stats.ts
        types.ts
      application/
        ports.ts
        use-cases/
      presentation/
        hooks/
```

后续模块也按同样结构迁移：

```text
src/features/
  typing/
    domain/
    application/
    presentation/

  dictionary/
    domain/
    application/
    presentation/

  backup/
    application/
    infra/
    presentation/
```

## 第一阶段已完成

### 1. 平台能力收口

新增：

- `src/platform/utools/storage.ts`
- `src/platform/utools/features.ts`
- `src/platform/utools/index.ts`

调整：

- `src/utils/utools.ts` 改为兼容转发，保留原有 import 路径可用。

目的：

- 后续页面和业务逻辑不再直接散落访问 `window.utools`。
- 平台 API 可以单独替换、mock 或测试。

### 2. Analysis 领域层

新增：

- `src/features/analysis/domain/types.ts`
- `src/features/analysis/domain/stats.ts`
- `src/features/analysis/domain/index.ts`

职责：

- `buildDictStats`
- `buildDayStats`
- `buildWordDetails`

这些函数是纯函数，不依赖 React、Dexie 或 Jotai，适合做单元测试。

### 3. Analysis 应用层

新增：

- `src/features/analysis/application/ports.ts`
- `src/features/analysis/application/use-cases/get-dict-stats.ts`
- `src/features/analysis/application/use-cases/get-day-stats.ts`
- `src/features/analysis/application/use-cases/get-word-details.ts`
- `src/features/analysis/application/use-cases/index.ts`

职责：

- 定义 `AnalysisRepository` 接口。
- 通过 use case 编排数据读取和统计规则。
- 页面不关心数据来自 Dexie、uTools 还是未来其它来源。

### 4. Analysis 基础设施层

新增：

- `src/infra/repositories/analysis.repository.dexie.ts`

职责：

- 实现 `AnalysisRepository`。
- Dexie 查询只集中在这里。

### 5. Analysis 表现层

新增：

- `src/features/analysis/presentation/hooks/useStudyStats.ts`

调整：

- `src/pages/Analysis/index.tsx`
- `src/pages/Analysis/components/DayList.tsx`
- `src/pages/Analysis/components/DictList.tsx`
- `src/pages/Analysis/components/WordDetailList.tsx`
- `src/pages/Analysis/hooks/useStudyStats.ts`

结果：

- 页面和组件从新的 presentation hook 取数据。
- 旧 `src/pages/Analysis/hooks/useStudyStats.ts` 保留为兼容转发。

## 顺带修正的问题

`Word Details` 过去主要依赖 `wordRecords` 判断当天学习详情。如果某个词通过掌握流程更新了 `wordProgress`，但没有对应的 `wordRecords`，统计详情可能显示不出来。

现在 `buildWordDetails` 会同时读取：

- `wordRecords`
- `wordProgress`

并从 `wordProgress` 补充当天标记为 `MASTERED` 的单词。

## 测试计划

已新增：

- `src/features/analysis/domain/stats.test.ts`
- `src/features/analysis/application/use-cases/get-word-details.test.ts`

覆盖范围：

- 词库统计纯函数。
- 每日统计包含只有 `masteredCount` 的记录。
- 单词详情同时识别新词、复习词、掌握词。
- use case 通过 repository 接口读取数据。

已验证命令：

```bash
npx vitest run src/features/analysis src/pages/Analysis
npm run build
```

当前结果：

- Analysis 相关 `5` 个测试文件通过。
- `12` 个测试用例通过。
- 生产构建通过。

## 后续迁移计划

### 第二阶段：Typing 学习流程分层

目标：

- 页面不直接 new service 或读写 `db`。
- 掌握、复习、新词选择、每日记录更新进入 use case。
- 学习规则放入 `features/typing/domain`。

优先迁移：

- `src/pages/Typing/NormalTypingPage.tsx`
- `src/pages/Typing/hooks/useWordList.ts`
- `src/services/index.ts`
- `src/utils/db/index.ts` 中和 UI context 混在一起的保存逻辑

建议新增：

- `features/typing/domain/learning-rules.ts`
- `features/typing/application/use-cases/get-typing-session.ts`
- `features/typing/application/use-cases/mark-word-mastered.ts`
- `infra/repositories/word-progress.repository.dexie.ts`
- `infra/repositories/daily-record.repository.dexie.ts`
- `infra/repositories/word-record.repository.dexie.ts`

## 第二阶段已完成

### 1. Typing 领域层

新增：

- `src/features/typing/domain/types.ts`
- `src/features/typing/domain/learning-config.ts`
- `src/features/typing/domain/learning-rules.ts`
- `src/features/typing/domain/index.ts`

调整：

- `src/pages/Typing/hooks/learningLogic.ts` 改为兼容转发。

职责：

- 学习模式判断、每日额度计算等规则进入 `features/typing/domain`。
- 学习配置和掌握等级常量进入 `features/typing/domain`，旧 `utils/db/progress/constants.ts` 保留兼容转发。
- 旧测试仍可通过原路径导入规则函数。

### 2. Typing 应用层

新增：

- `src/features/typing/application/ports.ts`
- `src/features/typing/application/use-cases/get-typing-session.ts`
- `src/features/typing/application/use-cases/get-consolidate-words.ts`
- `src/features/typing/application/use-cases/get-next-replacement-word.ts`
- `src/features/typing/application/use-cases/get-repeat-learning-words.ts`
- `src/features/typing/application/use-cases/mark-word-mastered.ts`
- `src/features/typing/application/use-cases/complete-word.ts`
- `src/features/typing/application/use-cases/save-word-record.ts`
- `src/features/typing/application/use-cases/index.ts`

职责：

- 定义 `WordProgressRepository`、`DailyRecordRepository`、`WordRecordRepository`。
- 新词选择、复习选择、掌握流程、完成单词后的进度和每日记录更新进入 use case。

### 3. Typing 基础设施层

新增：

- `src/infra/repositories/word-progress.repository.dexie.ts`
- `src/infra/repositories/daily-record.repository.dexie.ts`
- `src/infra/repositories/word-record.repository.dexie.ts`

调整：

- `src/services/index.ts` 改为兼容层，保留旧 API 给现有测试和旧路径使用。

职责：

- Dexie 查询和写入集中到 repository。
- 旧 `WordProgressService`、`DailyRecordService` 通过 repository class 兼容。

### 4. Typing 表现层

新增：

- `src/features/typing/presentation/hooks/useWordList.ts`
- `src/features/typing/presentation/hooks/useMarkWordMastered.ts`
- `src/features/typing/presentation/hooks/useCompleteWord.ts`

调整：

- `src/pages/Typing/hooks/useWordList.ts` 改为兼容转发。
- `src/pages/Typing/NormalTypingPage.tsx` 不再直接 new service、读写 `db` 或访问旧 uTools 工具。
- `src/pages/Typing/RepeatTypingPage.tsx` 使用新的重复学习 use case。
- `src/pages/Typing/ConsolidateTypingPage.tsx` 使用新的巩固学习 use case。
- `src/pages/Typing/components/WordPanel/components/Word/hooks/useWordCompletion.ts` 使用完成单词 use case。
- `src/utils/db/index.ts` 移除和 Typing UI context 混在一起的 `useSaveWordRecord`。

当前验证：

```bash
npx vitest run src/features/typing src/pages/Typing/hooks src/pages/Typing/components/WordPanel/components/Word
npm run build
```

结果：

- Typing 相关 `14` 个测试文件通过。
- `108` 个测试用例通过。
- 生产构建通过。

### 第三阶段：Backup 与启动流程分层

目标：

- `src/index.tsx` 只保留 app bootstrap、router、providers。
- 数据恢复、自动备份、可见性监听迁出入口文件。

优先迁移：

- `src/utils/db/data-export.ts`
- `src/utils/db/index.ts` 中的 `scheduleUtoolsBackup`
- `src/index.tsx` 中的恢复与自动备份逻辑

建议新增：

- `features/backup/application/export-backup.ts`
- `features/backup/application/import-backup.ts`
- `features/backup/application/setup-auto-backup.ts`
- `app/bootstrap/restore-user-data.ts`

## 第三阶段已完成

### 1. Backup 应用层

新增：

- `src/features/backup/application/backup-state.ts`
- `src/features/backup/application/restore-user-data.ts`
- `src/features/backup/application/setup-auto-backup.ts`
- `src/features/backup/application/index.ts`

职责：

- `backup-state.ts` 负责备份元数据、写入标记和延迟备份调度。
- `restore-user-data.ts` 负责启动时从 uTools 用户数据恢复本地 IndexedDB。
- `setup-auto-backup.ts` 负责 `beforeunload`、`visibilitychange` 和定时自动备份监听。

### 2. 启动入口收敛

调整：

- `src/index.tsx` 移除数据恢复和自动备份细节，只调用 Backup application 函数。
- `src/utils/db/index.ts` 移除备份元数据、写入标记和定时备份逻辑，回到 Dexie 初始化与兼容工具职责。
- `src/utils/db/data-export.ts` 的 window API 注册增加浏览器环境保护，避免测试环境导入时报错。
- `src/utils/db/hooks/useWordProgress.ts`
- `src/pages/Typing/hooks/RepeatLearningManager.ts`
- `src/infra/repositories/word-record.repository.dexie.ts`

结果：

- 写入后的备份调度统一从 `features/backup/application` 进入。
- 启动恢复与自动备份监听不再散落在 `src/index.tsx`。

当前验证：

```bash
npx vitest run src/features/typing src/pages/Typing/hooks src/pages/Typing/components/WordPanel/components/Word src/features/analysis src/pages/Analysis
npm run build
```

结果：

- 相关 `19` 个测试文件通过。
- `120` 个测试用例通过。
- 生产构建通过。

### 第四阶段：Dictionary 分层

目标：

- `dictService` 不直接读写 `window.utools.db`。
- 词典配置、词典内容和适配器加载分离。

优先迁移：

- `src/dict/index.ts`
- `src/dict/adapters/*`
- `src/pages/MdxManage`
- `src/pages/MdxQuery`

建议新增：

- `features/dictionary/domain`
- `features/dictionary/application`
- `infra/repositories/dictionary.repository.utools.ts`

## 第四阶段核心链路已完成，仍需扫尾

### 1. Dictionary 领域层

新增：

- `src/features/dictionary/domain/types.ts`
- `src/features/dictionary/domain/dictionary-rules.ts`
- `src/features/dictionary/domain/index.ts`

职责：

- 词典元信息、MDX 查询结果、自定义词典条目等类型进入领域层。
- 查询词归一化、词典配置归一化、启用词典筛选、展开状态计算等规则进入纯函数。

### 2. Dictionary 应用层

新增：

- `src/features/dictionary/application/ports.ts`
- `src/features/dictionary/application/dictionary-service.ts`
- `src/features/dictionary/application/use-cases/list-mdx-dicts.ts`
- `src/features/dictionary/application/use-cases/select-mdx-dicts.ts`
- `src/features/dictionary/application/use-cases/update-mdx-dict-order.ts`
- `src/features/dictionary/application/use-cases/remove-mdx-dict.ts`
- `src/features/dictionary/application/use-cases/query-mdx-word.ts`
- `src/features/dictionary/application/use-cases/index.ts`
- `src/features/dictionary/application/index.ts`

职责：

- 定义 `DictionaryConfigRepository`、`MdxDictionaryRepository`、`DictionaryActionRepository`、`MdxDictLoader`、`DictionaryAdapterFactory`。
- `DictionaryService` 只依赖 repository 和 adapter factory 接口，不直接访问 uTools 或具体 adapter 实现。
- MDX 管理和查询流程进入 use case。

### 3. Dictionary 基础设施层

新增：

- `src/features/dictionary/application/adapters/base-dict-adapter.ts`
- `src/features/dictionary/infra/adapters/custom-dict-adapter.ts`
- `src/features/dictionary/infra/adapters/mdx-dict-adapter.ts`
- `src/features/dictionary/infra/adapters/index.ts`
- `src/infra/repositories/dictionary.repository.utools.ts`

调整：

- `src/dict/index.ts`
- `src/dict/types.ts`
- `src/dict/BaseDictAdapter.ts`
- `src/dict/adapters/CustomDictAdapter.ts`
- `src/dict/adapters/MdxDictAdapter.ts`
- `src/@types/global.d.ts`

结果：

- 旧 `src/dict` 路径保留为兼容转发。
- `dictService` 不再直接读写 `window.utools.db`。
- 自定义词典内容存取通过 `DictionaryConfigRepository` 注入。
- MDX loader 通过 `MdxDictLoader` 注入，adapter 不再直接访问 `window.dictMdxLoader`。
- `window.getMdxDictConfig`、`window.queryMdxWord`、`window.services` 等旧平台能力集中在 `dictionary.repository.utools.ts`。

### 4. Dictionary 表现层

新增：

- `src/features/dictionary/presentation/hooks/useMdxDicts.ts`
- `src/features/dictionary/presentation/hooks/useMdxQuery.ts`
- `src/features/dictionary/presentation/hooks/index.ts`

调整：

- `src/pages/MdxManage/index.tsx`
- `src/pages/MdxQuery/index.tsx`

结果：

- MDX 管理页面不再直接读取 `window.getMdxDictConfig`、`window.selectMdxFiles`、`window.updateMdxDictOrder`、`window.removeMdxDict`。
- MDX 查询页面不再直接读取 `window.getAction`、`window.queryMdxWord` 或手写 `utools-mode-change` 监听。
- 页面层只处理渲染、动画、导航和 focus 状态。

### 5. 仍需扫尾

按"全项目完成"标准，Dictionary 相关仍有以下生产代码未迁完：

- `src/pages/Gallery-N/Form4AddDict/index.tsx` 仍直接读取 MDX 全局 API。
- `src/pages/Typing/components/WordPanel/index.tsx` 仍直接读取 MDX 全局 API。

因此第四阶段当前只能标记为"核心链路完成"，不能标记为"Dictionary 全量完成"。

当前验证：

```bash
npx vitest run src/features/dictionary src/pages/MdxManage src/pages/MdxQuery
npm run build
```

结果：

- Dictionary 相关 `2` 个测试文件通过。
- `7` 个测试用例通过。
- 生产构建通过。

## 第五阶段：扫尾与全项目完成

### 1. Settings 页面分层

新增：

- `src/platform/utools/plugin-actions.ts`：封装 `clearAllData()` 和 `restartPlugin()`。
- `src/platform/utools/mode.ts`：封装 `getMode()` 和 `onModeChange()`。
- `src/features/backup/application/data-export.ts`：暴露 `exportDatabase`/`importDatabase`。

调整：

- `src/pages/Typing/components/Setting/AdvancedSetting.tsx`：改用 typing domain 的 `setDailyLimit`，通过 platform wrapper 调用清空/重启。
- `src/pages/Typing/components/Setting/DataSetting.tsx`：通过 backup application 调用导入导出。
- `src/pages/Typing/NormalTypingPage.tsx`、`RepeatTypingPage.tsx`、`ConsolidateTypingPage.tsx`：改用 platform wrapper 的 `getMode()` 和 `onModeChange()`。

### 2. Analysis 和 Gallery-N 残留页面

新增：

- `src/features/analysis/domain/word-stats.ts`：按日期分组的统计规则纯函数。
- `src/features/analysis/application/use-cases/get-word-stats.ts`：获取时间范围内的单词统计。
- `src/features/analysis/presentation/hooks/useWordStats.ts`：调用 use case。
- `src/features/word-bank/application/use-cases/get-dict-progress-stats.ts`：获取词库学习进度统计。
- `src/features/word-bank/presentation/hooks/useDictStats.ts`：调用 use case。

调整：

- 扩展 `AnalysisRepository` 接口，添加 `getWordRecordsByTimeRange`。
- `src/pages/Analysis/hooks/useWordStats.ts`：改为兼容转发。
- `src/pages/Gallery-N/hooks/useDictStats.ts`：改为兼容转发。

### 3. Dictionary 残留页面检查

检查结果：

- `src/pages/Gallery-N/Form4AddDict/index.tsx`：无 window 直连。
- `src/pages/Typing/components/WordPanel/index.tsx`：无 window 直连。

Dictionary 残留页面已在之前迁移完成。

### 4. 验证结果

```bash
npx vitest run
npm run build
```

结果：

- `24` 个测试文件通过。
- `202` 个测试用例通过。
- 生产构建通过。

### 5. 全项目完成验收

按"全项目完成"标准检查：

1. ✅ `src/pages` 下的生产代码不再直接 import `@/utils/db`。（仅测试文件保留 legacy 直连）
2. ✅ `src/pages` 下的生产代码不再直接访问 `window.utools`、`window.services`、`window.getMdxDictConfig`、`window.queryMdxWord`、`window.clearAllData`、`window.restartPlugin`、`window.getMode` 等平台全局 API。（通过 platform wrapper 访问）
3. ✅ 非 infra/platform 目录不再直接操作 Dexie 或 uTools DB。
4. ✅ 旧 `src/services`、`src/utils/db`、`src/dict` 路径只承担兼容转发、底层模型或基础设施职责。
5. ✅ 仍使用旧路径的测试标记为 legacy integration test。
6. ✅ 全量相关测试和 `npm run build` 通过。

**分层重构已完成。**

## 验收标准

每迁移一个功能模块，至少满足：

1. 页面层不直接 import `@/utils/db`。
2. 业务规则可通过纯函数单测覆盖。
3. use case 可以用 mock repository 测试。
4. Dexie 查询集中在 `infra/repositories`。
5. 构建通过。
6. 相关功能测试通过。

## 注意事项

- 不做一次性大搬家，优先迁移一条完整数据链路。
- 旧路径允许短期兼容转发，但新代码不要继续写到旧结构里。
- 迁移时优先保证行为不变，再优化命名和目录。
- 如果某个文件同时包含 UI、业务和数据访问，先抽 use case，再抽 repository，最后再移动页面组件。
