/**
 * 全局上下文与插件安装机制单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import {
  http,
  authManager,
  createAuthManager,
  MemoryAuthStorage,
  type HttpClient,
} from '@atengk/core';
import {
  createAtengVue,
  provideAtengConfig,
  resolveAtengConfig,
  useAtengConfig,
  ATENG_VUE_CONFIG_KEY,
} from '../src';

describe('context & plugin', () => {
  it('should return default configuration when no provider or plugin is registered', () => {
    let config!: ReturnType<typeof useAtengConfig>;

    const app = createApp({
      setup() {
        config = useAtengConfig();
        return () => h('div');
      },
    });

    const root = document.createElement('div');
    app.mount(root);

    expect(config).toBeDefined();
    expect(config.httpClient).toBe(http);
    expect(config.defaultSize).toBe(10);
    expect(config.autoConnectStream).toBe(true);
    expect(config.autoConnectWebSocket).toBe(true);

    app.unmount();
  });

  it('should apply custom options via createAtengVue plugin', () => {
    let config!: ReturnType<typeof useAtengConfig>;
    const customClient = { custom: true } as unknown as HttpClient;
    const customOnError = () => {};

    const plugin = createAtengVue({
      httpClient: customClient,
      defaultSize: 20,
      onError: customOnError,
      autoConnectStream: false,
      autoConnectWebSocket: false,
    });

    const app = createApp({
      setup() {
        config = useAtengConfig();
        return () => h('div');
      },
    });

    app.use(plugin);

    const root = document.createElement('div');
    app.mount(root);

    expect(config.httpClient).toBe(customClient);
    expect(config.defaultSize).toBe(20);
    expect(config.onError).toBe(customOnError);
    expect(config.autoConnectStream).toBe(false);
    expect(config.autoConnectWebSocket).toBe(false);

    app.unmount();
  });

  it('should allow overriding configuration locally via provideAtengConfig in component tree', () => {
    let parentConfig!: ReturnType<typeof useAtengConfig>;
    let childConfig!: ReturnType<typeof useAtengConfig>;

    const GrandChildComp = defineComponent({
      setup() {
        childConfig = useAtengConfig();
        return () => h('span', 'grandchild');
      },
    });

    const ChildComp = defineComponent({
      setup() {
        parentConfig = useAtengConfig();
        provideAtengConfig({ defaultSize: 50 });
        return () => h('div', [h(GrandChildComp)]);
      },
    });

    const RootComp = defineComponent({
      setup() {
        provideAtengConfig({ defaultSize: 30 });
        return () => h('div', [h(ChildComp)]);
      },
    });

    const app = createApp(RootComp);
    const root = document.createElement('div');
    app.mount(root);

    expect(parentConfig.defaultSize).toBe(30);
    expect(childConfig.defaultSize).toBe(50);
    // 未覆盖的属性继承默认值
    expect(childConfig.httpClient).toBe(http);

    app.unmount();
  });

  it('should expose ATENG_VUE_CONFIG_KEY symbol', () => {
    expect(typeof ATENG_VUE_CONFIG_KEY).toBe('symbol');
  });

  it('should resolve config from provides map and prototype chain via resolveAtengConfig', () => {
    // 1. 空入参安全回退默认值
    const fallbackConfig = resolveAtengConfig();
    expect(fallbackConfig.authManager).toBe(authManager);
    expect(fallbackConfig.defaultSize).toBe(10);

    // 2. 从模拟原型链式 provides 解析（覆盖子树 provideAtengConfig 与 appContext.provides 继承）
    const appAuthManager = createAuthManager({
      tokenKey: 'app-token',
      storage: new MemoryAuthStorage(),
    });
    const subtreeAuthManager = createAuthManager({
      tokenKey: 'subtree-token',
      storage: new MemoryAuthStorage(),
    });

    const appProvides: Record<PropertyKey, unknown> = {
      [ATENG_VUE_CONFIG_KEY as symbol]: {
        authManager: appAuthManager,
        defaultSize: 20,
      },
    };
    const parentProvides = Object.create(appProvides) as Record<PropertyKey, unknown>;
    parentProvides[ATENG_VUE_CONFIG_KEY as symbol] = {
      authManager: subtreeAuthManager,
    };
    const childProvides = Object.create(parentProvides) as Record<PropertyKey, unknown>;

    const resolvedFromApp = resolveAtengConfig(appProvides);
    expect(resolvedFromApp.authManager).toBe(appAuthManager);
    expect(resolvedFromApp.defaultSize).toBe(20);

    const resolvedFromSubtree = resolveAtengConfig(childProvides);
    expect(resolvedFromSubtree.authManager).toBe(subtreeAuthManager);
    expect(resolvedFromSubtree.httpClient).toBe(http);
  });
});
