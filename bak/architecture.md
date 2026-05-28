# 技术架构

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 4 |
| 状态管理 | Jotai (全局) + React Context (会话) |
| 数据持久化 | Dexie (IndexedDB) + uTools DB |
| 样式 | Tailwind CSS + PostCSS |
| 路由 | React Router (HashRouter) |
| 运行环境 | uTools 插件 |

## 目录结构

```
src/
├── pages/
│   ├── Typing/          # 打字练习页面
│   │   ├── components/  # 组件
│   │   │   ├── WordPanel/     # 单词面板（核心）
│   │   │   ├── ResultScreen/  # 结果页
│   │   │   └── Setting/       # 设置面板
│   │   ├── store/       # TypingContext + reducer
│   │   └── hooks/       # 自定义 hooks
│   ├── Gallery-N/       # 词典库页面
│   └── Analysis/        # 统计分析页面
├── store/               # Jotai atoms（全局状态）
├── resources/           # 词典定义、音效资源
├── utils/
│   └── db/              # Dexie 数据库封装
├── components/          # 公共组件
└── hooks/               # 公共 hooks

public/
├── dicts/               # 词典 JSON 文件
├── preload/             # uTools 预加载脚本
│   └── services.js      # Node.js API 暴露
└── plugin.json          # uTools 插件配置
```

## 状态管理

### 全局状态 (Jotai)

位于 `src/store/index.ts`，使用 `atomWithStorage` 实现持久化：

| Atom | 说明 |
|------|------|
| currentDictIdAtom | 当前词典 ID |
| currentChapterAtom | 当前章节号 |
| pronunciationConfigAtom | 发音设置 |
| keySoundsConfigAtom | 按键音效设置 |
| randomConfigAtom | 随机顺序开关 |
| wordDictationConfigAtom | 默写模式设置 |
| isOpenDarkModeAtom | 深色模式 |

### 会话状态 (React Context)

位于 `src/pages/Typing/store/index.ts`，管理单次练习会话：

```typescript
type TypingState = {
  chapterData: {
    words: WordWithIndex[]  // 章节单词
    index: number           // 当前词索引
    correctCount: number    // 正确次数
    wrongCount: number      // 错误次数
    wrongWordIndexes: number[]   // 错词索引
    correctWordIndexes: number[] // 一次打对的词索引
  }
  timerData: {
    time: number      // 用时(秒)
    accuracy: number  // 正确率
    wpm: number       // 每分钟词数
  }
  isTyping: boolean      // 是否正在练习
  isFinished: boolean    // 是否完成
  isImmersiveMode: boolean // 沉浸模式
}
```

使用 `useImmer` 实现不可变更新。

## 数据持久化

### IndexedDB (Dexie)

```typescript
class RecordDB extends Dexie {
  wordRecords!: Table<IWordRecord, number>
  chapterRecords!: Table<IChapterRecord, number>
}
```

### uTools DB

通过 `public/preload/services.js` 暴露的 API：

| API | 说明 |
|-----|------|
| `window.postDB(id, data)` | 写入数据 |
| `window.getDB(id)` | 读取数据 |
| `window.readLocalDictConfig()` | 读取自定义词典配置 |
| `window.newLocalDictFromJson(json, meta)` | 导入自定义词典 |

## uTools 集成

### 插件配置 (plugin.json)

```json
{
  "features": [
    { "code": "typing", "cmds": ["English", "typing", "tp"] },
    { "code": "conceal", "cmds": ["moyu", "moyv"] }
  ]
}
```

### 模式检测

```typescript
// preload.js
window.getMode = () => currentMode // 'typing' | 'conceal' | 'moyu'
```

### 透明窗口

摸鱼模式通过 `utools.createBrowserWindow` 创建透明窗口：

```typescript
const moyuWindowOptions = {
  transparent: true,
  backgroundColor: '#00000000',
  frame: false,
  alwaysOnTop: true
}
```

## 构建流程

```bash
npm run build    # Vite 构建到 ./build
npm run utools   # 复制 preload.js 和 plugin.json
```