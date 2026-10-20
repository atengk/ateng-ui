/**
 * @atengk/vue 顶层纯声明式导出基线测试。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { describe, it, expect } from 'vitest';
import * as VueModule from '../src/index';

describe('@atengk/vue 顶级具名导出收敛', () => {
  it('应正确导出模块基线版本标识', () => {
    expect(VueModule.VERSION).toBe('0.1.0');
  });

  it('应纯声明式导出全部 10 大核心 Composables', () => {
    const requiredComposables = [
      VueModule.useRequest,
      VueModule.usePagination,
      VueModule.useLatest,
      VueModule.useAuth,
      VueModule.useTenant,
      VueModule.useIdempotent,
      VueModule.useExcel,
      VueModule.useUpload,
      VueModule.useStream,
      VueModule.useWebSocket,
    ];

    for (const fn of requiredComposables) {
      expect(typeof fn).toBe('function');
    }
  });

  it('应纯声明式导出全局配置与插件安装器', () => {
    const contextUtilities = [
      VueModule.createAtengVue,
      VueModule.provideAtengConfig,
      VueModule.useAtengConfig,
    ];

    for (const fn of contextUtilities) {
      expect(typeof fn).toBe('function');
    }
    expect(VueModule.ATENG_VUE_CONFIG_KEY).toBeDefined();
  });

  it('应纯声明式导出受管原生微工具', () => {
    const runtimeTools = [
      VueModule.tryOnScopeDispose,
      VueModule.useEventListener,
      VueModule.useDebounceFn,
      VueModule.useThrottleFn,
    ];

    for (const fn of runtimeTools) {
      expect(typeof fn).toBe('function');
    }
  });
});
