/**
 * 监控配置契约定义。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { MonitorEvent } from './event';
import type { MonitorPlugin } from './plugin';

/**
 * 监控初始化全局配置选项。
 */
export interface MonitorOptions {
  /** 应用发版版本号 (如 Git Commit SHA 或 Semver)，默认 '1.0.0' */
  appVersion?: string;

  /** 部署环境 (如 'prod' | 'uat' | 'test' | 'dev')，默认 'dev' */
  environment?: string;

  /** 会话标识符，默认由 SDK 自动生成 */
  sessionId?: string;

  /** 多租户企业隔离标识 */
  tenantId?: string;

  /** 启用的采集插件列表 */
  plugins?: MonitorPlugin[];

  /** 全局事件采样率 (0.0 ~ 1.0)，默认 1.0 全量采集 */
  sampleRate?: number;

  /** 监控数据接收网关端点 URL */
  reportUrl?: string;

  /**
   * 自定义上报执行器 SPI。
   * 当注入此方法时，内部将优先调用此方法上报事件。
   *
   * @param events 待上报事件列表
   */
  reporter?: (events: MonitorEvent[]) => void | Promise<void>;

  /**
   * 终极生命周期过滤与脱敏钩子。
   * 允许在事件写入传输队列前对数据进行审查、脱敏或修改。
   * 若返回 false 或 null，该事件将被直接丢弃，不予上报。
   *
   * @param event 待审核的完整事件实体
   * @returns 经过处理的事件实体，或 false / null 予以丢弃
   */
  beforeSend?: (event: MonitorEvent) => MonitorEvent | false | null;

  /** 内存队列批处理容量上限，达到该数量立即触发上报，默认 10 */
  batchSize?: number;

  /** 内存队列防抖刷新延迟 (毫秒)，默认 3000ms */
  flushInterval?: number;

  /** 单会话允许累计采集的最大异常数，超过后断路器触发熔断休眠，默认 50 */
  maxErrorsPerSession?: number;

  /** 敏感数据脱敏 DOM 选择器列表，匹配的节点文本将掩码为 '******' */
  maskSelectors?: string[];

  /** 是否全局禁用监控采集 (多用于本地极度纯净开发模式)，默认 false */
  disabled?: boolean;
}
