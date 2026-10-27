/**
 * @atengk/flow-vue 单元测试配置。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*.{test,spec}.ts'],
  },
});
