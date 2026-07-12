# 背单词核心逻辑重构文档

## 当前目标

当前重构只聚焦背单词主链路，不扩展到其他模块。

本轮要解决的是：

1. 背单词主流程逻辑过长，业务决策分散在多个 hook、page、reducer 和 repository 调用之间。
2. 现有测试大量覆盖局部规则，但没有稳定覆盖“进入一轮学习 -> 完成单词 -> 更新进度与每日记录 -> 进入下一词/下一批”的完整事务。
3. 因为流程不是单一事务模型，容易出现重复计数、跳词、补位错误、学习批次切换不稳定等问题。

## 当前边界

本轮不处理以下内容：

1. MDX 词典链路。
2. uTools 备份恢复链路。
3. 非背单词核心流程的页面样式或杂项重构。

原因：

- MDX 词典当前可用，不是核心故障点。
- 当前真实复杂度集中在背单词业务事务，而不是词典查询。
- 范围继续扩大只会让主问题失焦。

## 当前问题判断

### 1. 学习会话决策和页面推进是分裂的

当前“学哪些词”由 `getTypingSession` 决定，但“完成一个词后怎么更新、怎么切下一个、怎么学下一批”分别散落在：

- `features/typing/application/use-cases/get-typing-session.ts`
- `pages/Typing/components/WordPanel/components/Word/hooks/useWordCompletion.ts`
- `pages/Typing/components/WordPanel/index.tsx`
- `pages/Typing/hooks/useNormalLearningSync.ts`
- `pages/Typing/NormalTypingPage.tsx`
- `pages/Typing/store/reducer.ts`

这意味着流程靠多个 effect 和 dispatch 拼起来，而不是一个完整事务。

### 2. 业务分类依赖持久化后的结果反推

`completeWord` 现在通过 `progress.reps === 1` 判断一个词是不是“新词”。

这有两个问题：

1. “当前词属于新词还是复习词”不是会话决策的一部分。
2. 业务语义依赖写库后的结果反推，边界场景不稳定。

### 3. 掌握流程是另一套独立逻辑

`markWordMastered` 直接负责：

- 修改 progress
- 补一个新词
- 更新 `masteredCount`

它没有和正常完成单词流程共享统一的 session 模型，所以掌握、新词补位、每日计数之间天然容易不一致。

### 4. reducer 维护页面游标，但不理解业务语义

当前 reducer 负责：

- `SET_WORDS`
- `NEXT_WORD`
- `FINISH_WORDS`
- `SKIP_WORD`
- `ADD_REPLACEMENT_WORD`

但 reducer 并不知道当前词是：

- 新词
- 复习词
- 掌握后补位词

因此正确性依赖外部调用顺序，而不是状态模型本身。

### 5. 测试分层不对

现在很多测试验证的是：

- 配额规则
- 到期判断
- mastery level 变化

这些规则本身有价值，但不能替代“完整学习事务”的验证。也就是说，局部测试通过，不等于背单词主流程正确。

## 重构方向

### 第一阶段：建立单一会话模型

新增 `TypingSession` 作为背单词主流程的统一业务状态。

建议最少包含：

- `dictId`
- `mode`
- `queueWords`
- `currentIndex`
- `todayCounts`
- `dueCount`
- `newCount`
- `masteredCount`
- `currentWordKind`
- `isFinished`

其中 `currentWordKind` 应明确区分：

- `new`
- `review`
- `replacement`

目标：

“当前词是什么业务类型”必须是 session 明确给出的，而不是页面或 repository 在事后猜。

### 第二阶段：把完成单词收成单一事务

新增统一 use case，建议至少包括：

1. `startTypingSession`
2. `completeCurrentWord`
3. `markCurrentWordMastered`
4. `advanceSession`

其中 `completeCurrentWord` 必须一次性完成：

1. 校验当前 session 和当前词。
2. 更新 progress。
3. 按当前词类型更新 daily record。
4. 决定是否补位。
5. 决定前进到下一词、结束当前批次，或重算下一批。
6. 返回新的 session snapshot。

### 第三阶段：页面只消费 session，不再拼业务

页面层职责收敛为：

1. 渲染当前 session。
2. 处理输入框交互。
3. 在用户完成单词或点击掌握时，调用统一 use case。
4. 用新的 session snapshot 刷新页面。

页面不再直接承担这些业务职责：

- 推断当前词是不是新词
- 推断今天应该加 learned 还是 reviewed
- 自己决定何时 reload 下一批
- 依赖多个 effect 协调“学习推进”

### 第四阶段：reducer 降级为 UI reducer

reducer 后续只保留纯 UI 状态，例如：

- 是否正在输入
- 是否完成当前输入
- 是否沉浸模式
- 是否显示释义
- 计时器和输入可视状态

业务推进不再依赖 `NEXT_WORD`、`FINISH_WORDS` 这类缺少业务上下文的动作来拼装。

## 测试重构方向

### 保留

继续保留 domain 规则测试：

- 到期判断
- 配额分配
- mastery level 更新规则

### 新增重点

新增 application 层的完整事务测试，覆盖：

1. 新词完成一次后：
   - progress 正确
   - `learnedCount` 正确
   - session 正确前进
2. 复习词完成一次后：
   - progress 正确
   - `reviewedCount` 正确
   - session 正确前进
3. 掌握当前词后：
   - `masteredCount` 正确
   - 补位逻辑正确
   - session 不跳错词
4. 一批 20 个词学完后：
   - 正确进入下一批或完成
   - 不重复、不漏词
5. `due > 20` 时：
   - 多天滚动复习行为稳定
6. 错误输入后再正确时：
   - progress 和 daily record 仍然正确

### 页面测试边界

页面测试只验证：

1. 页面是否正确展示当前 session。
2. 完成输入后是否调用统一事务入口。
3. session 更新后页面是否正确刷新。

页面测试不再承担背单词业务正确性的主要验证责任。

## 当前实施顺序

1. 定义 `TypingSession` 结构与 `currentWordKind`。
2. 重写 `completeWord`，不再通过 `progress.reps === 1` 反推新词/复习词。
3. 将 `markWordMastered` 并入同一套 session 事务。
4. 页面改为消费 session snapshot。
5. 清理旧的分散推进逻辑和多处 effect 协调。

## 2026-07-12 当前状态

本轮只处理 normal 背词主链路，repeat / consolidate、MDX 和备份链路不纳入本轮验收。

当前已完成：

1. `TypingSession`、`currentWordKind`、`startTypingSession`、`completeCurrentWord`、`markCurrentWordMastered` 已建立。
2. 正常学习会话已有独立的 snapshot 持久化与恢复逻辑。
3. `NormalTypingPage` 已改成把当前词、前后词和词列表高亮直接从 session snapshot 派生。
4. normal 主链路里 UI 已禁止直接修改业务游标，避免“显示词”和“提交词”分叉。
5. 统计动作已改为显式携带词索引，不再依赖 reducer 当前索引反推当前词。
6. normal 主链路里没有真实产出的历史语义已清理，避免 session 类型和事务实现分叉。
7. normal 主链路组件和 hooks 已统一使用 `WordWithIndex`，`tsc --noEmit` 已通过。
8. 页面边界测试已覆盖：
   - 当前 session 展示正确
   - 完成输入走统一事务入口
   - session 更新后页面切到新的当前词
   - 刷新恢复后展示词与 session snapshot 一致

验证结果：

1. `npx tsc --noEmit` 通过。
2. `./node_modules/.bin/vitest run src/pages/Typing/store/reducer.test.ts src/pages/Typing/NormalTypingPage.component.test.tsx src/features/typing/application/use-cases/typing-session-transaction.test.ts` 通过。
3. `npm run build` 通过。

## 2026-07-12 本次开发计划

1. 统一 normal 主链路组件与 hooks 的单词类型为 `WordWithIndex`。
2. 修复 `WordPanel` 内部辅助逻辑的类型导入和引用错误。
3. 扩充页面测试，确保页面边界满足本文件的执行标准。
4. 重新运行类型检查、事务测试、页面测试和构建验证。

当前状态：以上四项均已完成。

## 验收标准

只有满足以下条件，才能认为这轮背单词核心重构完成：

1. 同一词在“新词 / 复习 / 掌握”三条路径下，每日计数唯一且正确。
2. 一批单词完成后，下一批加载稳定，不重复、不漏词、不跳词。
3. `due > 20`、掌握补位、错误重输、刷新恢复四类场景有稳定的集成测试。
4. 页面层不再通过 `reps === 1` 或类似副作用结果反推业务语义。
5. `NormalTypingPage` 主流程不再依赖多个 effect 拼接学习推进。

补充到可执行的代码标准：

1. normal 主链路中，页面展示的当前词必须直接来自 `TypingSession.currentWord` 或 `TypingSession.queueWords[TypingSession.currentIndex]`。
2. normal 主链路中，页面不能再直接 dispatch 一个“修改业务游标”的动作。
3. `completeCurrentWord` 与 `markCurrentWordMastered` 提交的必须是页面当前展示的那个词。
4. reducer 在 normal 主链路里只维护 UI 可视状态和输入统计，不再拥有独立的业务队列推进权。
5. 页面测试至少要覆盖：
   - 当前 session 展示正确
   - 完成输入时提交的是当前展示词
   - session 更新后页面切到新的当前词
   - 刷新恢复后展示词与 session snapshot 一致
