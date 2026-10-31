/**
 * Web Vitals、Navigation Timing 与主线程长任务卡顿感知插件 (PerformancePlugin)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { PerformancePayload } from '../types/event';
import type { MonitorKernelInstance, MonitorPlugin } from '../types/plugin';

/** 扩展宿主 Window 接口以安全访问 PerformanceObserver */
interface WindowWithPerformance extends Window {
  PerformanceObserver?: {
    new (callback: (list: { getEntries: () => PerformanceEntry[] }) => void): PerformanceObserver;
    readonly supportedEntryTypes?: readonly string[];
  };
}

/** 原始 LongTask 归因数据接口 */
interface RawTaskAttribution {
  name?: string;
  entryType?: string;
  startTime?: number;
  duration?: number;
  containerType?: string;
  containerSrc?: string;
  containerId?: string;
  containerName?: string;
}

/** 原始 LongTask 条目接口 */
interface RawLongTaskEntry extends PerformanceEntry {
  attribution?: RawTaskAttribution[];
}

/** 原始 LayoutShift 条目接口 */
interface RawLayoutShiftEntry extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
}

/** 原始 FirstInput 条目接口 */
interface RawFirstInputEntry extends PerformanceEntry {
  processingStart?: number;
}

/** 原始 LargestContentfulPaint 条目接口 */
interface RawLargestContentfulPaintEntry extends PerformanceEntry {
  size?: number;
  element?: Element | null;
}

/**
 * 导航链路关键阶段耗时指标实体 (Navigation Timing)。
 */
export interface NavigationMetrics {
  /** DNS 解析耗时 (毫秒) */
  dns: number;
  /** TCP 握手耗时 (毫秒) */
  tcp: number;
  /** SSL/TLS 加密握手耗时 (毫秒) */
  ssl: number;
  /** 首字节网络到达耗时 (毫秒) */
  ttfb: number;
  /** 响应报文内容传输下载耗时 (毫秒) */
  download: number;
  /** DOM 树构建解析耗时 (毫秒) */
  domParse: number;
  /** DOM 就绪时间 (毫秒) */
  domReady: number;
  /** 页面整体完全加载耗时 (毫秒) */
  load: number;
}

/**
 * 主线程长任务归因信息。
 */
export interface LongTaskAttribution {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  containerType?: string;
  containerSrc?: string;
  containerId?: string;
  containerName?: string;
}

/**
 * 性能插件配置选项。
 */
export interface PerformancePluginOptions {
  /** 是否启用 Web Vitals 采集 (FCP, LCP, CLS, FID/INP, TTFB)，默认 true */
  vitals?: boolean;

  /** 是否采集 Navigation Timing 关键链路阶段耗时，默认 true */
  navigation?: boolean;

  /** 是否监听主线程 Long Tasks，默认 true */
  longtask?: boolean;

  /** 触发严重卡顿告警的耗时阈值 (毫秒)，默认 200ms */
  jankThreshold?: number;

  /** 性能事件采样率 (0.0 ~ 1.0)，默认 1.0 (全量采集) */
  sampleRate?: number;
}

/**
 * 根据 Google 官方标准计算各项性能指标的体验评级。
 *
 * @param name 性能指标名称
 * @param value 指标数值
 * @returns 评级 ('good' | 'needs-improvement' | 'poor')
 */
export function calculateRating(
  name: string,
  value: number,
): 'good' | 'needs-improvement' | 'poor' {
  switch (name.toUpperCase()) {
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'FID':
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    case 'INP':
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    case 'NAVIGATION':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'LONGTASK':
      return value < 200 ? 'needs-improvement' : 'poor';
    case 'JANK':
      return 'poor';
    default:
      return 'good';
  }
}

/**
 * 从 PerformanceNavigationTiming 实体中解析各阶段通信与渲染耗时。
 *
 * @param entry 导航条目
 * @returns 阶段耗时集合
 */
export function extractNavigationMetrics(entry: PerformanceNavigationTiming): NavigationMetrics {
  const domainLookupStart = entry.domainLookupStart || 0;
  const domainLookupEnd = entry.domainLookupEnd || 0;
  const connectStart = entry.connectStart || 0;
  const secureConnectionStart =
    typeof entry.secureConnectionStart === 'number' ? entry.secureConnectionStart : 0;
  const connectEnd = entry.connectEnd || 0;
  const requestStart = entry.requestStart || 0;
  const responseStart = entry.responseStart || 0;
  const responseEnd = entry.responseEnd || 0;
  const domInteractive = entry.domInteractive || 0;
  const domContentLoadedEventEnd = entry.domContentLoadedEventEnd || 0;
  const loadEventEnd = entry.loadEventEnd || 0;
  const startTime = entry.startTime || 0;

  const dns = Math.max(0, Math.round(domainLookupEnd - domainLookupStart));
  const tcp = Math.max(0, Math.round(connectEnd - connectStart));
  const ssl =
    secureConnectionStart > 0 ? Math.max(0, Math.round(connectEnd - secureConnectionStart)) : 0;
  const ttfb = Math.max(0, Math.round(responseStart - requestStart));
  const download = Math.max(0, Math.round(responseEnd - responseStart));
  const domParse = Math.max(0, Math.round(domContentLoadedEventEnd - domInteractive));
  const domReady = Math.max(0, Math.round(domContentLoadedEventEnd - startTime));
  const load = Math.max(0, Math.round(loadEventEnd - startTime));

  return {
    dns,
    tcp,
    ssl,
    ttfb,
    download,
    domParse,
    domReady,
    load,
  };
}

/**
 * 创建 Web Vitals、Navigation Timing 与主线程长任务卡顿感知插件。
 *
 * @param options 插件配置项
 * @returns MonitorPlugin 实例
 */
export function createPerformancePlugin(options?: PerformancePluginOptions): MonitorPlugin {
  const enableVitals = options?.vitals ?? true;
  const enableNavigation = options?.navigation ?? true;
  const enableLongTask = options?.longtask ?? true;
  const jankThreshold = options?.jankThreshold ?? 200;
  const sampleRate = options?.sampleRate ?? 1.0;

  let activeKernel: MonitorKernelInstance | null = null;
  const observers: PerformanceObserver[] = [];
  let onVisibilityChange: (() => void) | null = null;
  let onLoadHandler: (() => void) | null = null;

  // 累积布局偏移量
  let clsValue = 0;
  let clsReported = false;

  /**
   * 判定当前事件是否被采样命中。
   */
  const shouldSample = (): boolean => {
    if (sampleRate >= 1.0) {
      return true;
    }
    if (sampleRate <= 0.0) {
      return false;
    }
    return Math.random() < sampleRate;
  };

  /**
   * 向内核安全派发性能事件。
   */
  const emitPerformance = (
    name: string,
    value: number,
    level: 'info' | 'warn' = 'info',
    extraEntry?: Record<string, unknown>,
  ): void => {
    if (!activeKernel || !activeKernel.isInitialized || !shouldSample()) {
      return;
    }

    const rating = calculateRating(name, value);
    const payload: PerformancePayload = {
      name,
      value,
      rating,
      entry: extraEntry,
    };

    activeKernel.emit<PerformancePayload>({
      type: 'performance',
      level,
      payload,
    });
  };

  /**
   * 检查 PerformanceObserver 是否被宿主支持且支持指定 entryType。
   */
  const isTypeSupported = (type: string): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    const win = window as WindowWithPerformance;
    if (typeof win.PerformanceObserver === 'undefined') {
      return false;
    }
    const supportedTypes: readonly string[] = win.PerformanceObserver.supportedEntryTypes || [];
    if (supportedTypes.length === 0) {
      // 若浏览器未暴露 supportedEntryTypes，默认允许尝试捕获
      return true;
    }
    return supportedTypes.includes(type);
  };

  /**
   * 创建并注册受管的 PerformanceObserver。
   */
  const createSafeObserver = (
    type: string,
    callback: (entries: PerformanceEntry[]) => void,
    buffered = true,
  ): void => {
    if (!isTypeSupported(type)) {
      return;
    }

    try {
      const win = window as WindowWithPerformance;
      const ObserverClass = win.PerformanceObserver;
      if (!ObserverClass) {
        return;
      }

      const observer = new ObserverClass((list: { getEntries: () => PerformanceEntry[] }) => {
        try {
          callback(list.getEntries());
        } catch {
          // 避免观察器内部异常穿透
        }
      });

      observer.observe({ type, buffered } as PerformanceObserverInit);
      observers.push(observer);
    } catch {
      // 宿主不支持该特定参数组合时安全降级
    }
  };

  /**
   * 采集 Navigation Timing 关键链路阶段。
   */
  const captureNavigationTiming = (): void => {
    if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
      return;
    }

    try {
      const navEntries = window.performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        const navEntry = navEntries[0] as PerformanceNavigationTiming;
        const metrics = extractNavigationMetrics(navEntry);

        // 1. 派发 TTFB 指标
        emitPerformance('TTFB', metrics.ttfb, 'info', { navEntry });

        // 2. 派发完整 Navigation 指标
        emitPerformance('navigation', metrics.load, 'info', {
          ...metrics,
        });
      }
    } catch {
      // 降级守卫
    }
  };

  /**
   * 启动 Web Vitals 采集。
   */
  const setupVitals = (): void => {
    // 1. FCP 首次内容绘制
    createSafeObserver('paint', entries => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          emitPerformance('FCP', Math.round(entry.startTime), 'info', {
            startTime: entry.startTime,
          });
          break;
        }
      }
    });

    // 2. LCP 最大内容绘制
    createSafeObserver('largest-contentful-paint', entries => {
      const lastEntry = entries[entries.length - 1] as RawLargestContentfulPaintEntry | undefined;
      if (lastEntry) {
        emitPerformance('LCP', Math.round(lastEntry.startTime), 'info', {
          size: lastEntry.size,
          elementSelector: lastEntry.element?.tagName || '',
        });
      }
    });

    // 3. CLS 累积布局偏移
    createSafeObserver('layout-shift', entries => {
      for (const entry of entries) {
        const layoutEntry = entry as RawLayoutShiftEntry;
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value || 0;
        }
      }
    });

    // 4. FID 首次输入延迟
    createSafeObserver('first-input', entries => {
      const firstEntry = entries[0] as RawFirstInputEntry | undefined;
      if (firstEntry && typeof firstEntry.processingStart === 'number') {
        const delay = Math.round(firstEntry.processingStart - firstEntry.startTime);
        emitPerformance('FID', Math.max(0, delay), 'info', {
          name: firstEntry.name,
          startTime: firstEntry.startTime,
          duration: firstEntry.duration,
        });
      }
    });

    // 5. 监听页面隐藏事件以冲刷最终累积的 CLS
    if (typeof document !== 'undefined') {
      onVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && !clsReported) {
          clsReported = true;
          emitPerformance('CLS', Number(clsValue.toFixed(4)), 'info');
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
  };

  /**
   * 启动主线程 Long Task 与卡顿告警感知。
   */
  const setupLongTask = (): void => {
    createSafeObserver(
      'longtask',
      entries => {
        for (const entry of entries) {
          const longTaskEntry = entry as RawLongTaskEntry;
          const duration = Math.round(longTaskEntry.duration);
          const startTime = Math.round(longTaskEntry.startTime);

          const rawAttributions = longTaskEntry.attribution || [];
          const attribution: LongTaskAttribution[] = rawAttributions.map(attr => ({
            name: attr.name || '',
            entryType: attr.entryType || '',
            startTime: Math.round(attr.startTime || 0),
            duration: Math.round(attr.duration || 0),
            containerType: attr.containerType || '',
            containerSrc: attr.containerSrc || '',
            containerId: attr.containerId || '',
            containerName: attr.containerName || '',
          }));

          const entryDetail = {
            startTime,
            duration,
            attribution,
          };

          // 若超过卡顿阈值 (如 200ms)，派发严重告警事件；否则按普通 longtask 记录
          if (duration >= jankThreshold) {
            emitPerformance('jank', duration, 'warn', entryDetail);
          } else {
            emitPerformance('longtask', duration, 'info', entryDetail);
          }
        }
      },
      false,
    );
  };

  return {
    name: 'performance',

    setup(kernel: MonitorKernelInstance): void {
      activeKernel = kernel;

      if (typeof window === 'undefined') {
        return;
      }

      // 1. Web Vitals
      if (enableVitals) {
        setupVitals();
      }

      // 2. Long Tasks
      if (enableLongTask) {
        setupLongTask();
      }

      // 3. Navigation Timing
      if (enableNavigation) {
        if (document.readyState === 'complete') {
          // 若页面已加载完成，稍后延迟采集以确保 timing 数据完整
          setTimeout(() => {
            captureNavigationTiming();
          }, 0);
        } else {
          onLoadHandler = () => {
            setTimeout(() => {
              captureNavigationTiming();
            }, 0);
          };
          window.addEventListener('load', onLoadHandler);
        }
      }
    },

    teardown(): void {
      activeKernel = null;

      // 1. 确定性断开所有活跃的 PerformanceObserver
      for (const observer of observers) {
        try {
          observer.disconnect();
        } catch {
          // 忽略断开异常
        }
      }
      observers.length = 0;

      // 2. 清理事件监听
      if (onVisibilityChange && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        onVisibilityChange = null;
      }

      if (onLoadHandler && typeof window !== 'undefined') {
        window.removeEventListener('load', onLoadHandler);
        onLoadHandler = null;
      }
    },
  };
}
