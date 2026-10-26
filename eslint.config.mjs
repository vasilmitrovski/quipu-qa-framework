import tseslint from 'typescript-eslint';

// Enforces the layer dependency rule: core <- api <- web, and tests only use fixtures/public helpers.
export default tseslint.config(
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'reports/'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@api/*', '@web/*', '**/api/**', '**/web/**'], message: 'core must not depend on api or web.' },
      ] }],
    },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@web/*', '**/web/**'], message: 'api must not depend on web.' },
      ] }],
    },
  },
  {
    files: ['tests/api/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@web/*'], message: 'API tests must stay runnable without browser code.' },
      ] }],
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // Playwright fixtures use `async ({}, use) => ...` by design.
      'no-empty-pattern': 'off',
    },
  },
);
