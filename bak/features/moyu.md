# 摸鱼模式与沉浸模式

## 摸鱼模式

透明悬浮窗口，上班摸鱼学单词。

### 入口

- uTools 搜索：`moyu` / `moyv` / `typing-摸鱼模式`
- 代码：`plugin.json` → `features.conceal`

### 实现

```typescript
// preload/services.js
const moyuWindowOptions = {
  transparent: true,
  backgroundColor: '#00000000',
  frame: false,          // 无边框
  alwaysOnTop: true,     // 始终置顶
  resizable: true
}

utools.createBrowserWindow('index.html?mode=moyu', options)
```

### 透明度控制

```typescript
// C# 原生模块
window.setActiveWindowOpacity(opacity) // 0.0 - 1.0
```

需要 `public/preload/csharp/` 下的原生模块支持。

## 沉浸模式

隐藏无关 UI，专注练习。

### 隐藏内容

- 顶部导航栏
- 词典选择器
- 设置按钮
- 统计信息

### 触发方式

| 方式 | 说明 |
|------|------|
| 摸鱼模式 | 自动开启（`mode === 'moyu'`） |
| 手动开启 | 设置面板切换 |

```typescript
// Typing/index.tsx
if (mode === 'conceal' || mode === 'moyu') {
  dispatch({ type: 'TOGGLE_IMMERSIVE_MODE', payload: true })
}
```

## 模式关系

```
摸鱼模式 = 透明窗口 + 自动沉浸模式
沉浸模式 = 隐藏 UI（可独立开启）
```

| 组合 | 透明 | 沉浸 |
|------|------|------|
| 正常模式 | ❌ | ❌ |
| 仅沉浸 | ❌ | ✅ |
| 摸鱼模式 | ✅ | ✅ |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Esc` | 退出摸鱼窗口 |