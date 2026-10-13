import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // The server is Node, not a browser. Without this every `process`/`Buffer`
    // reference in server/** was reported as `no-undef`, which is a
    // configuration defect rather than a code defect. `globals.node`
    // REPLACES the browser globals for these files (flat-config merge), so no
    // rule is disabled and no error is suppressed.
    files: ['server/**/*.js', '*.config.js', 'scripts/**/*.js', '*.cjs', '*.mjs'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
    },
  },
])
