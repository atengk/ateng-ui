import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

const MANUAL_CHUNK_RULES: ReadonlyArray<readonly [chunk: string, patterns: readonly string[]]> = [
  ['vue-vendor', ['/node_modules/vue-router/', '/node_modules/@vue/', '/node_modules/vue/']],
  ['element-plus-icons', ['/node_modules/@element-plus/icons-vue']],
  [
    'element-plus-data',
    [
      '/node_modules/element-plus/es/components/table',
      '/node_modules/element-plus/es/components/pagination',
      '/node_modules/element-plus/es/components/tree',
      '/node_modules/element-plus/es/components/select',
    ],
  ],
  [
    'element-plus-form',
    [
      '/node_modules/element-plus/es/components/date-picker',
      '/node_modules/element-plus/es/components/time-picker',
      '/node_modules/element-plus/es/components/form',
      '/node_modules/element-plus/es/components/input',
      '/node_modules/element-plus/es/components/upload',
      '/node_modules/element-plus/es/components/color-picker',
      '/node_modules/element-plus/es/components/cascader',
      '/node_modules/element-plus/es/components/slider',
    ],
  ],
  [
    'element-plus-core',
    [
      '/node_modules/element-plus',
      '/node_modules/@ctrl/',
      '/node_modules/lodash-unified',
      '/node_modules/@popperjs/',
      '/node_modules/dayjs',
      '/node_modules/async-validator',
    ],
  ],
  ['ateng-ui', ['/packages/element-plus/', '/packages/vue/', '/packages/core/']],
];

function resolveManualChunk(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/');
  for (const [chunkName, patterns] of MANUAL_CHUNK_RULES) {
    if (patterns.some(pattern => normalized.includes(pattern))) {
      return chunkName;
    }
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT) || 3003;

  return {
    plugins: [vue()],
    server: {
      port,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
  };
});
