# 变更记录

## 2026-02-13

### 修复

- 修复插件无法打开问题
  - 原因：`build/` 目录缺少 `preload.js`
  - 解决：复制 `public/preload/services.js` 到 `build/preload.js`

### 修改

- 修复 Mixpanel 崩溃问题
- 调整窗口透明度控制逻辑

## 历史版本

基于开源项目 [Qwerty-Learner](https://github.com/Kaiyiwing/qwerty-learner) 移植并二次开发。

### 新增功能

1. **摸鱼模式** - 透明悬浮窗口，隐蔽学习
2. **沉浸模式** - 隐藏无关 UI，专注练习
3. **错题记录** - 每个词典独立错题本
4. **自定义词典** - 支持 JSON/Excel 导入