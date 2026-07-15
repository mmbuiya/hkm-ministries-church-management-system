import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['services/**/*.ts', 'hooks/**/*.ts', 'components/**/*.tsx', 'App.tsx'],
      exclude: ['**/*.test.*', '**/*.spec.*', 'node_modules', 'dist'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
