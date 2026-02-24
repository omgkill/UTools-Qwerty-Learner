import react from '@vitejs/plugin-react'
import { promises as fs } from 'fs'
import { getLastCommit } from 'git-last-commit'
import jotaiDebugLabel from 'jotai/babel/plugin-debug-label'
import jotaiReactRefresh from 'jotai/babel/plugin-react-refresh'
import path from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'

export default defineConfig(async () => {
  const latestCommitHash = await new Promise<string>((resolve) => {
    return getLastCommit((err, commit) => (err ? resolve('unknown') : resolve(commit.shortHash)))
  })
  return {
    plugins: [
      react({ babel: { plugins: [jotaiDebugLabel, jotaiReactRefresh] } }),
      // 只在 ANALYZE=true 时生成产物分析报告，避免每次构建都输出 stats.html
      process.env.ANALYZE === 'true' && (visualizer() as PluginOption),
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        customCollections: {
          'my-icons': {
            xiaohongshu: () => fs.readFile('./src/assets/xiaohongshu.svg', 'utf-8'),
          },
        },
      }),
    ],
    build: {
      minify: true,
      outDir: 'build',
      // 生产构建不生成 sourcemap（减小产物体积）；本地调试可设 VITE_SOURCEMAP=true
      sourcemap: process.env.VITE_SOURCEMAP === 'true',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-jotai': ['jotai'],
            'vendor-ui': [
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-slider',
              '@headlessui/react',
              'react-toastify',
              'react-tooltip',
            ],
            'vendor-echarts': ['echarts'],
            'vendor-dexie': ['dexie', 'dexie-react-hooks', 'dexie-export-import'],
            'vendor-misc': ['dayjs', 'immer', 'use-immer', 'classnames', 'mixpanel-browser', 'swr'],
          },
        },
      },
    },
    define: {
      LATEST_COMMIT_HASH: JSON.stringify(latestCommitHash + (process.env.NODE_ENV === 'production' ? '' : ' (dev)')),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: {
      port: 8080,
    },
  }
})
