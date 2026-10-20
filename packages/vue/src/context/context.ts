/**
 * 全局配置注入、上下文解析与 Vue 插件安装门面。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { getCurrentInstance, inject, provide, type App, type InjectionKey, type Plugin } from 'vue';
import { http, authManager, tenantManager } from '@atengk/core';
import type { AtengVueContext, AtengVueOptions } from './types';

/**
 * 全局配置注入 Symbol 标识。
 */
export const ATENG_VUE_CONFIG_KEY: InjectionKey<AtengVueOptions> = Symbol('ATENG_VUE_CONFIG_KEY');

/**
 * 默认工业级基线配置对象。
 */
const DEFAULT_OPTIONS: AtengVueContext = {
  httpClient: http,
  authManager,
  tenantManager,
  defaultPageSize: 10,
  autoConnectStream: true,
  autoConnectWebSocket: true,
};

/**
 * 在当前组件作用域或子树中提供局部配置。
 *
 * @param options 局部配置选项
 */
export function provideAtengConfig(options: AtengVueOptions): void {
  const parentOptions = getCurrentInstance() ? inject(ATENG_VUE_CONFIG_KEY, null) : null;
  const mergedOptions: AtengVueOptions = {
    ...(parentOptions || {}),
    ...options,
  };
  provide(ATENG_VUE_CONFIG_KEY, mergedOptions);
}

/**
 * 获取当前生效的 @atengk/vue 配置上下文。
 *
 * 若上层未注册任何插件或 Provide，自动透明降级至 @atengk/core 全局单例与基线默认值。
 *
 * @returns 完整的配置上下文
 */
export function useAtengConfig(): AtengVueContext {
  if (!getCurrentInstance()) {
    return DEFAULT_OPTIONS;
  }

  const injected = inject(ATENG_VUE_CONFIG_KEY, null);

  if (!injected) {
    return DEFAULT_OPTIONS;
  }

  return {
    httpClient: injected.httpClient ?? DEFAULT_OPTIONS.httpClient,
    authManager: injected.authManager ?? DEFAULT_OPTIONS.authManager,
    tenantManager: injected.tenantManager ?? DEFAULT_OPTIONS.tenantManager,
    defaultPageSize: injected.defaultPageSize ?? DEFAULT_OPTIONS.defaultPageSize,
    onError: injected.onError,
    autoConnectStream: injected.autoConnectStream ?? DEFAULT_OPTIONS.autoConnectStream,
    autoConnectWebSocket: injected.autoConnectWebSocket ?? DEFAULT_OPTIONS.autoConnectWebSocket,
  };
}

/**
 * 创建 @atengk/vue 全局插件安装器。
 *
 * @param options 全局配置选项
 * @returns Vue 插件对象
 */
export function createAtengVue(options?: AtengVueOptions): Plugin {
  return {
    install(app: App): void {
      app.provide(ATENG_VUE_CONFIG_KEY, options || {});
    },
  };
}
