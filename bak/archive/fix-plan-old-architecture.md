现在我有足够的信息来做完整的架构分析了。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                             src/pages/Typing 架构总结                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


                                                    一、整体数据流

```
window.readLocalWordBankConfig()
        │  (useTypingInitializer)
        ▼
  jotai: wordBanksAtom / currentWordBankAtom / currentWordBankIdAtom
        │
        ▼
  useWordList (useSWR 拉取词表 wordList)
        │
        ├─► useReviewWords.getDueWordsWithInfo()  → dueWords
        ├─► useReviewWords.getNewWords()          → newWords
        └─► useWordProgress.getWordProgress()     → allProgress
                │
                ▼
        determineLearningType()        ← learningLogic.ts
        (dueWords / newWords / dailyRecord / isExtraReview)
                │
                ▼
        learningWords (useState)
                │
                ▼
  useWordSync(words, isTyping)
        │  词表变化时 dispatch SET_WORDS
        │  首次加载额外 dispatch SET_IS_TYPING(true)
        ▼
  useImmerReducer(typingReducer, initialState)  ← 核心本地状态
  TypingContext.Provider → state / dispatch
        │
        ├─ WordPanel（打字展示，用户输入）
        │       │ dispatch NEXT_WORD / FINISH_WORDS / REPORT_CORRECT_WORD 等
        │
        ├─ useTypingTimer → dispatch TICK_TIMER
        ├─ useTypingHotkeys → dispatch SKIP_WORD
        └─ useLearningRecordSaver(state)
               │ state.uiState.isFinished === true 时触发
               ▼
         saveLearningRecord(state)  +  window.exportDatabase2UTools()
```

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                   二、状态管理方式

                                        1. useImmerReducer (本地 session 状态)

定义在 App 组件，通过 TypingContext 向下传递。


字段                               含义
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
wordListData.words / index         当前练习词表 + 当前词位置
statsData                          wordCount / correctCount / wrongCount / wpm / accuracy / wordRecordIds
uiState                            isTyping / isFinished / isShowSkip / isExtraReview / isSavingRecord
wordInfoMap                        单词音标/释义缓存（按词名 key）
isTransVisible / isImmersiveMode   显示控制


29 个 action 涵盖词表设置、打字统计、UI 切换、计时等。

                                          2. Jotai atoms (跨页面/持久化状态)

• 全局 store：wordBanksAtom、currentWordBankAtom、currentWordBankIdAtom — 词库选择，跨页面共享
• 本页 atoms：dailyRecordAtom（store/atoms.ts）— 今日学习记录，在 useWordList 和 useLearningRecordSaver 间桥接

两层状态划分的思路清晰：jotai 管持久/跨组件，reducer 管页面内 session。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                 三、各 Hook 职责划分


Hook                       职责
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
useTypingInitializer       从 window.readLocalWordBankConfig() 读取词库列表，写入 jotai atoms，无词库时跳转
/gallery
useWordList                核心编排：SWR 拉词表 → 查 due/new words → 调 determineLearningType → 维护 learningWord…
state；管理 isExtraReview、reloadWords、getNextNewWord
useWordSync                桥接层：监听 useWordList 返回的 words，当词表内容变化且未在打字时，dispatch
SET_WORDS；仅首次加载时自动 dispatch SET_IS_TYPING(true)
useLearningRecordSaver     监听 state.uiState.isFinished，触发一次性保存（用 hasSavedRef 防重复），调用 DB 保存 +
mixpanel 上报 + uTools 导出
useTypingTimer             每秒 dispatch TICK_TIMER，驱动 wpm/accuracy 计算
useTypingHotkeys           注册快捷键，调用 skipWord / handleMastered 回调
useKeyboardStartListener   监听键盘事件，在非打字状态下启动打字
useExtraReviewPopup        达成每日目标且有剩余 due words 时，控制弹窗显示/确认/关闭
useConfetti                完成时触发彩带特效
learningLogic.ts           纯函数层：determineLearningType / calculateNewWordQuota /
hasReachedDailyTarget，无副作用，可独立测试


──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                   四、架构问题分析

                                                   ✅ 做得好的地方

• learningLogic.ts 完全纯函数，与 React 解耦，测试友好（已有 .test.ts）
• useWordSync 作为独立桥接层，把"词表更新"和"打字状态控制"职责分离清楚
• hasSavedRef 防止 useLearningRecordSaver 在 isFinished 后因其他 state 变化重复保存
• loadVersionRef 防止 useWordList 内并发加载的竞态条件

                                                    ⚠️ 潜在架构问题

1. isExtraReview 状态双重存在

• useWordList 内部有 useState<boolean>(isExtraReview) 管理它
• TypingState.uiState.isExtraReview reducer 里也有同名字段（SET_IS_EXTRA_REVIEW action）
• 两者并不同步，reducer 里的那个几乎没有被使用，是冗余状态

2. useWordList 过于臃肿 该 hook 同时承担：SWR 数据拉取、due/new words 查询、determineLearningType 调用、多个 useState
   管理、reloadWords 版本控制、getNextNewWord 按需查询。实质上是一个微型状态机，职责边界模糊。

3. reloadWords 的多个触发点存在潜在重复加载

```typescript
// useWordList 内有三处独立 useEffect 都会调用 reloadWords：
useEffect(() => { if (dailyRecord) reloadWords() }, [dailyRecord])
useEffect(() => { if (isExtraReview) reloadWords() }, [isExtraReview])
useEffect(() => { if (learningWords.length === 0 ...) reloadWords() }, [...])
// startExtraReview 也会同时 setIsExtraReview(true) + reloadWords()
// → isExtraReview 变化后两个 effect 都会触发 reloadWords
```

startExtraReview 会同时触发 "isExtraReview effect" 和它自己调用的 reloadWords，共两次加载（isLoadingRef
会阻断第二次，但逻辑不清晰）。

4. newWordQuota 和 remainingForTarget 完全相同 代码注释已承认：const remainingForTarget =
   newWordQuota，但仍作为两个独立字段暴露出去，调用方可能混淆语义。

5. dailyRecordAtom 的写入来源不明确 useLearningRecordSaver 保存记录后会更新 DB，但 dailyRecordAtom 的刷新依赖
   useDailyRecord().refreshDailyRecord()（在 useWordList 的 effect 里调用），形成隐式的"保存 → DB 变化 → atom 更新 →
   reloadWords"链路，中间无明确的触发信号。

6. App 组件中 isLoading 从 useTypingInitializer 返回但从未被使用

```typescript
const { isLoading, setIsLoading, isInitialized, currentWordBank } = useTypingInitializer()
// isLoading 和 setIsLoading 在 App 中没有任何引用
```

是残留的未清理接口。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                       五、总结

整体架构分层清晰，核心思路是：

```
jotai (词库/每日记录) → useWordList (学习决策) → useWordSync (桥接) → useImmerReducer (打字session) → UI
```

最大的设计问题是 useWordList 承担了过多职责，以及 isExtraReview
的状态双轨问题。纯函数层（learningLogic.ts）的抽取是个很好的模式，值得进一步延伸到其他计算逻辑。

请问接下来需要深入某个具体问题（比如 isExtraReview 状态统一、useWordList 拆分方案），还是需要了解其他模块？
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

─── Subagent: General Purpose (架构全览-DB和进度逻辑) ──────────────────────────────────────────────────────────────────
现在我有了完整的信息，可以进行全面总结。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                  架构与主要逻辑总结

                                                     一、整体架构

```
src/utils/db/progress/          ← 核心数据模型层
  constants.ts                  ← MASTERY_LEVELS, REVIEW_INTERVALS, DAILY_LIMIT
  types.ts                      ← IWordProgress, IDailyRecord, IDictProgress 接口
  models.ts                     ← WordProgress, DailyRecord, DictProgress 类
  utils.ts                      ← getNextReviewTime(), updateMasteryLevel()
  index.ts                      ← re-export

src/utils/db/hooks/
  useReviewWords.ts             ← 查询到期词 / 新词
  useLearningStats.ts           ← 统计学习数据（totalWords, dueWords 等）
  index.ts                      ← re-export

src/pages/Typing/hooks/
  learningLogic.ts              ← determineLearningType() 等纯逻辑函数
  learningLogic.test.ts         ← 单元测试
  integration.test.ts           ← 集成流程测试
  learningSimulation.test.ts    ← 多天模拟测试
```

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
二、useReviewWords 的查询逻辑

getDueWords（到期词）

```
条件：dict == currentDictID
      AND nextReviewTime <= now
      AND masteryLevel > NEW (0)
      AND masteryLevel < MASTERED (7)
```

• 先 db.wordProgress.where('dict').equals(dictID).toArray() 全量加载该词典记录，再在内存中 filter，最后 slice(0,
limit)。
• 注意：limit 对 DB 查询无效，实际是内存截取。在词典量大时有性能问题，但逻辑正确。

getDueWordsWithInfo

• 调用 getDueWords，再从 allWords 数组中找出匹配的 WordWithIndex。
• ⚠️ 潜在 bug：getDueWords 已经 slice(0, limit)，这里返回的数量 ≤ limit，但如果 allWords 中 name 与 DB 中 word
不一致（大小写/空格），会静默丢失词。

getNewWords（新词）

```
条件：word.name 不在 existingProgress 的 Set 中
```

• 取 allWords 中 DB 里完全没有记录的词（包括 masteryLevel=NEW 的记录也算"已存在"，不会重新给出）。
• ⚠️ 设计问题：masteryLevel=NEW 且 reps=0 的词（学习过但未完成）会被排除在 getNewWords 之外，但 getDueWords
也不会返回它（因为 masteryLevel > NEW 过滤掉了）。这些词会陷入"孤岛"——既不是新词，也不是到期词。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
三、easeFactor 的使用问题（核心矛盾）

文档要求：去掉 easeFactor 机制，改为固定间隔（REVIEW_INTERVALS 中的固定天数）。

实际实现：easeFactor 依然被完整保留：


位置                   现状
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
getNextReviewTime()    间隔 = baseDays * easeFactor，默认 2.5 倍放大
updateMasteryLevel()   答对无误 +0.1，答对有误 -0.1，答错 -0.2，范围 [1.3, 3.0]
WordProgress           初始 easeFactor = 2.5
IWordProgress 接口     包含 easeFactor: number
所有测试               明确断言 newEaseFactor 的变化


实际效果：

• LEARNED 级别（baseDays=1）实际间隔 = 1 × 2.5 = 2.5天（而非文档要求的 1 天）
• FAMILIAR 级别（baseDays=2）实际间隔 = 2 × 2.5 = 5天（而非 2 天）
• 越复习正确，间隔越拉越长（最多 3 倍），越错越压缩（最少 1.3 倍）

测试注释里已经出现自相矛盾的说法：

```typescript
// LEARNED 间隔 1 天 * easeFactor(2.5) = 2.5 天
// Day 2：LEARNED 间隔 = 1天 × easeFactor(2.6) ≈ 2.6天，尚未到期
```

这说明代码实现的是 SM-2 风格动态间隔，不是固定间隔。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
四、useLearningStats 的逻辑问题

todayLearned 和 todayReviewed 的判断依据是 reps：

```typescript
todayLearned  = p.lastReviewTime >= todayStart && p.reps === 1
todayReviewed = p.lastReviewTime >= todayStart && p.reps > 1
```

⚠️ 逻辑 bug：

• reps === 1 表示"历史上总共完成了1次"，不代表"今天第一次学"。一个昨天学过（reps=1）、今天复习（reps 变成
2）的词，统计时 reps > 1 被算作 reviewed，看起来正确；但如果今天学了新词，reps 也从 0 变成
1，这个判断才成立。这里存在语义上的脆弱性——依赖 reps 的绝对值而非每日增量来判断类型。
• dueWords 的条件是 masteryLevel < MASTERED，而 getDueWords 的条件是 masteryLevel > NEW AND masteryLevel <
MASTERED。两处不一致：dueWords 统计会多算 masteryLevel=NEW 的词（NEW 级别也有 nextReviewTime <= now
的情况，但这些词不应复习）。

代码重复：refreshStats 和 useEffect 内部逻辑完全重复（相同的 filter 逻辑写了两遍），应该提取为公共函数。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
五、测试覆盖分析

已覆盖的场景：

• determineLearningType：review / new / complete / consolidate 四种模式切换
• 每日限额计算（DAILY_LIMIT - reviewedCount - learnedCount）
• hasMoreDueWords / remainingDueCount 的检测
• isExtraReview=true 时绕过限额
• 词语掌握度升降级转换（NEW→LEARNED→FAMILIAR→KNOWN）
• 答错降级、边界（不低于 NEW，不超过 MASTERED）
• DailyRecord 各计算属性
• 多天模拟（15天/30天模拟，验证整体流程）
• React StrictMode 重复执行场景（reps 去重）

未覆盖的场景：

1 useReviewWords 本身没有单元测试（依赖 Dexie DB，需要 mock）
2 useLearningStats 没有任何测试
3 masteryLevel=NEW 且 reps>0 的"孤岛词"场景（上文提到的 getNewWords 漏洞）
4 dueWords 统计与 getDueWords 过滤条件不一致的场景（NEW 级别被误算为 due）
5 getNewWords 与 getDueWordsWithInfo 的 name 大小写不匹配场景
6 跨天复习：lastReviewTime 在昨天，今天再次复习，stats 是否正确
7 easeFactor 累积变化对实际间隔的影响（现有测试只检查 newEaseFactor 的值，没有验证对 nextReviewTime
的实际影响是否符合预期）
8 consolidate 模式的词选择与 allProgress 过滤在空词典或 masteryLevel=0/7 边界的精确行为

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
六、明显的逻辑 Bug 与设计问题汇总


编号   位置                        问题描述                                                         严重性
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B1     getNextReviewTime           easeFactor 未去除，实际间隔是文档要求的 2.5                      高
倍，违背"固定间隔"设计目标
B2     getNewWords                 DB 中已有 masteryLevel=NEW                                       高
的词（reps>0）既不出现在新词队列，也不在到期队列，形成"孤岛"
B3     useLearningStats.dueWords   过滤条件缺少 masteryLevel > NEW，会多统计 NEW 级别的词           中
B4     useLearningStats            refreshStats 和 useEffect 逻辑完全重复                           低（可维护性）
B5     updateMasteryLevel          新词（masteryLevel=NEW）答对有误（wrongCount>0）时，走           低
isCorrect && wrongCount > 0 分支：newLevel = Math.max(0,
LEARNED) = LEARNED，行为正确；但 easeFactor 被扣
0.1，这对第一次见到的词就惩罚 easeFactor 是否合理存疑


──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
结论：整体架构清晰，分层合理，测试覆盖了主要的业务逻辑分支。最核心的问题是 easeFactor
机制仍然完整保留，与文档要求的"固定间隔"相悖，实际间隔被放大 1.3～3 倍；以及 masteryLevel=NEW 但 reps>0
的词会陷入孤岛，无法被任何队列选中。

需要我帮你修复其中某个问题吗？
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

─── Response ───────────────────────────────────────────────────────────────────────────────────────────────────────────
好，现在我有了全面的架构分析。让我综合两个子代理的发现，给你一个完整的评估和改动方案建议。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                     整体架构评估

整体架构是合理的，分层思路清晰：

```
jotai atoms（词库/每日记录）
    ↓
useWordList（学习决策中枢）
    ↓
useWordSync（桥接层）
    ↓
useImmerReducer（打字 session 状态）
    ↓
UI 组件
```

核心设计——learningLogic.ts 作为纯函数层——是个很好的模式，可测试、无副作用。

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                              发现的问题清单（按优先级）

                                          🔴 高优先级（影响业务逻辑正确性）

问题1：easeFactor 未去除，复习间隔是文档要求的 2.5 倍

• 文档要求固定间隔（1/2/4/7/15/21/30天）
• 实际 getNextReviewTime = baseDays * easeFactor，默认 2.5 倍放大
• 需改为 getNextReviewTime = baseDays * 24 * 60 * 60 * 1000，直接用固定天数

问题2：masteryLevel=NEW 但 reps>0 的词变成"孤岛"

• 这种情况：用户开始学了一个词（创建了 WordProgress，reps=0→...），但未完成答对（masteryLevel 停留在 0）
• getNewWords 排除它（DB 已有记录）；getDueWords 也排除它（masteryLevel > NEW 过滤）
• 这些词永远不再出现，属于数据漏洞

问题3：复习模式下点击"已掌握"不补充词

• 文档说已掌握词不消耗配额，配额应释放给后续词
• 代码里复习模式点击已掌握后直接 SKIP_WORD，当前批次词减少，未主动补充

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
🟠 中优先级（状态管理混乱）

问题4：isExtraReview 状态双轨

• useWordList 内部有 useState<boolean>
• TypingState.uiState.isExtraReview reducer 里也有
• 两者不同步，reducer 里的几乎没用到，是冗余状态

问题5：useWordList 职责过重

• 同时承担：SWR 拉取、DB 查询、学习决策、多个 useState、版本控制、getNextNewWord
• 是一个隐藏的状态机，职责边界模糊

问题6：useLearningStats.dueWords 统计条件错误

• 缺少 masteryLevel > NEW 的过滤，会把 NEW 级别的词误算进到期词统计

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
🟡 低优先级（可维护性）

问题7：newWordQuota 和 remainingForTarget 完全相同，暴露两个语义重复的字段

问题8：isLoading 在 App 组件中未被使用，残留接口

问题9：useLearningStats 内部逻辑重复（refreshStats 和 useEffect 写了两遍）

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                    建议的改动方案

我建议分两个阶段：

                                          第一阶段：对齐文档（核心业务逻辑）


改动                                   文件                                   说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
去除 easeFactor，改为固定间隔          progress/utils.ts、progress/models.…   同步更新相关测试
修复"孤岛词"：NEW级别reps>0的词纳入…   db/hooks/useReviewWords.ts             getDueWords 去掉 masteryLevel > NEW
限制，改为 reps > 0
复习模式已掌握后补充新词（同新词模 …   pages/Typing/index.tsx                 handleMastered 中不区分
learningType，统一补充


                                        第二阶段：架构清理（可选，稳定性提升）


改动                                      说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
合并 isExtraReview 双轨状态               以 useWordList 为准，删除 reducer 里的冗余字段
合并 newWordQuota / remainingForTarget    只保留一个
修复 useLearningStats.dueWords 过滤条件   加上 masteryLevel > 0
清理 isLoading 未使用接口                 删除或实际使用


──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                       我的建议

先做第一阶段，改动集中、影响范围清晰、直接对齐文档，同时把相关测试同步更新。第二阶段是架构清理，可以单独作为一次重构来
做。

您觉得这个方案如何？有没有哪个问题您认为优先级不同、或者不想改？确认后我就开始执行。


⬢ Update Todos
☐ 去除 easeFactor，改为固定间隔
☐ 修复孤岛词问题：NEW级别reps>0的词纳入到期队列
☐ 复习模式已掌握后也补充词（同新词模式）
☐ 合并 newWordQuota / remainingForTarget 为一个字段
☐ 修复 useLearningStats.dueWords 过滤条件缺少 masteryLevel > 0
☐ 清理 isExtraReview 双轨状态，删除 reducer 冗余字段
☐ 清理 isLoading 未使用接口
☐ 同步更新相关测试