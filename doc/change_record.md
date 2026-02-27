# 变更记录

## 2026-02-27 修复掌握词不包含在今日目标的问题

- 修复 `DailyRecord.totalToday` 方法，将 `masteredCount` 包含在今日目标计算中
- 现在今日目标计算逻辑：`reviewedCount + learnedCount + masteredCount`
- 这样掌握词也会被计入每日学习目标，更加合理
- 修改文件：
  - `src/utils/db/progress/models.ts`

## 2026-02-27 修复背单词集成测试 - 使用真实服务层API

- 修复测试中自己定义函数的问题，改为调用真实的服务层API
- 测试现在使用真实的服务层方法：
  - `wordProgressService.updateProgress()` - 更新单词进度
  - `dailyRecordService.incrementLearned()` - 更新每日记录
  - `loadTypingSession()` - 加载学习会话
- 测试结果从学习详情（wordRecords）验证，使用与 `useWordDetails` 相同的逻辑
- 预期结果验证：
  - 所有学习的单词都是新词（masteryLevel从NEW变为LEARNED）
  - 学了20个新词（learnedCount = 20）
  - 没有复习词（reviewedCount = 0）
  - 学习详情中显示20个新词，0个复习词，0个掌握词
- 包含3个测试用例：
  - 词库100词 -> 第一天背20个新词 -> 中间多次输入失败
  - 词库100词 -> 第一天背20个新词 -> 每个单词都正确输入
  - 词库100词 -> 第一天背20个新词 -> 部分单词错误输入后正确
- 修改文件：
  - `src/pages/Typing/hooks/wordLearning.integration.test.ts`

## 2026-02-27 增加背单词集成测试

- 新增背单词集成测试，测试第一天学习新词的场景
- 测试调用真实的服务层逻辑，并从学习详情（wordRecords）查询结果进行验证
- 预期结果验证：
  - 所有学习的单词都是新词（masteryLevel从NEW变为LEARNED）
  - 学了20个新词（learnedCount = 20）
  - 没有复习词（reviewedCount = 0）
  - 学习详情中显示20个新词，0个复习词，0个掌握词
- 包含3个测试用例：
  - 词库100词 -> 第一天背20个新词 -> 中间多次输入失败
  - 词库100词 -> 第一天背20个新词 -> 每个单词都正确输入
  - 词库100词 -> 第一天背20个新词 -> 部分单词错误输入后正确
- 修复 repeatLearning.test.ts 中重复定义 utools 属性的问题
- 修改文件：
  - `src/pages/Typing/hooks/wordLearning.integration.test.ts`（新增）
  - `src/pages/Typing/hooks/repeatLearning.test.ts`

## 2026-02-27 补充存储结构文档

- 输出学习记录与学习进度的存储结构文档
- 修改文件：
  - `doc/storage_structure.md`

## 2026-02-27 备份状态与恢复版本校验

- 增加本地写入时间与备份时间的对比，避免旧备份覆盖新数据
- 记录备份状态与耗时，统一写入入口触发备份
- 修改文件：
  - `src/index.tsx`
  - `src/utils/db/index.ts`
  - `src/utils/db/hooks/useWordProgress.ts`
  - `src/utils/db/hooks/useDailyRecord.ts`
  - `src/utils/db/hooks/useDictProgress.ts`

## 2026-02-27 进程级恢复标记避免重复覆盖

- 基于主进程 id 标记恢复，仅同一主进程内首次恢复
- 修改文件：
  - `src/index.tsx`
  - `src/utils/db/index.ts`

## 2026-02-27 修复重启后统计丢失与重复学习

- 学习记录、进度与每日记录更新后触发 utools 备份
- 增加统一的去抖备份调度，避免高频写入
- 修改文件：
  - `src/utils/db/index.ts`
  - `src/utils/db/hooks/useWordProgress.ts`
  - `src/utils/db/hooks/useDailyRecord.ts`
  - `src/utils/db/hooks/useDictProgress.ts`

## 2026-02-27 修复统计详情无学习单词与学习重复

- 词库 id 解析下沉到进度与统计相关 hooks
- 学习进度、统计与每日记录统一使用兜底 dict id
- 修改文件：
  - `src/utils/db/hooks/useWordProgress.ts`
  - `src/utils/db/hooks/useReviewWords.ts`
  - `src/utils/db/hooks/useDailyRecord.ts`
  - `src/utils/db/hooks/useDictProgress.ts`
  - `src/utils/db/hooks/useLearningStats.ts`

## 2026-02-27 修复学习后单词记录缺失

- 补充词库 id 的兜底解析，避免记录写入时丢失 dict
- 掌握单词记录写入时使用兜底 dict id
- 修改文件：
  - `src/utils/db/index.ts`
  - `src/pages/Typing/index.tsx`

## 2026-02-27 统一配置与状态存储到 utools db

- 将配置与界面状态的存储适配为 utools db
- 增加 localStorage → utools db 的启动迁移与定时迁移
- 重复学习状态与会员状态改为 utools db
- 清理业务代码对 localStorage 的直接读写
- 修改文件：
  - `src/store/atomForConfig.ts`
  - `src/store/index.ts`
  - `src/utils/utools.ts`
  - `src/index.tsx`
  - `src/pages/Typing/hooks/useLearningRecordSaver.ts`
  - `src/pages/Typing/hooks/useWordList.ts`
  - `src/pages/Typing/hooks/useTypingInitializer.ts`
  - `src/pages/Gallery-N/index.tsx`
  - `src/pages/Gallery-N/SubscriptionOverlay.jsx`
  - `src/components/StarCard/index.tsx`
  - `src/pages/Typing/hooks/repeatLearning.test.ts`

## 2026-02-27 修复重启后学习数据丢失

- 启动恢复逻辑改为等待 utools 数据读取并判空再导入
- 增加可见性切换、退出与定时备份，确保持久化写入 utools
- 启动时强制注册导入导出实现，避免预加载空函数导致备份失效
- 重复学习状态改为 utools db 持久化并按词库隔离
- 重复学习切换时恢复正常学习词表与类型
- 启动时跨天检测，自动回到正常学习状态
- 词库选择写入 utools db，重启恢复用户选择
- 修复测试与 Typing 页面 lint 报错
- 修改文件：
  - `src/index.tsx`
  - `src/pages/Typing/hooks/useWordList.ts`
  - `src/pages/Analysis/hooks/useStudyStats.integration.test.ts`
  - `src/pages/Typing/hooks/masteredCount.test.ts`
  - `src/pages/Typing/index.tsx`

## 2026-02-26 背单词逻辑服务化与渲染层解耦

- 删除依赖 mock 的组件测试用例，保留真实服务流程测试
- 调整掌握流程真实测试文件的 import 顺序以通过 lint
- 修复掌握流程真实测试文件的 import 排序
- 新增替换新词服务函数，避免掌握流程补位重复
- 替换新词逻辑接入 useWordList 与真实流程测试
- 新增真实流程用例：初始化进度后仍能正常产出新词与掌握40次不重复
- 修复新词获取逻辑：已有 NEW 进度仍视为新词
- 修复真实流程测试的 describe 闭合错误
- 修复真实流程测试的函数闭合错误
- 修复掌握40次流程测试文件括号闭合错误
- 删除并重写掌握40次流程测试，改为真实词库流程并只调用服务层 API
- 新增服务层会话与掌握流程函数，集中处理学习词表、重复学习与掌握补位逻辑
- useWordList 调整为调用服务层输出学习结果，重复学习逻辑改为服务函数
- Typing 页面掌握按钮改为调用服务层流程并返回动作结果
- 学习模拟测试修正为使用本地日零点对齐下一次复习时间断言
- 修正用例与工具文件的导入排序与冗余分号等 lint 错误
- 清理测试重复词统计的未使用参数与 Typing 页面未使用解构值
- 服务层改为类型化表访问，移除 any 与一致化 type import
- 掌握流程参数类型与实际返回值一致化，修复 typecheck 报错
- 掌握40次流程测试补充当前与下一个单词日志
- 掌握40次流程测试改为调用真实服务层掌握流程
- 修改文件：
  - `src/services/index.ts`
  - `src/pages/Typing/hooks/useWordList.ts`
  - `src/pages/Typing/index.tsx`
  - `src/pages/Typing/hooks/learningSimulation.test.ts`
  - `src/pages/Typing/hooks/cycleBug.test.ts`
  - `src/pages/Typing/store/reducer.test.ts`
  - `src/pages/Typing/components/WordPanel/index.test.tsx`
  - `src/pages/Typing/components/WordPanel/components/Word/hooks/useWordCompletion.ts`

## 2026-02-25 添加掌握按钮测试用例

- 为 WordPanel 组件添加掌握按钮测试用例，测试以下场景：
  - 点击掌握按钮后，应该标记单词为已掌握并跳到下一个单词
  - 重复点击掌握按钮，应该正确处理已掌握的单词（不会重复标记）
  - 当单词列表中有重复单词时，掌握按钮应该正确工作（只标记当前索引的单词）
  - 当单词列表中已掌握的单词重复出现时，掌握按钮应该正确工作（标记对应索引的单词）
  - 新增：连续点击掌握按钮15次，应该正确处理100个单词（调用真实逻辑，不使用mock）
    - 创建100个单词（word0到word99）
    - 连续点击掌握按钮15次
    - 验证掌握的单词数量是15个
    - 验证dispatch被调用15次
- 修改文件：`src/pages/Typing/components/WordPanel/index.test.tsx`

## 2026-02-25 优化快捷键功能

- 移除掌握按钮的快捷键（Alt + M）：从 `useTypingHotkeys` hook中移除 `alt+m` 快捷键，同时移除 `handleMastered` 参数，更新调用处
- 为"查看详细释义"添加快捷键（默认 Ctrl + 1）：在 `WordPanel` 组件中添加快捷键支持，使用 `useHotkeys` 监听配置的快捷键，在提示文字中显示当前快捷键
- 在MdxQueryPage添加返回快捷键（默认 Ctrl + 2）：在查词页面添加返回快捷键支持，仅在从背单词页面跳转过来时生效，在返回按钮的title中显示当前快捷键
- 在设置中添加自定义快捷键选项：在高级设置中新增"快捷键设置"区域，允许用户自定义"查看详细释义"和"返回"的快捷键，配置存储在 `hotkeyConfigAtom` 中
- 优化MdxQueryPage词典展开状态：从背单词界面跳转过去时，默认第一个词典是折叠的；独立查词时所有词典默认展开
- 修复MdxQueryPage键盘事件无响应问题：给页面容器添加 `tabIndex={0}` 和 `ref`，在加载完成后自动聚焦到页面，添加 `outline-none` 移除焦点外框，确保键盘事件（如向下、PageDown）能够正常响应且界面美观
- 优化MdxQueryPage滚动条样式：将滚动条颜色改为背景色（#111827），滚动条轨道也使用背景色，滚动条滑块使用深灰色（#2a2a3a），hover时变为稍深的颜色（#3a3a4a），由于是在utools的webview中使用，只使用通用的CSS标准属性（`scrollbar-width` 和 `scrollbar-color`），移除浏览器特定的样式（`-webkit-`、`-moz-`、`-ms-`），最后将 `scrollbar-width` 设置为 `none` 完全隐藏滚动条，使滚动条与背景融合，不再突兀
- 优化背单词界面释义布局：为释义和时态元素添加 `w-4/5` 类，使内容占据中间80%宽度，两边各留10%空白，避免释义贴到边框不好看；修改释义显示方式，将多个释义分行显示而不是用分号连接，使用 `flex flex-col` 布局和 `space-y-1` 间距，每个释义单独一行；将释义宽度调整为 `w-[90%]`，使内容占据中间90%宽度，两边各留5%空白；恢复原来的样式，移除中间90%宽度限制，保留 `break-words` 换行逻辑和 `max-w-4xl` 最大宽度限制；最终修改为每个释义单独一行显示，使用 `flex flex-col` 布局和 `space-y-1` 间距，移除 `break-words` 和分号连接逻辑
- 新增 `hotkeyConfigAtom` 配置项：包含 `viewDetail`（查看详细释义）和 `goBack`（返回）两个快捷键配置，默认值分别为 `ctrl+1` 和 `ctrl+2`
- 修改文件：
  - `src/store/index.ts`：新增 `hotkeyConfigAtom`
  - `src/pages/Typing/hooks/useTypingHotkeys.ts`：移除 `alt+m` 快捷键
  - `src/pages/Typing/index.tsx`：更新 `useTypingHotkeys` 调用
  - `src/pages/Typing/components/WordPanel/index.tsx`：添加查看详细释义快捷键支持
  - `src/pages/MdxQuery/index.tsx`：添加返回快捷键支持，优化词典展开状态，修复键盘事件无响应问题，移除焦点外框
  - `src/pages/Typing/components/WordPanel/components/Translation/index.tsx`：优化释义布局
  - `src/pages/MdxQuery/index.css`：优化滚动条样式
  - `src/pages/Typing/components/Setting/AdvancedSetting.tsx`：添加快捷键设置UI

## 2026-02-25 修复背单词界面UI问题

- 修复掌握按钮样式问题：
  - 问题原因：第一次修复时只调整了按钮颜色，但用户需求是完全移除按钮样式，只保留文字；第二次修复时使用了绿色，但用户要求颜色与单词一致；第三次修复时字体太小且展示格式与上一个单词/下一个单词不一致；第四次修复时距离边框太近
  - 解决方案：将 `<button>` 改为 `<span>`，只保留文字"掌握"，样式改为与上一个单词/下一个单词一致：使用 `font-mono text-2xl font-normal` 字体样式，颜色使用 `text-gray-700 dark:text-gray-400`，透明度从 `opacity-0 group-hover:opacity-100` 改为 `opacity-60 hover:opacity-100`，位置从 `bottom-2 right-2` 改为 `bottom-4 right-4` 增加与边框的距离，移除所有按钮背景、阴影等样式
- 修复Start/Pause按钮逃出背景板问题：
  - 问题原因：第一次修复时只移除了 `box-content` 并调整宽度，但Tooltip上的 `px-6 py-1` padding才是导致容器宽度超出按钮的根本原因
  - 解决方案：移除Tooltip上的所有className（包括 `h-7 w-20 px-6 py-1`），移除按钮上的固定宽度 `w-20`，让按钮自然根据内容宽度调整，确保不会超出Header背景板边界
- 修改文件：`src/pages/Typing/components/WordPanel/index.tsx` 和 `src/pages/Typing/components/StartButton/index.tsx`

## 2026-02-25 修复类型声明与词库管理表单类型问题

- 扩展 global.d.ts 的 services 与 utools 类型声明，补齐词典服务能力
- 规范 CustomDict/MdxDictAdapter 类型守卫，避免 unknown 写入
- 补齐 Typing UIState 的 isExtraReview 与初始状态
- 修正 WordPanel 测试与学习逻辑测试的类型使用
- 强化 FileDropZone、Form4AddDict、Form4EditDict 的事件与数据类型
- 调整 range 可选参数类型与 useChapterStats 占位参数使用
- 扩展语言类型并补齐发音映射、修正 isDev 可选调用与删除确认弹窗内容

## 2026-02-22 背单词界面添加查看详细释义功能

- 在 WordPanel 组件添加"详细"按钮，点击后跳转到查词页面
- 将 MdxQueryPage 添加到路由 `/query/:word?`，支持通过 URL 参数传递单词
- MdxQueryPage 支持从路由参数获取单词并自动查询
- 查词页面添加返回按钮，支持返回上一页

## 2026-02-22 重构数据统计页面为三层学习记录视图

- 移除原有的热力图和折线图统计，改为三层导航结构
- 第一层：词库列表，展示所有学习过的词库及其统计信息（显示词库名称而非ID）
- 第二层：天数列表，展示选定词库下所有学习过的日期
- 第三层：单词详情，展示选定日期学习的单词，区分新词和复习
- 新词/复习判断逻辑：历史首次出现的单词为新词，之前已学过的为复习（修复前一天学习的单词第二天仍显示为新词的问题）
- 新增 hooks/useStudyStats.ts 提供数据获取逻辑
- 新增 DictList、DayList、WordDetailList 三个展示组件

## 2026-02-22 修复数据统计热力图 color-mix 校验报错

- 问题：ActivityCalendar 组件只配置了 dark 主题，库内部会为缺失的 light 主题生成默认颜色
- 默认颜色使用 color-mix() CSS 函数，CSS.supports() 验证失败导致报错
- 解决：同时提供 light 和 dark 两套颜色数组，避免库自动生成 color-mix 表达式
- light 和 dark 主题均使用相同的紫蓝色阶梯，通过 colorScheme="dark" 固定使用深色主题

## 2026-02-22 修复数据统计热力图渲染报错

- ActivityCalendar 为空数据时显示占位，避免抛出空数据异常
- 补齐深色主题热力图颜色阶梯，避免 color-mix 校验失败

## 2026-02-22 修复 lint 报错

- 清理未使用导入与无用代码，修复排序规则
- 移除非空断言并为缺失上下文提供安全分支
- 修复记录写入时可能为空的 id 更新路径
- 修复 WordPanel 测试文件多余分号报错
- 修复 dict 模块类型导入告警
- 修复 MdxDictAdapter any 类型告警
- 清理 Layout 未使用导入告警
- 修复 global.d.ts import() 类型注解告警
- 补齐 usePronunciation useEffect 依赖告警
- 修复 index.tsx 未使用变量与 any 告警
- 清理 DictionaryWithoutCover 未使用变量告警
- 清理 Form4AddDict 非空断言告警
- 清理 ConfirmationDialog 未使用 useState 告警
- 清理 Gallery 页面未使用 setGalleryState 告警
- 修复 MdxQuery any 类型告警
- 清理 PrevAndNextWord 非空断言告警
- 清理 Progress 非空断言告警
- 清理 MiniWordChip 非空断言与依赖告警
- 清理 WordChip 非空断言与依赖告警
- 清理 ResultScreen 非空断言告警
- 清理 Setting 未使用 IconDatabaseCog 告警
- 清理 Speed 非空断言告警
- 清理 StartButton 未使用导入与非空断言告警
- 修复 WordPanel 测试文件 import() 类型告警
- 修复 WordPanel dispatch 依赖告警

## 2026-02-18 统一学习配置口径

- 更新新词配额公式，计入当日已学习新词数
- 明确已掌握词为用户确认已掌握且不计入当日复习计划
- 同步学习流程与核心规则表述
- 统一已掌握词相关措辞为不计入当日复习计划
- 同步其他文档口径与配额公式
- 修正学习配置方案中的标题与规则用语
- 修正学习模拟案例总结中的新词配额公式
- 更新学习配置方案的巩固模式口径为可选
- 修复背单词页面新词配额与目标计算的旧口径
- 调整学习模拟测试用例，使用真实进度更新与新词判定
- 修正学习模拟测试断言，按真实掌握等级统计
- 复习模式按每日剩余额度截断，达到上限时优先返回完成
- 新词答对但有错字时至少进入初学等级，避免卡在新词死区
- 沉浸模式快捷键改为 Alt + I，避免与标记已掌握冲突并修正埋点状态
- 修复项目 lint 报错以确保 CI 规则可通过

## 2026-02-16 修复背单词跳词与发音遗漏

- 仅在单词实际切换时重置输入状态，避免 StrictMode 触发重复跳词
- 先重置播放标记再触发发音，确保每个新单词都会播放

## 2026-02-16 增加单词流程日志

- 记录单词顺序变化与跳过动作的详细日志
- 记录单词结束标志触发与重置过程

## 2026-02-16 修复单词结束判定误触发

- 仅当结束标志与当前单词一致时才推进流程
- 根因是单词切换后旧的结束标志仍为 true，导致新单词被误判完成并重复推进
- 之前只拦截重复触发未绑定单词对象，未能阻断旧状态错位触发

## 2026-02-16 移除调试日志

- 删除单词流程与顺序相关的调试日志输出

## 2026-02-16 背单词释义布局自适应

- 释义文本支持自动换行，避免横向滚动条
- 背单词区域取消固定高度以便内容自动伸展

## 2026-02-16 背单词界面隐藏滚动条

- 禁用页面级滚动条，避免出现右侧白条

## 2026-02-14 背单词释义从首个词典获取

- 背单词页面在词库缺少释义时，按词典排序取第一个词典的释义展示

## 2026-02-14 背单词释义展示优化

- 抽取词典释义中的必要信息并进行精简展示
- 统一释义展示格式，优化主界面与结果页提示样式

## 2026-02-14 打印词典内容用于提取规则调整

- 输出首个词典的原始释义内容，便于规则优化

## 2026-02-15 词典释义结构化提取与展示

- 基于词典结构提取音标、释义与时态
- 释义展示按音标与解释层级排布

## 2026-02-15 释义样式与单词风格对齐

- 释义展示样式回归与单词风格一致

## 2026-02-15 统一英音显示与发音

- 去除美音标识展示
- 移除美音与英音切换，固定英音

## 2026-02-15 调整背单词释义字号

- 增大单词解释字号

## 2026-02-15 限制释义查询范围并放大音标

- 音标字号增大，提升可读性
- 释义仅在当前与下一个单词按词典查询，最多两条

## 2026-02-15 再次增大音标字号

- 音标字号进一步增大

## 2026-02-15 发音音频加入LRU缓存

- 发音音频启用LRU缓存，容量不低于50

## 2026-02-15 词库导入支持文本输入与释义校验

- 词库导入支持直接文本输入
- 导入时去重并校验词典释义后再入库

## 2026-02-15 词库导入结果展示优化

- 导入界面展示成功结果与明细统计
- 显示无释义跳过的单词列表

## 2026-02-15 词库导入默认文本与提交后关闭

- 词库导入默认切换为文本方式
- 提交成功后关闭导入弹窗

## 2026-02-18 对齐学习规则文档

- 项目策划案学习类型判断改为固定上限型配额逻辑
- 明确新词配额计入规则与已掌握词不计名额
- 学习配置改为仅保留每日上限参数
