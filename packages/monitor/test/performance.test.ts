/**
 * PerformancePlugin 性能指标采集与主线程卡顿感知插件单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPerformancePlugin,
  calculateRating,
  extractNavigationMetrics,
} from '../src/plugins/performance';
import { MonitorKernel } from '../src/core/MonitorKernel';
import type { MonitorEvent, PerformancePayload } from '../src/types/event';

// 模拟 PerformanceObserver 实例管理器
type ObserverCallback = (list: { getEntries: () => PerformanceEntry[] }) => void;

interface ExtendedWindow extends Window {
  PerformanceObserver?: unknown;
}

class MockPerformanceObserver {
  public static instances: MockPerformanceObserver[] = [];
  public static supportedEntryTypes: readonly string[] = [
    'paint',
    'largest-contentful-paint',
    'layout-shift',
    'first-input',
    'longtask',
    'navigation',
  ];

  public callback: ObserverCallback;
  public observedOptions: PerformanceObserverInit | null = null;
  public disconnected = false;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockPerformanceObserver.instances.push(this);
  }

  public observe(options: PerformanceObserverInit): void {
    this.observedOptions = options;
  }

  public disconnect(): void {
    this.disconnected = true;
  }

  public trigger(entries: PerformanceEntry[] | Record<string, unknown>[]): void {
    if (!this.disconnected) {
      this.callback({ getEntries: () => entries as PerformanceEntry[] });
    }
  }
}

describe('PerformancePlugin', () => {
  const win = window as unknown as ExtendedWindow;
  const originalPerformanceObserver = win.PerformanceObserver;

  beforeEach(() => {
    vi.useFakeTimers();
    MockPerformanceObserver.instances = [];
    win.PerformanceObserver = MockPerformanceObserver;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    win.PerformanceObserver = originalPerformanceObserver;
    MockPerformanceObserver.instances = [];
  });

  describe('calculateRating 核心指标评级', () => {
    it('FCP 评级判定 (1800ms / 3000ms 阈值)', () => {
      expect(calculateRating('FCP', 1200)).toBe('good');
      expect(calculateRating('FCP', 2200)).toBe('needs-improvement');
      expect(calculateRating('FCP', 3500)).toBe('poor');
    });

    it('LCP 评级判定 (2500ms / 4000ms 阈值)', () => {
      expect(calculateRating('LCP', 2000)).toBe('good');
      expect(calculateRating('LCP', 3200)).toBe('needs-improvement');
      expect(calculateRating('LCP', 4500)).toBe('poor');
    });

    it('CLS 评级判定 (0.1 / 0.25 阈值)', () => {
      expect(calculateRating('CLS', 0.05)).toBe('good');
      expect(calculateRating('CLS', 0.18)).toBe('needs-improvement');
      expect(calculateRating('CLS', 0.3)).toBe('poor');
    });

    it('FID 评级判定 (100ms / 300ms 阈值)', () => {
      expect(calculateRating('FID', 50)).toBe('good');
      expect(calculateRating('FID', 150)).toBe('needs-improvement');
      expect(calculateRating('FID', 350)).toBe('poor');
    });

    it('TTFB 评级判定 (800ms / 1800ms 阈值)', () => {
      expect(calculateRating('TTFB', 400)).toBe('good');
      expect(calculateRating('TTFB', 1200)).toBe('needs-improvement');
      expect(calculateRating('TTFB', 2200)).toBe('poor');
    });

    it('LongTask 与卡顿判定', () => {
      expect(calculateRating('longtask', 80)).toBe('needs-improvement');
      expect(calculateRating('longtask', 250)).toBe('poor');
      expect(calculateRating('jank', 300)).toBe('poor');
    });
  });

  describe('extractNavigationMetrics 导航链路阶段耗时解析', () => {
    it('能够准确解析各项 DNS、TCP、SSL 与渲染阶段', () => {
      const mockNavEntry = {
        name: 'http://localhost:3000/',
        entryType: 'navigation',
        startTime: 0,
        domainLookupStart: 10,
        domainLookupEnd: 30,
        connectStart: 30,
        secureConnectionStart: 40,
        connectEnd: 70,
        requestStart: 70,
        responseStart: 120,
        responseEnd: 180,
        domInteractive: 220,
        domContentLoadedEventEnd: 260,
        loadEventEnd: 350,
      } as unknown as PerformanceNavigationTiming;

      const metrics = extractNavigationMetrics(mockNavEntry);
      expect(metrics).toEqual({
        dns: 20, // 30 - 10
        tcp: 40, // 70 - 30
        ssl: 30, // 70 - 40
        ttfb: 50, // 120 - 70
        download: 60, // 180 - 120
        domParse: 40, // 260 - 220
        domReady: 260, // 260 - 0
        load: 350, // 350 - 0
      });
    });
  });

  describe('PerformancePlugin 插件主流程', () => {
    it('采集并派发 FCP 首次内容绘制指标', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createPerformancePlugin({
        navigation: false,
        longtask: false,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      // 找到 paint 观察器并触发 FCP
      const paintObserver = MockPerformanceObserver.instances.find(
        obs => obs.observedOptions?.type === 'paint',
      );
      expect(paintObserver).toBeDefined();

      paintObserver?.trigger([
        { name: 'first-paint', entryType: 'paint', startTime: 500 },
        { name: 'first-contentful-paint', entryType: 'paint', startTime: 1200 },
      ]);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      const event: MonitorEvent<PerformancePayload> = reporterSpy.mock.calls[0][0][0];

      expect(event.type).toBe('performance');
      expect(event.payload.name).toBe('FCP');
      expect(event.payload.value).toBe(1200);
      expect(event.payload.rating).toBe('good');

      await kernel.destroy();
    });

    it('采集并派发 LCP 最大内容绘制指标', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createPerformancePlugin({
        navigation: false,
        longtask: false,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      const lcpObserver = MockPerformanceObserver.instances.find(
        obs => obs.observedOptions?.type === 'largest-contentful-paint',
      );
      expect(lcpObserver).toBeDefined();

      lcpObserver?.trigger([
        {
          name: '',
          entryType: 'largest-contentful-paint',
          startTime: 2800,
          size: 15000,
          element: null,
        },
      ]);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      const event: MonitorEvent<PerformancePayload> = reporterSpy.mock.calls[0][0][0];

      expect(event.type).toBe('performance');
      expect(event.payload.name).toBe('LCP');
      expect(event.payload.value).toBe(2800);
      expect(event.payload.rating).toBe('needs-improvement');

      await kernel.destroy();
    });

    it('监听 Long Task并在严重卡顿时派发 JANK 性能告警事件', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createPerformancePlugin({
        vitals: false,
        navigation: false,
        longtask: true,
        jankThreshold: 200,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      const longtaskObserver = MockPerformanceObserver.instances.find(
        obs => obs.observedOptions?.type === 'longtask',
      );
      expect(longtaskObserver).toBeDefined();

      // 1. 触发轻量长任务 (80ms，未达 200ms 卡顿阈值)
      longtaskObserver?.trigger([
        {
          name: 'self',
          entryType: 'longtask',
          startTime: 1000,
          duration: 80,
          attribution: [{ name: 'script', entryType: 'task', startTime: 1000, duration: 80 }],
        },
      ]);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      let event: MonitorEvent<PerformancePayload> = reporterSpy.mock.calls[0][0][0];
      expect(event.level).toBe('info');
      expect(event.payload.name).toBe('longtask');
      expect(event.payload.value).toBe(80);

      // 2. 触发重度阻塞主线程任务 (350ms，超过 200ms 卡顿阈值)
      longtaskObserver?.trigger([
        {
          name: 'self',
          entryType: 'longtask',
          startTime: 2000,
          duration: 350,
          attribution: [
            {
              name: 'heavy-calc',
              entryType: 'task',
              startTime: 2000,
              duration: 350,
              containerType: 'iframe',
              containerId: 'sub-frame',
            },
          ],
        },
      ]);

      expect(reporterSpy).toHaveBeenCalledTimes(2);
      event = reporterSpy.mock.calls[1][0][0];
      expect(event.level).toBe('warn');
      expect(event.payload.name).toBe('jank');
      expect(event.payload.value).toBe(350);
      expect(event.payload.rating).toBe('poor');
      expect(event.payload.entry?.attribution).toBeDefined();

      await kernel.destroy();
    });

    it('支持按 sampleRate 采样率进行采集限制', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createPerformancePlugin({
        sampleRate: 0, // 采样率为 0，全部拦截
        navigation: false,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      const paintObserver = MockPerformanceObserver.instances.find(
        obs => obs.observedOptions?.type === 'paint',
      );
      paintObserver?.trigger([
        { name: 'first-contentful-paint', entryType: 'paint', startTime: 1000 },
      ]);

      expect(reporterSpy).not.toHaveBeenCalled();

      await kernel.destroy();
    });

    it('在销毁插件时能够断开所有 PerformanceObserver', async () => {
      const plugin = createPerformancePlugin();
      const kernel = new MonitorKernel({ plugins: [plugin] });
      kernel.init();

      expect(MockPerformanceObserver.instances.length).toBeGreaterThan(0);
      expect(MockPerformanceObserver.instances.every(obs => !obs.disconnected)).toBe(true);

      await kernel.destroy();

      expect(MockPerformanceObserver.instances.every(obs => obs.disconnected)).toBe(true);
    });

    it('采集并派发 FID 与 CLS 指标', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createPerformancePlugin({
        navigation: false,
        longtask: false,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      // 1. FID
      const fidObserver = MockPerformanceObserver.instances.find(
        obs => obs.observedOptions?.type === 'first-input',
      );
      expect(fidObserver).toBeDefined();

      fidObserver?.trigger([
        {
          name: 'click',
          entryType: 'first-input',
          startTime: 1000,
          processingStart: 1080,
          duration: 80,
        },
      ]);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      let event: MonitorEvent<PerformancePayload> = reporterSpy.mock.calls[0][0][0];
      expect(event.payload.name).toBe('FID');
      expect(event.payload.value).toBe(80);
      expect(event.payload.rating).toBe('good');

      // 2. CLS
      const clsObserver = MockPerformanceObserver.instances.find(
        obs => obs.observedOptions?.type === 'layout-shift',
      );
      expect(clsObserver).toBeDefined();

      clsObserver?.trigger([
        { hadRecentInput: false, value: 0.05 },
        { hadRecentInput: true, value: 0.1 }, // 用户主动交互引起的布局变动不计入
        { hadRecentInput: false, value: 0.03 },
      ]);

      // 触发 visibilitychange -> hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(reporterSpy).toHaveBeenCalledTimes(2);
      event = reporterSpy.mock.calls[1][0][0];
      expect(event.payload.name).toBe('CLS');
      expect(event.payload.value).toBe(0.08);
      expect(event.payload.rating).toBe('good');

      await kernel.destroy();
    });

    it('页面加载就绪时采集并派发 Navigation Timing 与 TTFB', async () => {
      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const mockNavEntry = {
        name: 'http://localhost:3000/',
        entryType: 'navigation',
        startTime: 0,
        domainLookupStart: 10,
        domainLookupEnd: 30,
        connectStart: 30,
        connectEnd: 60,
        requestStart: 60,
        responseStart: 100,
        responseEnd: 150,
        domInteractive: 200,
        domContentLoadedEventEnd: 250,
        loadEventEnd: 320,
      } as unknown as PerformanceNavigationTiming;

      vi.spyOn(window.performance, 'getEntriesByType').mockImplementation((type: string) => {
        if (type === 'navigation') {
          return [mockNavEntry];
        }
        return [];
      });

      const plugin = createPerformancePlugin({
        vitals: false,
        longtask: false,
        navigation: true,
      });

      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      // 推进 setTimeout(..., 0)
      await vi.advanceTimersByTimeAsync(10);

      // 应当派发 TTFB 和 navigation 两个指标
      expect(reporterSpy).toHaveBeenCalledTimes(2);
      const ttfbEvent: MonitorEvent<PerformancePayload> = reporterSpy.mock.calls[0][0][0];
      expect(ttfbEvent.payload.name).toBe('TTFB');
      expect(ttfbEvent.payload.value).toBe(40); // 100 - 60

      const navEvent: MonitorEvent<PerformancePayload> = reporterSpy.mock.calls[1][0][0];
      expect(navEvent.payload.name).toBe('navigation');
      expect(navEvent.payload.value).toBe(320);

      await kernel.destroy();
    });

    it('在不支持 PerformanceObserver 环境中安全降级不崩溃', async () => {
      delete win.PerformanceObserver;

      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createPerformancePlugin();

      const kernel = new MonitorKernel({
        reporter: reporterSpy,
        plugins: [plugin],
      });

      expect(() => {
        kernel.init();
      }).not.toThrow();

      await expect(kernel.destroy()).resolves.not.toThrow();
    });
  });
});
