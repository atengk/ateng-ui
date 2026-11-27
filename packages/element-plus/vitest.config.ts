/**
 * @atengk/element-plus 单元测试配置。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

export default defineConfig({
  define: {
    __ATENG_ELEMENT_PLUS_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*.{test,spec}.ts'],
  },
});
