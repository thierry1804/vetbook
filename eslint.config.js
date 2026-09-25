import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['frontend/dist', 'frontend/vendor', 'frontend/icons/source', '**/node_modules'] },
  {
    ...js.configs.recommended,
    files: ['frontend/app.js', 'frontend/sw.js', 'frontend/data-layer.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.serviceworker, qrcode: 'readonly' },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    ...js.configs.recommended,
    files: ['backend/api/**/*.js', 'backend/server.js', 'backend/scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
];
