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
