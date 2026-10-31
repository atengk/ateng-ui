/**
 * @atengk/monitor tsup 构建配置。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  tsconfig: './tsconfig.build.json',
});
