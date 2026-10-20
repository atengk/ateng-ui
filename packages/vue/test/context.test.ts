/* eslint-disable vue/one-component-per-file */
/**
 * 全局上下文与插件安装机制单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import { http, type HttpClient } from '@atengk/core';
import { createAtengVue, provideAtengConfig, useAtengConfig, ATENG_VUE_CONFIG_KEY } from '../src';

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
    expect(config.defaultPageSize).toBe(10);
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
      defaultPageSize: 20,
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
    expect(config.defaultPageSize).toBe(20);
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
        provideAtengConfig({ defaultPageSize: 50 });
        return () => h('div', [h(GrandChildComp)]);
      },
    });

    const RootComp = defineComponent({
      setup() {
        provideAtengConfig({ defaultPageSize: 30 });
        return () => h('div', [h(ChildComp)]);
      },
    });

    const app = createApp(RootComp);
    const root = document.createElement('div');
    app.mount(root);

    expect(parentConfig.defaultPageSize).toBe(30);
    expect(childConfig.defaultPageSize).toBe(50);
    // 未覆盖的属性继承默认值
    expect(childConfig.httpClient).toBe(http);

    app.unmount();
  });

  it('should expose ATENG_VUE_CONFIG_KEY symbol', () => {
    expect(typeof ATENG_VUE_CONFIG_KEY).toBe('symbol');
  });
});
