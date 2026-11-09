/**
 * sample-form-designer-vue Vite 开发与构建配置。
 *
 * 固定分配端口 3012。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3012,
  },
});
