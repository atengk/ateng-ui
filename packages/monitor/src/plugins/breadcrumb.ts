/**
 * 用户行为面包屑与单页应用虚拟路由感知插件 (BreadcrumbPlugin)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { BreadcrumbItem, EventLevel } from '../types/event';
import type { MonitorKernelInstance, MonitorPlugin } from '../types/plugin';
import { sanitizeDomText, sanitizeUrl } from '../sanitizer/pii';
import { safeStringify } from '../utils/format';
import { getElementSelector } from './error';

/**
 * 用户行为追踪插件配置选项。
 */
export interface BreadcrumbPluginOptions {
  /** 环形缓冲区最大容量，默认 20 (取值范围 1 ~ 100) */
  maxBreadcrumbs?: number;

  /** 是否监听全局 DOM 点击事件，默认 true */
  enableClick?: boolean;

  /** 是否监听 SPA 虚拟路由流转与耗时，默认 true */
  enableRoute?: boolean;

  /** 是否记录 console.log/info/warn 打印轨迹，默认 true */
  enableConsole?: boolean;

  /** 自定义敏感 DOM 掩码选择器列表 */
  maskSelectors?: string[];
}

/**
 * 面包屑插件公共实例门面。
 */
export interface BreadcrumbPluginInstance extends MonitorPlugin {
  readonly name: 'breadcrumb';

  /**
   * 获取当前缓冲区中存储的所有面包屑时间轴快照。
   * 按时间升序排列，返回防御性浅克隆数组。
   */
  getBreadcrumbs: () => BreadcrumbItem[];

  /**
   * 手动添加一条面包屑记录。
   *
   * @param item 面包屑数据项
   */
  addBreadcrumb: (item: Omit<BreadcrumbItem, 'timestamp'> & { timestamp?: number }) => void;

  /**
   * 清空当前所有面包屑缓存。
   */
  clear: () => void;
}

/**
 * 安全序列化控制台参数，防止循环引用与大体积文本爆仓。
 *
 * @param arg 任意类型的控制台入参
 * @returns 截断后的安全字符串
 */
function safeSerializeConsoleArg(arg: unknown): string {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }
  const text = safeStringify(arg);
  return text.length > 200 ? `${text.slice(0, 200)}...` : text;
}

/**
 * 创建用户行为面包屑与 SPA 虚拟路由感知插件。
 *
 * @param options 插件配置项
 * @returns BreadcrumbPluginInstance 插件实体
 */
export function createBreadcrumbPlugin(
  options?: BreadcrumbPluginOptions,
): BreadcrumbPluginInstance {
  const rawMax = options?.maxBreadcrumbs ?? 20;
  const maxBreadcrumbs = Math.max(1, Math.min(100, rawMax));
  const enableClick = options?.enableClick ?? true;
  const enableRoute = options?.enableRoute ?? true;
  const enableConsole = options?.enableConsole ?? true;
  const maskSelectors = options?.maskSelectors ?? [];

  // 1. 内部定长环形缓冲区 (FIFO)
  const buffer: BreadcrumbItem[] = [];

  // 2. 状态保存句柄（用于确定性生命周期 teardown 复原）
  let originalPushState: typeof history.pushState | null = null;
  let originalReplaceState: typeof history.replaceState | null = null;
  let popstateHandler: (() => void) | null = null;
  let hashchangeHandler: (() => void) | null = null;

  const activeRafIds = new Set<number>();
  const activeTimeoutIds = new Set<ReturnType<typeof setTimeout>>();

  let originalConsoleLog: typeof console.log | null = null;
  let originalConsoleInfo: typeof console.info | null = null;
  let originalConsoleWarn: typeof console.warn | null = null;

  let clickHandler: ((event: MouseEvent) => void) | null = null;
  let currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const addBreadcrumb = (
    item: Omit<BreadcrumbItem, 'timestamp'> & { timestamp?: number },
  ): void => {
    const timestamp = typeof item.timestamp === 'number' ? item.timestamp : Date.now();
    const entry: BreadcrumbItem = {
      ...item,
      timestamp,
      data: item.data ? { ...item.data } : undefined,
    };

    if (buffer.length >= maxBreadcrumbs) {
      buffer.shift(); // 弹出最老的数据
    }
    buffer.push(entry);
  };

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    return [...buffer];
  };

  const clear = (): void => {
    buffer.length = 0;
  };

  return {
    name: 'breadcrumb',
    getBreadcrumbs,
    addBreadcrumb,
    clear,

    setup(kernel: MonitorKernelInstance): void {
      if (typeof window === 'undefined') {
        return;
      }

      currentUrl = window.location.href;

      // 1. 注册全局 DOM 点击监听 (Click Breadcrumb)
      if (enableClick) {
        clickHandler = (event: MouseEvent): void => {
          try {
            const target = event.target as HTMLElement | null;
            if (!target || typeof target.tagName !== 'string') {
              return;
            }

            const tagName = target.tagName.toLowerCase();
            // 忽略内部脚本与样式节点
            if (tagName === 'script' || tagName === 'style') {
              return;
            }

            const selector = getElementSelector(target);
            const { text, isMasked } = sanitizeDomText(target, maskSelectors);

            const displayText = text ? (text.length > 50 ? `${text.slice(0, 50)}...` : text) : '';
            const message = `Click <${tagName}>: ${displayText || selector}`;

            addBreadcrumb({
              type: 'click',
              category: 'ui.click',
              message,
              data: {
                tagName,
                selector,
                text: displayText,
                isMasked,
              },
              level: 'info',
            });
          } catch {
            // 防御性静默，绝对杜绝影响用户交互
          }
        };

        window.addEventListener('click', clickHandler, true);
      }

      // 2. 劫持 History API 与路由监听 (SPA Route & PAGE_VIEW)
      if (enableRoute && typeof window.history !== 'undefined') {
        const handleRouteChange = (
          trigger: 'pushState' | 'replaceState' | 'popstate' | 'hashchange',
          from: string,
          to: string,
        ): void => {
          if (!kernel) {
            return;
          }

          // 对于主动调用的 pushState/replaceState，若目标地址完全一致则忽略重复触发
          if (from === to && (trigger === 'pushState' || trigger === 'replaceState')) {
            return;
          }

          currentUrl = to;

          const start =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();

          const completeRoute = (duration: number): void => {
            // 自动派发 PAGE_VIEW 虚拟页面切换事件
            kernel.emit({
              type: 'custom',
              level: 'info',
              payload: {
                name: 'PAGE_VIEW',
                from: sanitizeUrl(from),
                to: sanitizeUrl(to),
                trigger,
                duration,
              },
            });

            // 记录一条 route 行为面包屑
            addBreadcrumb({
              type: 'route',
              category: 'navigation',
              message: `Route to ${to} (from ${from}) [${duration}ms]`,
              data: {
                from: sanitizeUrl(from),
                to: sanitizeUrl(to),
                trigger,
                duration,
              },
              level: 'info',
            });
          };

          // 统计从路由触发到下一帧渲染稳定的耗时
          if (typeof requestAnimationFrame === 'function') {
            const rafId = requestAnimationFrame(() => {
              activeRafIds.delete(rafId);
              const duration = Math.round(
                (typeof performance !== 'undefined' && typeof performance.now === 'function'
                  ? performance.now()
                  : Date.now()) - start,
              );
              completeRoute(duration);
            });
            activeRafIds.add(rafId);
          } else {
            const timerId = setTimeout(() => {
              activeTimeoutIds.delete(timerId);
              completeRoute(0);
            }, 0);
            activeTimeoutIds.add(timerId);
          }
        };

        // 劫持 history.pushState
        originalPushState = window.history.pushState.bind(window.history);
        window.history.pushState = function (
          data: unknown,
          unused: string,
          url?: string | URL | null,
        ): void {
          const from = window.location.href;
          const result = originalPushState?.(data, unused, url);
          const to = window.location.href;
          handleRouteChange('pushState', from, to);
          return result;
        };

        // 劫持 history.replaceState
        originalReplaceState = window.history.replaceState.bind(window.history);
        window.history.replaceState = function (
          data: unknown,
          unused: string,
          url?: string | URL | null,
        ): void {
          const from = window.location.href;
          const result = originalReplaceState?.(data, unused, url);
          const to = window.location.href;
          handleRouteChange('replaceState', from, to);
          return result;
        };

        // 监听 popstate
        popstateHandler = (): void => {
          const from = currentUrl;
          const to = window.location.href;
          handleRouteChange('popstate', from, to);
        };
        window.addEventListener('popstate', popstateHandler);

        // 监听 hashchange
        hashchangeHandler = (): void => {
          const from = currentUrl;
          const to = window.location.href;
          handleRouteChange('hashchange', from, to);
        };
        window.addEventListener('hashchange', hashchangeHandler);
      }

      // 3. 代理 console.log / info / warn (Console Breadcrumb)
      if (enableConsole && typeof console !== 'undefined') {
        const wrapConsole = (
          methodName: 'log' | 'info' | 'warn',
          level: EventLevel = 'info',
        ): ((...args: unknown[]) => void) => {
          const original = console[methodName].bind(console);
          return (...args: unknown[]): void => {
            // 保证原生控制台输出不被阻断
            try {
              original(...args);
            } catch {
              // 防御底层控制台报错
            }

            try {
              const formatted = args.map(safeSerializeConsoleArg).join(' ');
              const message = formatted.length > 500 ? `${formatted.slice(0, 500)}...` : formatted;

              addBreadcrumb({
                type: 'console',
                category: `console.${methodName}`,
                message,
                level,
              });
            } catch {
              // 静默捕获
            }
          };
        };

        originalConsoleLog = console.log;
        originalConsoleInfo = console.info;
        originalConsoleWarn = console.warn;

        console.log = wrapConsole('log', 'info');
        console.info = wrapConsole('info', 'info');
        console.warn = wrapConsole('warn', 'warn');
      }
    },

    teardown(): void {
      // 1. 恢复 History 原生方法并解绑路由事件
      if (typeof window !== 'undefined') {
        if (originalPushState) {
          window.history.pushState = originalPushState;
          originalPushState = null;
        }
        if (originalReplaceState) {
          window.history.replaceState = originalReplaceState;
          originalReplaceState = null;
        }
        if (popstateHandler) {
          window.removeEventListener('popstate', popstateHandler);
          popstateHandler = null;
        }
        if (hashchangeHandler) {
          window.removeEventListener('hashchange', hashchangeHandler);
          hashchangeHandler = null;
        }

        // 2. 解绑 DOM 点击监听
        if (clickHandler) {
          window.removeEventListener('click', clickHandler, true);
          clickHandler = null;
        }
      }

      // 3. 恢复控制台原生方法
      if (typeof console !== 'undefined') {
        if (originalConsoleLog) {
          console.log = originalConsoleLog;
          originalConsoleLog = null;
        }
        if (originalConsoleInfo) {
          console.info = originalConsoleInfo;
          originalConsoleInfo = null;
        }
        if (originalConsoleWarn) {
          console.warn = originalConsoleWarn;
          originalConsoleWarn = null;
        }
      }

      // 4. 取消所有未决的 RAF 渲染与定时器
      for (const rafId of activeRafIds) {
        cancelAnimationFrame(rafId);
      }
      activeRafIds.clear();

      for (const timerId of activeTimeoutIds) {
        clearTimeout(timerId);
      }
      activeTimeoutIds.clear();

      // 5. 清空缓冲区
      clear();
    },
  };
}
