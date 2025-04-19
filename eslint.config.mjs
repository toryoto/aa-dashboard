// eslint.config.mjs
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

// 共通ルール
const commonRules = {
  'no-var': 'error',
  'prefer-const': 'error',
  // 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'no-console': 'off',
  semi: ['error', 'never'],
  quotes: ['error', 'single', { avoidEscape: true }],
  // 'comma-dangle': ['error', 'never'],
  'arrow-parens': 'off',
  'brace-style': ['error', '1tbs'],
  indent: 'off',
  'max-len': ['warn', { code: 100, ignoreUrls: true }],
}

const baseConfig = {
  files: ['**/*.{js,ts}'],
  ignores: ['aa-front/.next/**', 'aa-front/.next', '**/node_modules/**'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: commonRules,
}

const backendConfig = {
  ...baseConfig,
  files: ['api/**/*.{js,ts}'],
  languageOptions: {
    ...baseConfig.languageOptions,
    globals: {
      process: 'readonly',
    },
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
}

const frontendConfigs = [
  {
    ...baseConfig,
    files: ['aa-front/**/*.{js,jsx,ts,tsx}'],
    ignores: ['aa-front/.next/**', 'aa-front/.next', 'aa-front/app/components/ui/**'],
    languageOptions: {
      ...baseConfig.languageOptions,
      globals: {
        document: 'readonly',
        window: 'readonly',
      },
    },
  },
]

try {
  const nextConfigs = compat.extends('next/core-web-vitals').map(config => ({
    ...config,
    files: ['aa-front/**/*.{js,jsx,ts,tsx}'],
    ignores: ['aa-front/.next/**', 'aa-front/.next', 'aa-front/app/components/ui/**'],
  }))
  frontendConfigs.push(...nextConfigs)
} catch (error) {
  console.warn('Next.js設定を読み込めませんでした:', error.message)
}

export default [baseConfig, backendConfig, ...frontendConfigs]
