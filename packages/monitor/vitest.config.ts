/**
 * @atengk/monitor 单元测试配置。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*.{test,spec}.ts'],
  },
});
