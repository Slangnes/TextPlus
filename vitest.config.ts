import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'text-summary'],
      exclude: [
        'node_modules/',
        'packages/*/test/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@textplus/core': resolve(__dirname, 'packages/core/src'),
      '@textplus/author': resolve(__dirname, 'packages/author/src'),
      '@textplus/map': resolve(__dirname, 'packages/map/src'),
      '@textplus/convert': resolve(__dirname, 'packages/convert/src')
    }
  }
});
