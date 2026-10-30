/**
 * @atengk/editor-vue 单元测试配置。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

const mockBubbleMenuPath = fileURLToPath(new URL('./test/mocks/bubble-menu.ts', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@tiptap/extension-bubble-menu': mockBubbleMenuPath,
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    server: {
      deps: {
        inline: ['@tiptap/vue-3', '@tiptap/extension-bubble-menu'],
      },
    },
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.{test,spec}.ts'],
  },
});
