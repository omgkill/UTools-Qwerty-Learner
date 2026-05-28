巩固模式独立化实现计划                                                                                               │
│                                                                                                                      │
│ 背景                                                                                                                 │
│                                                                                                                      │
│ 用户希望将"巩固模式"从正常学习流程中分离出来，作为一个独立的学习模式（类似重复学习模式）。正常背单词时，当复习和新词 │
│ 都完成后直接显示"学习完成"，不再自动进入巩固模式。                                                                   │
│                                                                                                                      │
│ 需要修改的文件                                                                                                       │
│                                                                                                                      │
│ 1. public/plugin.json - 添加新的 uTools 入口                                                                         │
│                                                                                                                      │
│ 添加巩固模式的指令入口：                                                                                             │
│ {                                                                                                                    │
│   "code": "consolidate",                                                                                             │
│   "explain": "🔁巩固学习模式",                                                                                       │
│   "cmds": ["巩固学习", "consolidate"]                                                                                │
│ }                                                                                                                    │
│                                                                                                                      │
│ 2. src/index.tsx - 添加路由和模式处理                                                                                │
│                                                                                                                      │
│ - 添加 ConsolidateTypingPage 的懒加载                                                                                │
│ - 处理 consolidate 模式的路由                                                                                        │
│ - 路由指向 /consolidate                                                                                              │
│                                                                                                                      │
│ 3. src/pages/Typing/hooks/learningLogic.ts - 移除巩固模式逻辑                                                        │
│                                                                                                                      │
│ 修改 determineLearningType 函数：                                                                                    │
│ - 当没有到期单词和新单词时，直接返回 complete 类型                                                                   │
│ - 删除第 75-90 行的巩固模式逻辑                                                                                      │
│                                                                                                                      │
│ 4. src/pages/Typing/NormalTypingPage.tsx - 移除巩固模式标签                                                          │
│                                                                                                                      │
│ 修改 LEARNING_TYPE_LABELS：                                                                                          │
│ - 保留 consolidate 类型定义但不再在正常流程中使用                                                                    │
│ - 或者完全移除 consolidate 相关显示                                                                                  │
│                                                                                                                      │
│ 5. src/pages/Typing/ConsolidateTypingPage.tsx - 新建巩固学习页面                                                     │
│                                                                                                                      │
│ 参考 RepeatTypingPage.tsx 创建，主要区别：                                                                           │
│ - 加载已学习但未掌握的单词（masteryLevel > 0 && masteryLevel < 7）                                                   │
│ - 独立的进度保存逻辑                                                                                                 │
│ - 显示"巩固学习"标签                                                                                                 │
│                                                                                                                      │
│ 6. src/pages/Typing/hooks/useWordList.ts - 添加巩固模式支持                                                          │
│                                                                                                                      │
│ 添加获取巩固单词的逻辑（如果需要在 hook 中支持）。                                                                   │
│                                                                                                                      │
│ 实现步骤                                                                                                             │
│                                                                                                                      │
│ 1. 修改 learningLogic.ts，移除巩固模式分支，直接返回 complete                                                        │
│ 2. 修改 NormalTypingPage.tsx，移除巩固模式标签显示                                                                   │
│ 3. 创建 ConsolidateTypingPage.tsx，复用 RepeatTypingPage 的结构                                                      │
│ 4. 修改 plugin.json 添加入口                                                                                         │
│ 5. 修改 index.tsx 添加路由                                                                                           │
│                                                                                                                      │
│ 巩固模式单词来源                                                                                                     │
│                                                                                                                      │
│ 选择已学习但未完全掌握的单词（masteryLevel > 0 && masteryLevel < 7），与原有逻辑一致。                               │
│                                                                                                                      │
│ 验证方式                                                                                                             │
│                                                                                                                      │
│ 1. 运行测试确保 learningLogic.ts 的修改不破坏现有逻辑                                                                │
│   - 可能需要更新相关测试用例（learningLogic.test.ts 等）                                                             │
│ 2. 在 uTools 中测试正常学习流程，确认复习和新词完成后显示"学习完成"                                                  │
│ 3. 测试新的巩固模式入口，确认能正确加载已学习但未掌握的单词                                                          │
│ 4. 验证巩固模式的进度保存和恢复功能 