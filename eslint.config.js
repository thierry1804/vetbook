import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'vendor', 'icons/source'] },
  {
    ...js.configs.recommended,
    files: ['app.js', 'sw.js', 'data-layer.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.serviceworker, qrcode: 'readonly', supabaseSdk: 'readonly' },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
];
