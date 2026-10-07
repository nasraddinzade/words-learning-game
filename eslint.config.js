import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'playwright-report', 'test-results', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Pure modules must stay free of React and DOM globals (SPEC §2, §6).
    files: ['src/engine/**/*.ts', 'src/game/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', 'react/*', 'zustand', 'zustand/*', 'dexie'] }],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'performance'],
    },
  },
]);
