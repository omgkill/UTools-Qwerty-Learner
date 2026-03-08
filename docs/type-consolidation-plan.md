# 类型定义统一方案

## 一、背景

项目中类型定义分散在多个位置，不利于维护和复用。本次重构将共享类型集中到 `src/types/` 目录。

## 二、迁移内容

### 已迁移的类型

| 类型 | 原位置 | 新位置 |
|------|--------|--------|
| `DictType`, `DictItem`, `WordInfo`, `DictMeta`, `DictAdapter` | `src/dict/types.ts` | `src/types/dict.ts` |
| `MasteryLevel`, `WordProgress`, `DailyRecord`, `MASTERY_LABELS`, `REVIEW_INTERVALS` | `src/utils/storage/types.ts` | `src/types/storage.ts` |
| `WordDisplayInfo`, `WordDisplayInfoMap`, `TimerData`, `WordListData`, `StatsData`, `UIState`, `TypingState` | `src/pages/Typing/store/types.ts` | `src/types/learning.ts` |
| `LearningMode`, `LearningStats`, `WordSourceStrategy`, `UseLearningSessionOptions`, `UseLearningSessionResult` | `src/pages/Typing/hooks/useLearningSession/` | `src/types/learning.ts` |

### 保留原位置的类型

| 类型 | 位置 | 理由 |
|------|------|------|
| `Window` 扩展 | `src/@types/global.d.ts` | 全局声明文件 |
| 所有 `XXXProps` 类型 | 各组件文件 | 组件 Props 内联定义是 React 最佳实践 |
| `SetStateActionWithReset` | `src/store/atomForConfig.ts` | 仅在此文件使用 |
| `AppErrorType`, `AppError`, `ErrorHandler` | `src/utils/errorHandling.ts` | 仅在此模块使用 |
| `DictLoader`, `CustomDictEntry` | 各 adapter 文件 | 仅在 adapter 内使用 |
| `LearningType` | `src/pages/Typing/store/atoms/sessionAtoms.ts` | 仅在 session 模块使用 |

## 三、新目录结构

```
src/types/
├── index.ts      # 统一导出入口 + 核心类型 (Word, WordWithIndex 等)
├── resource.ts   # 资源相关类型 (WordBank, Dictionary, SoundResource 等)
├── dict.ts       # 字典相关类型 (DictType, DictMeta, DictAdapter 等)
├── storage.ts    # 存储相关类型 (MasteryLevel, WordProgress, DailyRecord 等)
└── learning.ts   # 学习模块类型 (LearningMode, LearningStats, TypingState 等)
```

## 四、导入方式

重构后统一从 `@/types` 导入：

```typescript
// 重构前
import type { DictItem } from '@/dict/types'
import type { WordProgress } from '@/utils/storage/types'
import type { TimerData } from '../types'

// 重构后
import type { DictItem, WordProgress, TimerData } from '@/types'
```

## 五、已删除的文件

- `src/dict/types.ts`
- `src/utils/storage/types.ts`
- `src/pages/Typing/store/types.ts`

## 六、命名规范

| 类型类别 | 命名规范 | 示例 |
|---------|---------|------|
| 数据类型 | 无前缀，语义化 | `WordProgress`, `LearningStats` |
| Props 类型 | `XXXProps` | `DrawerProps`, `DictListProps` |
| 枚举/联合类型 | `XXXType` 或语义化 | `DictType`, `LearningMode` |
| 状态类型 | `XXXState` | `TypingState`, `UIState` |

## 七、验证清单

- [x] TypeScript 编译无错误
- [x] 所有导入路径正确更新
- [x] 无循环依赖
- [x] 旧类型文件已删除
