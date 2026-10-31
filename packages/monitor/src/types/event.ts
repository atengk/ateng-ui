/**
 * 监控遥测事件数据契约定义。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { MonitorContextSnapshot } from './context';

/**
 * 监控事件核心分类。
 */
export type EventType =
  'error' | 'performance' | 'white_screen' | 'breadcrumb' | 'network' | 'custom' | 'lifecycle';

/**
 * 监控事件告警级别。
 */
export type EventLevel = 'info' | 'warn' | 'error' | 'fatal';

/**
 * 用户行为面包屑项定义。
 */
export interface BreadcrumbItem {
  /** 面包屑大类 */
  type: 'click' | 'route' | 'console' | 'network' | 'custom';
  /** 分类标签说明 */
  category: string;
  /** 描述文案 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
  /** 发生时刻的时间戳 (毫秒) */
  timestamp: number;
  /** 严重级别 */
  level?: EventLevel;
}

/**
 * 运行时异常事件载荷实体。
 */
export interface ErrorPayload {
  /** 异常子分类 */
  category: 'js' | 'promise' | 'resource' | 'console' | 'vue' | 'custom';
  /** 核心错误描述信息 */
  message: string;
  /** 错误类型名称 (如 TypeError, ReferenceError) */
  name?: string;
  /** 原始或解析后的格式化调用堆栈 */
  stack?: string;
  /** 发生错误的脚本文件名 */
  filename?: string;
  /** 代码出错行号 */
  lineno?: number;
  /** 代码出错列号 */
  colno?: number;
  /** 发生资源加载崩溃的 DOM 选择器或标签 */
  selector?: string;
  /** 唯一错误特征指纹 (用于窗口内聚合去重) */
  fingerprint?: string;
  /** 在时间窗口内的聚合重复次数 */
  repeatCount?: number;
  /** 随附的现场用户交互行为面包屑切片 */
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * 页面性能与体验指标载荷实体。
 */
export interface PerformancePayload {
  /** 性能指标代号 (如 FCP, LCP, CLS, INP, TTFB, longtask, navigation) */
  name: string;
  /** 指标数值 (单位: 毫秒，CLS 为无量纲数值) */
  value: number;
  /** Google 官方体验评级 */
  rating?: 'good' | 'needs-improvement' | 'poor';
  /** 原始 PerformanceEntry 诊断明细 */
  entry?: Record<string, unknown>;
}

/**
 * 白屏感知诊断事件载荷实体。
 */
export interface WhiteScreenPayload {
  /** 是否判定为白屏 */
  isWhiteScreen: boolean;
  /** 视口点阵采样点命中诊断列表 */
  samplePoints: Array<{
    x: number;
    y: number;
    target: string;
    isRoot: boolean;
    isWhitelisted: boolean;
  }>;
  /** 采样时的视口物理边界 */
  viewport: {
    width: number;
    height: number;
  };
  /** 检测耗时 (毫秒) */
  duration: number;
}

/**
 * 网络嗅探事件载荷实体。
 */
export interface NetworkPayload {
  /** 请求目标绝对地址 */
  url: string;
  /** HTTP 请求方法 (GET, POST 等) */
  method: string;
  /** HTTP 响应状态码 */
  status: number;
  /** 网络请求往返耗时 (毫秒) */
  duration: number;
  /** 后端全链路追踪分布式 MDC TraceId */
  traceId?: string;
  /** 网络请求底层类型 */
  requestType: 'xhr' | 'fetch';
  /** 请求是否成功判定 */
  success: boolean;
}

/**
 * 统一监控事件实体契约。
 */
export interface MonitorEvent<T = unknown> {
  /** 事件唯一全局 ID (UUID v4) */
  id: string;
  /** 事件核心分类 */
  type: EventType;
  /** 事件告警严重级别 */
  level: EventLevel;
  /** 事件生成时间戳 (毫秒) */
  timestamp: number;
  /** 核心事件载荷数据 */
  payload: T;
  /** 事件发生时的系统全局上下文快照 */
  context: MonitorContextSnapshot;
}
