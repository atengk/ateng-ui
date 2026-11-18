/**
 * 全局配置注入、上下文解析与 Vue 插件安装门面。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import {
  hasInjectionContext,
  inject,
  provide,
  type App,
  type InjectionKey,
  type Plugin,
} from 'vue';
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
  superAdminRoles: ['admin', 'super_admin'],
  defaultSize: 10,
  autoConnectStream: true,
  autoConnectWebSocket: true,
};

/**
 * 在当前组件作用域或子树中提供局部配置。
 *
 * @param options 局部配置选项
 */
export function provideAtengConfig(options: AtengVueOptions): void {
  const parentOptions = hasInjectionContext() ? inject(ATENG_VUE_CONFIG_KEY, null) : null;
  const mergedOptions: AtengVueOptions = {
    ...(parentOptions || {}),
    ...options,
  };
  provide(ATENG_VUE_CONFIG_KEY, mergedOptions);
}

/**
 * 将可选配置规范化为完整的 @atengk/vue 上下文对象。
 */
function normalizeAtengConfig(injected?: AtengVueOptions | null): AtengVueContext {
  if (!injected) {
    return {
      ...DEFAULT_OPTIONS,
      superAdminRoles: [...DEFAULT_OPTIONS.superAdminRoles],
    };
  }

  return {
    httpClient: injected.httpClient ?? DEFAULT_OPTIONS.httpClient,
    authManager: injected.authManager ?? DEFAULT_OPTIONS.authManager,
    tenantManager: injected.tenantManager ?? DEFAULT_OPTIONS.tenantManager,
    superAdminRoles: injected.superAdminRoles
      ? [...injected.superAdminRoles]
      : [...DEFAULT_OPTIONS.superAdminRoles],
    defaultSize: injected.defaultSize ?? DEFAULT_OPTIONS.defaultSize,
    onError: injected.onError,
    autoConnectStream: injected.autoConnectStream ?? DEFAULT_OPTIONS.autoConnectStream,
    autoConnectWebSocket: injected.autoConnectWebSocket ?? DEFAULT_OPTIONS.autoConnectWebSocket,
  };
}

/**
 * 从 Vue 组件实例或 AppContext 的 provides 映射表中直接解析 @atengk/vue 配置上下文。
 *
 * 适用于自定义指令（如 v-permission / v-role）等脱离 setup() 注入上下文的场景；
 * 当 provides 缺失或未注册插件时，自动安全回退至默认基线配置。
 *
 * @param provides Vue 组件实例或应用上下文的 provides 对象
 * @returns 完整的生效配置上下文
 */
export function resolveAtengConfig(
  provides?: Record<PropertyKey, unknown> | null,
): AtengVueContext {
  if (!provides || typeof provides !== 'object') {
    return DEFAULT_OPTIONS;
  }

  const injected = provides[ATENG_VUE_CONFIG_KEY as symbol] as AtengVueOptions | undefined;
  return normalizeAtengConfig(injected);
}

/**
 * 获取当前生效的 @atengk/vue 配置上下文。
 *
 * 若上层未注册任何插件或 Provide，自动透明降级至 @atengk/core 全局单例与基线默认值。
 *
 * @returns 完整的配置上下文
 */
export function useAtengConfig(): AtengVueContext {
  if (!hasInjectionContext()) {
    return DEFAULT_OPTIONS;
  }

  const injected = inject(ATENG_VUE_CONFIG_KEY, null);
  return normalizeAtengConfig(injected);
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
