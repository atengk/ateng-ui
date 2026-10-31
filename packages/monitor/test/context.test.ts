/**
 * ContextStore 上下文状态存储单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createContextStore } from '../src/core/ContextStore';

describe('ContextStore', () => {
  let store: ReturnType<typeof createContextStore>;

  beforeEach(() => {
    store = createContextStore({
      appVersion: '2.5.0',
      environment: 'uat',
      sessionId: 'test-session-123',
      tenantId: 'tenant-alpha',
    });
  });

  it('应当正确初始化静态元数据与配置', () => {
    const ctx = store.getContext();
    expect(ctx.appVersion).toBe('2.5.0');
    expect(ctx.environment).toBe('uat');
    expect(ctx.sessionId).toBe('test-session-123');
    expect(ctx.tenantId).toBe('tenant-alpha');
    expect(ctx.user).toBeUndefined();
    expect(ctx.tags).toEqual({});
    expect(ctx.extra).toEqual({});
  });

  it('应当支持动态设置、更新与清空用户信息，并保持对象不可变防污染', () => {
    const userPayload = { id: 'u-100', name: 'Ateng', role: 'admin' };
    store.setUser(userPayload);

    let ctx = store.getContext();
    expect(ctx.user).toEqual({ id: 'u-100', name: 'Ateng', role: 'admin' });

    // 验证防御性克隆：外部就地篡改原对象不影响 store
    userPayload.name = 'Hacked';
    ctx = store.getContext();
    expect(ctx.user?.name).toBe('Ateng');

    // 验证清空
    store.setUser(undefined);
    expect(store.getContext().user).toBeUndefined();
  });

  it('应当支持设置租户 ID', () => {
    store.setTenant('tenant-beta');
    expect(store.getContext().tenantId).toBe('tenant-beta');

    store.setTenant(undefined);
    expect(store.getContext().tenantId).toBeUndefined();
  });

  it('应当支持单项与批量设置自定义 Tags', () => {
    store.setTag('module', 'order');
    store.setTags({ region: 'cn-north', cluster: 'k8s-01' });

    const ctx = store.getContext();
    expect(ctx.tags).toEqual({
      module: 'order',
      region: 'cn-north',
      cluster: 'k8s-01',
    });
  });

  it('应当支持设置 Extra 附加数据', () => {
    store.setExtra('routeParams', { id: '998', tab: 'detail' });
    expect(store.getContext().extra.routeParams).toEqual({ id: '998', tab: 'detail' });
  });

  it('应当通过 getSnapshot 生成包含环境、视口与 URL 的完整快照', () => {
    store.setUser({ id: 'u-100' });
    store.setTag('env_type', 'browser');

    const snapshot = store.getSnapshot();
    expect(snapshot.appVersion).toBe('2.5.0');
    expect(snapshot.user?.id).toBe('u-100');
    expect(snapshot.tags.env_type).toBe('browser');
    expect(snapshot.device).toBeDefined();
    expect(typeof snapshot.device.viewport.width).toBe('number');
    expect(typeof snapshot.device.online).toBe('boolean');
    expect(typeof snapshot.url).toBe('string');
  });

  it('应当支持 reset 重置为初始状态', () => {
    store.setUser({ id: 'temp-user' });
    store.setTag('foo', 'bar');
    store.setExtra('baz', 123);

    store.reset();
    const ctx = store.getContext();
    expect(ctx.user).toBeUndefined();
    expect(ctx.tags).toEqual({});
    expect(ctx.extra).toEqual({});
    expect(ctx.appVersion).toBe('2.5.0');
  });
});
