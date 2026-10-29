/**
 * @atengk/code-editor-vue 单元测试配置。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.{test,spec}.ts'],
  },
});
