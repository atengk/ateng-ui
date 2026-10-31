/**
 * 监控微内核调度中心与生命周期编排器。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { ContextStoreInstance } from '../types/context';
import type { ErrorPayload, EventLevel, MonitorEvent } from '../types/event';
import type { MonitorKernelInstance, MonitorPlugin } from '../types/plugin';
import type { MonitorOptions } from '../types/options';
import { createContextStore } from './ContextStore';
import { generateId } from '../utils/id';

/**
 * 监控微内核核心实现类。
 */
export class MonitorKernel implements MonitorKernelInstance {
  private _isInitialized = false;
  private readonly _options: MonitorOptions;
  private readonly _contextStore: ContextStoreInstance;
  private readonly _plugins = new Map<string, MonitorPlugin>();
  private readonly _events: MonitorEvent[] = [];

  constructor(options?: MonitorOptions) {
    this._options = {
      appVersion: '1.0.0',
      environment: 'dev',
      sampleRate: 1.0,
      batchSize: 10,
      flushInterval: 3000,
      maxErrorsPerSession: 50,
      disabled: false,
      ...options,
    };
    this._contextStore = createContextStore(this._options);
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get contextStore(): ContextStoreInstance {
    return this._contextStore;
  }

  /**
   * 初始化内核并依序启动预装插件。
   */
  init(): void {
    if (this._isInitialized) {
      return;
    }

    if (this._options.disabled) {
      return;
    }

    this._isInitialized = true;

    // 依序挂载配置的插件
    if (Array.isArray(this._options.plugins)) {
      for (const plugin of this._options.plugins) {
        this.registerPlugin(plugin);
      }
    }
  }

  /**
   * 注册并初始化独立插件。
   *
   * @param plugin 待注册插件
   */
  registerPlugin(plugin: MonitorPlugin): void {
    if (!plugin || !plugin.name) {
      return;
    }

    // 若已存在同名插件，先行卸载旧实例
    if (this._plugins.has(plugin.name)) {
      this.unregisterPlugin(plugin.name);
    }

    this._plugins.set(plugin.name, plugin);

    // 若内核已就绪，立即触发插件的 setup 生命周期
    if (this._isInitialized && typeof plugin.setup === 'function') {
      try {
        void plugin.setup(this);
      } catch (err) {
        // 插件初始化异常使用基础控制台安全打印，绝不抛出崩溃宿主
        console.error(`[@atengk/monitor] Plugin setup failed: ${plugin.name}`, err);
      }
    }
  }

  /**
   * 卸载插件并执行确定性资源清理。
   *
   * @param pluginName 插件唯一名称
   */
  unregisterPlugin(pluginName: string): void {
    const plugin = this._plugins.get(pluginName);
    if (!plugin) {
      return;
    }

    if (typeof plugin.teardown === 'function') {
      try {
        void plugin.teardown(this);
      } catch (err) {
        console.error(`[@atengk/monitor] Plugin teardown failed: ${pluginName}`, err);
      }
    }

    this._plugins.delete(pluginName);
  }

  /**
   * 获取已注册的插件。
   *
   * @param pluginName 插件名称
   */
  getPlugin(pluginName: string): MonitorPlugin | undefined {
    return this._plugins.get(pluginName);
  }

  /**
   * 派发监控遥测事件。
   * 自动富化生成全局 UUID、当前时间戳与系统上下文快照。
   *
   * @param partialEvent 待补全的事件对象
   */
  emit<T = unknown>(partialEvent: Omit<MonitorEvent<T>, 'id' | 'timestamp' | 'context'>): void {
    if (!this._isInitialized || this._options.disabled) {
      return;
    }

    // 采样率过滤
    if (typeof this._options.sampleRate === 'number' && this._options.sampleRate < 1) {
      if (Math.random() > this._options.sampleRate) {
        return;
      }
    }

    // 1. 组装具备唯一 ID 与上下文快照的完整事件包
    let event: MonitorEvent<T> = {
      id: generateId(),
      timestamp: Date.now(),
      context: this._contextStore.getSnapshot(),
      ...partialEvent,
    };

    // 2. 经过 beforeSend 终极过滤钩子
    if (typeof this._options.beforeSend === 'function') {
      try {
        const processed = this._options.beforeSend(event as MonitorEvent);
        if (processed === false || processed === null) {
          // 显式丢弃
          return;
        }
        event = processed as MonitorEvent<T>;
      } catch (err) {
        console.error('[@atengk/monitor] beforeSend hook thrown error:', err);
      }
    }

    // 3. 记录事件并交付上报通道
    this._events.push(event as MonitorEvent);

    if (typeof this._options.reporter === 'function') {
      try {
        void this._options.reporter([event as MonitorEvent]);
      } catch (err) {
        console.error('[@atengk/monitor] custom reporter failed:', err);
      }
    }
  }

  /**
   * 手动捕获异常并派发。
   *
   * @param error 原始 Error 对象或文本
   * @param customPayload 自定义异常增强字段
   */
  captureException(error: unknown, customPayload?: Partial<ErrorPayload>): void {
    let message = 'Unknown Error';
    let name = 'Error';
    let stack: string | undefined;

    if (error instanceof Error) {
      message = error.message || message;
      name = error.name || name;
      stack = error.stack;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      try {
        message = JSON.stringify(error);
      } catch {
        message = String(error);
      }
    }

    const payload: ErrorPayload = {
      category: 'custom',
      message,
      name,
      stack,
      ...customPayload,
    };

    this.emit<ErrorPayload>({
      type: 'error',
      level: 'error',
      payload,
    });
  }

  /**
   * 手动记录普通诊断信息。
   *
   * @param message 文本消息
   * @param level 严重级别
   * @param extra 附加元数据
   */
  captureMessage(
    message: string,
    level: EventLevel = 'info',
    extra?: Record<string, unknown>,
  ): void {
    this.emit({
      type: 'custom',
      level,
      payload: {
        message,
        extra: extra ? { ...extra } : {},
      },
    });
  }

  /**
   * 触发立即冲刷上报。
   */
  async flush(): Promise<void> {
    if (this._events.length === 0) {
      return;
    }

    if (typeof this._options.reporter === 'function') {
      const batch = [...this._events];
      this._events.length = 0;
      await this._options.reporter(batch);
    }
  }

  /**
   * 销毁监控实例，清理所有插件与缓存。
   */
  async destroy(): Promise<void> {
    // 逆序注销所有插件
    const pluginList = Array.from(this._plugins.values()).reverse();
    for (const plugin of pluginList) {
      this.unregisterPlugin(plugin.name);
    }
    this._plugins.clear();
    this._events.length = 0;
    this._contextStore.reset();
    this._isInitialized = false;
  }
}

let activeMonitor: MonitorKernelInstance | undefined;

/**
 * 初始化全局单例或独立监控内核。
 *
 * @param options 初始化配置
 * @returns 初始化完毕的监控内核实例
 */
export function initMonitor(options?: MonitorOptions): MonitorKernelInstance {
  const kernel = new MonitorKernel(options);
  kernel.init();
  activeMonitor = kernel;
  return kernel;
}

/**
 * 获取当前全局活跃的监控内核实例。
 *
 * @returns 当前活跃的监控内核实例，若未初始化则返回 undefined
 */
export function getActiveMonitor(): MonitorKernelInstance | undefined {
  return activeMonitor;
}

/**
 * 销毁并清空当前活跃的监控内核单例。
 */
export async function destroyActiveMonitor(): Promise<void> {
  if (activeMonitor) {
    await activeMonitor.destroy();
    activeMonitor = undefined;
  }
}
