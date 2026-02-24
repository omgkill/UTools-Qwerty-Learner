/** @type {import("eslint").ESLint.ConfigData} */
// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  extends: ['prettier'],
  ignorePatterns: ['build'],
  overrides: [
    {
      files: ['scripts/*.cjs', '.eslintrc.cjs'],
      env: { node: true },
      extends: ['eslint:recommended'],
      parser: 'espree',
      parserOptions: { sourceType: 'script' },
    },
    {
      files: ['vite.config.ts'],
      env: { node: true },
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
    },
    {
      files: ['src/**/*.ts', 'src/**/*.tsx', 'test/**/*.ts', 'test/**/*.tsx'],
      env: { browser: true },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react/jsx-runtime',
        'plugin:@typescript-eslint/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['react', '@typescript-eslint'],
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    {
      // 测试文件：添加 vitest 全局变量，避免 describe/it/expect/vi 被报未定义
      files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/test/**/*.ts'],
      env: {
        browser: true,
        'vitest/globals': true,
      },
      plugins: ['vitest'],
      rules: {
        'vitest/no-disabled-tests': 'warn',
        'vitest/no-focused-tests': 'error',
      },
    },
  ],
  rules: {
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    '@typescript-eslint/consistent-type-imports': 1,
  },
}
