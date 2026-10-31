/**
 * 监控采集插件与微内核调度契约。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { ContextStoreInstance } from './context';
import type { EventLevel, MonitorEvent, ErrorPayload } from './event';

/**
 * 监控内核统一公共门面接口。
 */
export interface MonitorKernelInstance {
  /** 内核是否已初始化完毕 */
  readonly isInitialized: boolean;

  /** 上下文管理器引用 */
  readonly contextStore: ContextStoreInstance;

  /**
   * 注册并即刻安装独立插件。
   *
   * @param plugin 插件实例
   */
  registerPlugin: (plugin: MonitorPlugin) => void;

  /**
   * 根据名称注销并清理插件。
   *
   * @param pluginName 插件名称
   */
  unregisterPlugin: (pluginName: string) => void;

  /**
   * 根据名称获取已注册的插件。
   *
   * @param pluginName 插件唯一名称
   * @returns 插件实体或 undefined
   */
  getPlugin: (pluginName: string) => MonitorPlugin | undefined;

  /**
   * 派发监控遥测事件。
   *
   * @param partialEvent 事件半成品（由内核负责注入 ID、时间戳与当前上下文快照）
   */
  emit: <T = unknown>(partialEvent: Omit<MonitorEvent<T>, 'id' | 'timestamp' | 'context'>) => void;

  /**
   * 手动触发内存缓冲队列的立即冲刷与上报。
   */
  flush: () => Promise<void>;

  /**
   * 彻底销毁监控实例，清理所有插件、事件监听器与内存定时器。
   */
  destroy: () => Promise<void>;

  /**
   * 手动捕获业务异常并派发。
   *
   * @param error 原始 Error 对象、文本或未知异常实体
   * @param customPayload 覆盖或扩充的自定义异常字段
   */
  captureException: (error: unknown, customPayload?: Partial<ErrorPayload>) => void;

  /**
   * 手动记录普通诊断消息。
   *
   * @param message 消息内容
   * @param level 严重级别，默认为 'info'
   * @param extra 附加元数据
   */
  captureMessage: (message: string, level?: EventLevel, extra?: Record<string, unknown>) => void;
}

/**
 * 标准化微内核采集插件契约。
 */
export interface MonitorPlugin {
  /** 插件唯一英文名称 (如 'error', 'performance', 'white-screen') */
  name: string;

  /**
   * 插件装载与初始化钩子。
   *
   * @param kernel 当前运行的微内核实例
   */
  setup: (kernel: MonitorKernelInstance) => void | Promise<void>;

  /**
   * 插件卸载与确定性生命周期清理钩子。
   * 必须在其中 100% 移除注册的全局监听器与定时器。
   *
   * @param kernel 当前运行的微内核实例
   */
  teardown?: (kernel: MonitorKernelInstance) => void | Promise<void>;
}
