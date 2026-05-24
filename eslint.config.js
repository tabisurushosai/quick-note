import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'release/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        __dirname: 'readonly',
        alert: 'readonly',
        chrome: 'readonly',
        confirm: 'readonly',
        document: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        Intl: 'readonly',
      },
    },
  },
);
