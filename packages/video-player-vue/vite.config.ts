/**
 * @atengk/video-player-vue Vite 库模式双模构建配置。
 *
 * 依据 ADR-0031，输出 ESM、CJS、DTS 与统一全局样式产物 dist/index.css。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: './tsconfig.json',
      outDir: 'dist',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'plugins/danmaku/index': resolve(__dirname, 'src/plugins/danmaku/index.ts'),
      },
      name: 'AtengVideoPlayerVue',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue', '@atengk/core', '@atengk/vue', 'artplayer'],
      output: {
        exports: 'named',
        assetFileNames: assetInfo => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'index.css';
          }
          return assetInfo.name ?? 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
