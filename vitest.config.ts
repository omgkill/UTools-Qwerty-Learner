import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 5000,
    hookTimeout: 5000,
    reporters: ['verbose'],
    setupFiles: ['src/test/setup.ts'],
    environmentMatchGlobs: [
      ['src/**/*.component.test.tsx', 'jsdom'],
      ['src/pages/**/*.test.tsx', 'jsdom'],
      ['src/components/**/*.test.tsx', 'jsdom'],
    ],
  },
})
