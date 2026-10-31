/**
 * 运行时异常与资源崩溃采集插件 (ErrorPlugin)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { ErrorPayload } from '../types/event';
import type { MonitorKernelInstance, MonitorPlugin } from '../types/plugin';

/**
 * 异常收集插件配置选项。
 */
export interface ErrorPluginOptions {
  /** 是否监听 JS 运行时异常 (window.onerror / error 事件)，默认 true */
  enableJsError?: boolean;

  /** 是否监听异步 Promise 拒付异常 (unhandledrejection)，默认 true */
  enablePromiseError?: boolean;

  /** 是否在事件捕获阶段监听静态资源 404/加载中断，默认 true */
  enableResourceError?: boolean;

  /** 是否代理并捕获 console.error 调用，默认 true */
  enableConsoleError?: boolean;
}

/**
 * 提取目标 DOM 节点的简洁特征选择器路径。
 *
 * @param element DOM 节点
 * @returns 格式化选择器字符串，如 'div#app > img.banner-img'
 */
export function getElementSelector(element: Element): string {
  if (!element || typeof element.tagName !== 'string') {
    return 'unknown';
  }

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const className =
    typeof element.className === 'string' && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';

  return `${tag}${id}${className}`;
}

/**
 * 从 Vue 实例对象中安全提取组件名称。
 *
 * @param instance Vue 内部组件实例
 * @returns 组件名称或 'AnonymousComponent'
 */
export function getVueComponentName(instance?: unknown): string {
  if (!instance || typeof instance !== 'object') {
    return 'AnonymousComponent';
  }

  const inst = instance as {
    $options?: { name?: string; _componentTag?: string; __name?: string };
    type?: { name?: string; __name?: string };
    name?: string;
  };

  return (
    inst.type?.name ||
    inst.type?.__name ||
    inst.$options?.name ||
    inst.$options?._componentTag ||
    inst.$options?.__name ||
    inst.name ||
    'AnonymousComponent'
  );
}

/**
 * 捕获 Vue 框架内部未捕获异常。
 * 纯 TS 结构化实现，零 Vue 运行时物理依赖。
 *
 * @param kernel 监控微内核实例
 * @param err 异常对象或文本
 * @param instance 触发异常的 Vue 组件实例
 * @param info Vue 生命周期钩子或错误来源描述 (如 'render function', 'mounted hook')
 */
export function captureVueError(
  kernel: MonitorKernelInstance,
  err: unknown,
  instance?: unknown,
  info?: string,
): void {
  if (!kernel) return;

  let message = 'Vue Error';
  let name = 'VueError';
  let stack: string | undefined;

  if (err instanceof Error) {
    message = err.message || message;
    name = err.name || name;
    stack = err.stack;
  } else if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object') {
    try {
      message = JSON.stringify(err);
    } catch {
      message = String(err);
    }
  }

  const componentName = getVueComponentName(instance);

  const payload: ErrorPayload = {
    category: 'vue',
    name,
    message: `${message} (${componentName}: ${info || 'unknown'})`,
    stack,
  };

  kernel.emit<ErrorPayload>({
    type: 'error',
    level: 'error',
    payload,
  });
}

/**
 * 创建适用于 Vue 的全局错误处理器工厂函数。
 * 便于调用方直接通过 app.config.errorHandler = createVueErrorHandler(monitor) 一键挂载。
 *
 * @param kernel 监控微内核实例
 * @returns 符合 Vue errorHandler 签名的回调函数
 */
export function createVueErrorHandler(
  kernel: MonitorKernelInstance,
): (err: unknown, instance: unknown, info: string) => void {
  return (err: unknown, instance: unknown, info: string) => {
    captureVueError(kernel, err, instance, info);
  };
}

/**
 * 创建运行时异常与静态资源崩溃采集插件实例。
 *
 * @param options 插件配置项
 * @returns MonitorPlugin 实体
 */
export function createErrorPlugin(options?: ErrorPluginOptions): MonitorPlugin {
  const opts: Required<ErrorPluginOptions> = {
    enableJsError: options?.enableJsError ?? true,
    enablePromiseError: options?.enablePromiseError ?? true,
    enableResourceError: options?.enableResourceError ?? true,
    enableConsoleError: options?.enableConsoleError ?? true,
  };

  let originalConsoleError: ((...args: unknown[]) => void) | null = null;
  let errorHandler: ((event: ErrorEvent) => void) | null = null;
  let rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  return {
    name: 'error',

    setup(kernel: MonitorKernelInstance): void {
      if (typeof window === 'undefined') {
        return;
      }

      // 1. 监听 JS 运行时异常与静态资源加载失败（使用 capture = true 捕获阶段）
      if (opts.enableJsError || opts.enableResourceError) {
        errorHandler = (event: ErrorEvent) => {
          const target = event.target as (HTMLElement & { src?: string; href?: string }) | null;

          // 资源加载崩溃判定：事件目标并非 window/document，且具有 src 或 href 属性
          const isResourceError =
            target &&
            target !== (window as unknown) &&
            target !== (document as unknown) &&
            (typeof target.src === 'string' || typeof target.href === 'string');

          if (isResourceError) {
            if (!opts.enableResourceError) return;

            const resourceUrl = target.src || target.href || '';
            const selector = getElementSelector(target);
            const tagName = target.tagName ? target.tagName.toLowerCase() : 'element';

            const payload: ErrorPayload = {
              category: 'resource',
              name: 'ResourceError',
              message: `Resource load failed: <${tagName}> at ${resourceUrl}`,
              filename: resourceUrl,
              selector,
            };

            kernel.emit<ErrorPayload>({
              type: 'error',
              level: 'error',
              payload,
            });
            return;
          }

          // 常规 JS 运行时异常
          if (!opts.enableJsError) return;

          const errorObj = event.error as Error | undefined;
          const payload: ErrorPayload = {
            category: 'js',
            name: errorObj?.name || 'Error',
            message: event.message || errorObj?.message || 'Script error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: errorObj?.stack,
          };

          kernel.emit<ErrorPayload>({
            type: 'error',
            level: 'error',
            payload,
          });
        };

        window.addEventListener('error', errorHandler, true);
      }

      // 2. 监听异步未决 Promise 拒付
      if (opts.enablePromiseError) {
        rejectionHandler = (event: PromiseRejectionEvent) => {
          const reason = event.reason as unknown;
          let message = 'Unhandled Promise Rejection';
          let name = 'UnhandledRejection';
          let stack: string | undefined;

          if (reason instanceof Error) {
            message = reason.message || message;
            name = reason.name || name;
            stack = reason.stack;
          } else if (typeof reason === 'string') {
            message = reason;
          } else if (reason && typeof reason === 'object') {
            try {
              message = JSON.stringify(reason);
            } catch {
              message = String(reason);
            }
          }

          const payload: ErrorPayload = {
            category: 'promise',
            name,
            message,
            stack,
          };

          kernel.emit<ErrorPayload>({
            type: 'error',
            level: 'error',
            payload,
          });
        };

        window.addEventListener('unhandledrejection', rejectionHandler);
      }

      // 3. 代理 console.error
      if (opts.enableConsoleError && typeof console !== 'undefined' && console.error) {
        originalConsoleError = console.error;
        console.error = (...args: unknown[]) => {
          try {
            // 先调用原始控制台，保留本地控制台输出与颜色格式
            if (originalConsoleError) {
              originalConsoleError.apply(console, args);
            }

            const formattedMessage = args
              .map(arg => {
                if (arg instanceof Error) {
                  return `${arg.name}: ${arg.message}`;
                }
                if (typeof arg === 'object' && arg !== null) {
                  try {
                    return JSON.stringify(arg);
                  } catch {
                    return String(arg);
                  }
                }
                return String(arg);
              })
              .join(' ');

            // 提取第一条 Error 实例的堆栈
            const errArg = args.find(a => a instanceof Error) as Error | undefined;

            const payload: ErrorPayload = {
              category: 'console',
              name: errArg?.name || 'ConsoleError',
              message: formattedMessage,
              stack: errArg?.stack,
            };

            kernel.emit<ErrorPayload>({
              type: 'error',
              level: 'error',
              payload,
            });
          } catch (internalErr) {
            // 防御性保护：确保自身逻辑不抛出异常破坏控制台调用
            if (originalConsoleError) {
              originalConsoleError.call(console, internalErr);
            }
          }
        };
      }
    },

    teardown(): void {
      if (typeof window !== 'undefined') {
        if (errorHandler) {
          window.removeEventListener('error', errorHandler, true);
          errorHandler = null;
        }

        if (rejectionHandler) {
          window.removeEventListener('unhandledrejection', rejectionHandler);
          rejectionHandler = null;
        }
      }

      if (originalConsoleError && typeof console !== 'undefined') {
        console.error = originalConsoleError;
        originalConsoleError = null;
      }
    },
  };
}
