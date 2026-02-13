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
