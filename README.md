# UTools-Qwerty-Learner

本插件(UTools-Qwerty-Learner)为UTools平台下专用插件，基于Qwerty-Learner项目修改移植并进行二次开发而来。

主要新增功能：

1. 摸鱼模式，为用户提供额外的进入入口，此模式下程序可自定义整体透明。
2. 沉浸模式，开启此模式后，不显示练习过程中无关的组件。
3. 词典错题记录，可为每个词典开启错题的记录，并在章节练习结束后自动同步章节的错词。
4. 自定义词典导入（支持Json和Excel表格），程序中提供模板方便用户进行修改导入。

## 故障修复

### 2026-02-13 修复构建后插件闪退及无法打开问题

**问题**：构建后在 uTools 中打开插件时，出现闪退或无法打开的情况。

**原因**：
1. **模块冲突**：`src/index.tsx` 中直接导入 Node.js 的 `process` 模块，导致浏览器环境运行时错误。
2. **配置缺失**：`plugin.json` 缺少 `main` 入口配置，导致 uTools 无法加载页面。
3. **预加载脚本错误**：`package.json` 中的 `utools` 命令指向了错误的 `preload.js` 路径，且 `preload.js` 未向全局暴露 `process` 对象。

**解决方案**：
1. **代码修复**：移除 `src/index.tsx` 对 `process` 模块的直接引用，改用 Vite 原生的 `import.meta.env` 获取环境变量。
2. **完善配置**：在 `plugin.json` 中添加 `"main": "index.html"` 配置。
3. **脚本优化**：修正 `package.json` 中的文件同步命令，确保 `public/preload.js` 正确复制到 `build/preload.js`。
4. **环境补全**：在 `preload.js` 中向 `window` 对象暴露 `process`，以保证第三方库（如 `react-tooltip`）的兼容性。

**验证**：运行 `npm run build` 和 `npm run utools` 后，插件在 uTools 中可正常打开，无闪退现象。

## 项目维护与优化

### 2026-02-13 项目精简与 uTools 平台专注化

**目标**：移除项目中仅用于 Web/GitHub Pages 平台的无效资源、冗余代码和依赖，使项目专注于 uTools 插件开发。

**操作内容**：
1. **清理环境变量**：删除了 `REACT_APP_DEPLOY_ENV` 及其相关的条件判断逻辑，简化了资源路径处理。
2. **移除无效资源**：删除了 `public` 目录下的 `404.html`、`manifest.json`、`robots.txt` 以及 PWA 相关图标，减少了构建体积。
3. **简化代码逻辑**：
    - 移除了 `index.tsx` 中的路由 `basename`。
    - 删除了多处 `if (window.utools)` 的冗余判断，将代码逻辑直接绑定到 uTools 环境。
4. **依赖与脚本瘦身**：
    - 移除了 `react-app-polyfill` 等 Web 平台兼容性依赖。
    - 清理了 `package.json` 中的冗余脚本（如 `utools-dev`）和开发依赖。
5. **文档同步**：同步更新了修改记录，确保开发文档与实际代码状态一致。

**效果**：项目结构更加清晰，构建产物更加精简，开发环境完全适配 uTools。

### 2026-02-13 移除指法图示功能

**目标**：根据需求，移除项目中不再需要的指法图示相关逻辑和资源。

**操作内容**：
1. **移除组件**：删除了 `HandPositionIllustration` 组件目录及其相关文件。
2. **清理资源**：删除了指法图示图片 `standard_typing_hand_position.png`。
3. **更新入口**：修改了 `Switcher` 组件，移除了对指法图示组件的引用和渲染。

**效果**：精简了项目代码和资源，移除了不再需要的功能。
