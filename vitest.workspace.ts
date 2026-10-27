import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'core',
      root: './packages/core',
      environment: 'node',
      include: ['test/**/*.{test,spec}.ts'],
    },
  },
  {
    test: {
      name: 'vue',
      root: './packages/vue',
      environment: 'happy-dom',
      include: ['test/**/*.{test,spec}.ts'],
    },
  },
  {
    test: {
      name: 'element-plus',
      root: './packages/element-plus',
      environment: 'happy-dom',
      include: ['test/**/*.{test,spec}.ts'],
    },
  },
  {
    test: {
      name: 'file-viewer-vue',
      root: './packages/file-viewer-vue',
      environment: 'happy-dom',
      include: ['test/**/*.{test,spec}.ts'],
    },
  },
  {
    test: {
      name: 'video-player-vue',
      root: './packages/video-player-vue',
      environment: 'happy-dom',
      include: ['test/**/*.{test,spec}.ts'],
    },
  },
]);
