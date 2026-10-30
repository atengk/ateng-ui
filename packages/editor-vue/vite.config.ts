/**
 * @atengk/editor-vue Vite 库模式双模构建配置。
 *
 * 依据 ADR-0036，输出 ESM、CJS、DTS 与统一全局样式产物 dist/index.css。
 *
 * @author Ateng
 * @since 2026-10-30
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
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AtengEditorVue',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'vue',
        '@atengk/core',
        '@atengk/vue',
        /^@tiptap\/.*/,
        'lowlight',
        'tiptap-markdown',
      ],
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
