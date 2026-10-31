/**
 * MonitorKernel 微内核调度与生命周期单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initMonitor,
  getActiveMonitor,
  destroyActiveMonitor,
  MonitorKernel,
} from '../src/core/MonitorKernel';
import type { MonitorPlugin } from '../src/types/plugin';
import type { MonitorEvent } from '../src/types/event';

describe('MonitorKernel', () => {
  beforeEach(async () => {
    await destroyActiveMonitor();
  });

  afterEach(async () => {
    await destroyActiveMonitor();
    vi.restoreAllMocks();
  });

  it('应当正确初始化并具备初始状态', () => {
    const kernel = new MonitorKernel({ appVersion: '3.0.0' });
    expect(kernel.isInitialized).toBe(false);

    kernel.init();
    expect(kernel.isInitialized).toBe(true);
    expect(kernel.contextStore.getContext().appVersion).toBe('3.0.0');
  });

  it('应当支持插件生命周期的注册、执行与注销', () => {
    const setupSpy = vi.fn();
    const teardownSpy = vi.fn();

    const mockPlugin: MonitorPlugin = {
      name: 'mock-plugin',
      setup: setupSpy,
      teardown: teardownSpy,
    };

    const kernel = new MonitorKernel({ plugins: [mockPlugin] });
    expect(setupSpy).not.toHaveBeenCalled();

    kernel.init();
    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy).toHaveBeenCalledWith(kernel);
    expect(kernel.getPlugin('mock-plugin')).toBe(mockPlugin);

    // 动态注销
    kernel.unregisterPlugin('mock-plugin');
    expect(teardownSpy).toHaveBeenCalledTimes(1);
    expect(kernel.getPlugin('mock-plugin')).toBeUndefined();
  });

  it('在内核初始化后动态注册插件应当立即触发 setup', () => {
    const kernel = new MonitorKernel();
    kernel.init();

    const dynamicSetup = vi.fn();
    const dynamicPlugin: MonitorPlugin = {
      name: 'dynamic',
      setup: dynamicSetup,
    };

    kernel.registerPlugin(dynamicPlugin);
    expect(dynamicSetup).toHaveBeenCalledTimes(1);
  });

  it('destroy 应当逆序销毁所有插件并重置状态', async () => {
    const order: string[] = [];

    const pluginA: MonitorPlugin = {
      name: 'plugin-a',
      setup: vi.fn(),
      teardown: () => {
        order.push('A');
      },
    };

    const pluginB: MonitorPlugin = {
      name: 'plugin-b',
      setup: vi.fn(),
      teardown: () => {
        order.push('B');
      },
    };

    const kernel = new MonitorKernel({ plugins: [pluginA, pluginB] });
    kernel.init();

    await kernel.destroy();
    expect(kernel.isInitialized).toBe(false);
    expect(order).toEqual(['B', 'A']); // 逆序卸载
    expect(kernel.getPlugin('plugin-a')).toBeUndefined();
  });

  it('emit 应当自动富化 ID、时间戳和当前上下文快照，并交付 reporter', () => {
    const reporterSpy = vi.fn();
    const kernel = new MonitorKernel({
      appVersion: '1.2.3',
      reporter: reporterSpy,
    });
    kernel.init();

    kernel.contextStore.setUser({ id: 'u-99', name: 'Tester' });

    kernel.emit({
      type: 'error',
      level: 'error',
      payload: { message: 'Something went wrong' },
    });

    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const events: MonitorEvent[] = reporterSpy.mock.calls[0][0];
    expect(events.length).toBe(1);

    const event = events[0];
    expect(event.id).toBeDefined();
    expect(typeof event.id).toBe('string');
    expect(typeof event.timestamp).toBe('number');
    expect(event.type).toBe('error');
    expect(event.level).toBe('error');
    expect(event.context.appVersion).toBe('1.2.3');
    expect(event.context.user?.name).toBe('Tester');
    expect(event.context.device).toBeDefined();
  });

  it('beforeSend 钩子应当能够修改事件数据，或返回 false 予以丢弃', () => {
    const reporterSpy = vi.fn();
    const kernel = new MonitorKernel({
      reporter: reporterSpy,
      beforeSend: event => {
        if (event.level === 'warn') {
          return false; // 丢弃警告级别事件
        }
        if (event.type === 'custom') {
          (event.payload as { modified?: boolean }).modified = true;
        }
        return event;
      },
    });
    kernel.init();

    // 1. 丢弃测试
    kernel.emit({
      type: 'custom',
      level: 'warn',
      payload: { text: 'ignored' },
    });
    expect(reporterSpy).not.toHaveBeenCalled();

    // 2. 修改测试
    kernel.emit({
      type: 'custom',
      level: 'info',
      payload: { text: 'allowed' },
    });
    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const event = reporterSpy.mock.calls[0][0][0];
    expect(event.payload.modified).toBe(true);
  });

  it('captureException 应当规范化提取 Error 对象与自定义属性', () => {
    const reporterSpy = vi.fn();
    const kernel = new MonitorKernel({ reporter: reporterSpy });
    kernel.init();

    // 1. 标准 Error 对象
    const err = new TypeError('Cannot read properties of undefined');
    kernel.captureException(err, { category: 'js' });

    const event1 = reporterSpy.mock.calls[0][0][0];
    expect(event1.type).toBe('error');
    expect(event1.payload.category).toBe('js');
    expect(event1.payload.name).toBe('TypeError');
    expect(event1.payload.message).toBe('Cannot read properties of undefined');
    expect(event1.payload.stack).toBeDefined();

    // 2. 纯字符串抛错
    kernel.captureException('Custom string error message');
    const event2 = reporterSpy.mock.calls[1][0][0];
    expect(event2.payload.message).toBe('Custom string error message');
  });

  it('captureMessage 应当正确构造 custom 类型的消息事件', () => {
    const reporterSpy = vi.fn();
    const kernel = new MonitorKernel({ reporter: reporterSpy });
    kernel.init();

    kernel.captureMessage('User clicked checkout button', 'info', {
      cartId: 'c-101',
      total: 99.8,
    });

    const event = reporterSpy.mock.calls[0][0][0];
    expect(event.type).toBe('custom');
    expect(event.level).toBe('info');
    expect(event.payload.message).toBe('User clicked checkout button');
    expect(event.payload.extra.cartId).toBe('c-101');
  });

  it('全局单例门面 initMonitor、getActiveMonitor 与 destroyActiveMonitor 应当协同正常', async () => {
    expect(getActiveMonitor()).toBeUndefined();

    const monitor = initMonitor({ appVersion: '9.0.0' });
    expect(getActiveMonitor()).toBe(monitor);
    expect(monitor.isInitialized).toBe(true);

    await destroyActiveMonitor();
    expect(getActiveMonitor()).toBeUndefined();
    expect(monitor.isInitialized).toBe(false);
  });
});
