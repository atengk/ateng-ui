/**
 * 内存事件缓冲队列与生命周期防丢冲刷协调器 (Transport Queue)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { MonitorEvent } from '../types/event';
import { createDefaultReporter, sendBeaconTransport } from './transport';

/**
 * 传输队列初始化配置选项。
 */
export interface TransportQueueOptions {
  /** 批量聚合上限，达到该数量立即冲刷上报，默认 10 */
  batchSize?: number;

  /** 防抖刷新定时器延迟 (毫秒)，默认 3000ms */
  flushInterval?: number;

  /** 监控上报网关 URL */
  reportUrl?: string;

  /** 自定义上报执行器 SPI */
  reporter?: (events: MonitorEvent[]) => void | Promise<void>;
}

/**
 * 具备防抖合并、批处理与卸载防丢特性的传输缓冲队列。
 */
export class TransportQueue {
  private readonly _batchSize: number;
  private readonly _flushInterval: number;
  private readonly _reportUrl?: string;
  private readonly _reporter: (events: MonitorEvent[]) => Promise<void>;

  private _queue: MonitorEvent[] = [];
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _isDestroyed = false;

  private readonly _onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.emergencyFlush();
    }
  };

  private readonly _onPageHide = (): void => {
    this.emergencyFlush();
  };

  constructor(options?: TransportQueueOptions) {
    this._batchSize = options?.batchSize ?? 10;
    this._flushInterval = options?.flushInterval ?? 3000;
    this._reportUrl = options?.reportUrl;

    if (typeof options?.reporter === 'function') {
      const customReporter = options.reporter;
      this._reporter = async (events: MonitorEvent[]) => {
        await customReporter(events);
      };
    } else {
      this._reporter = createDefaultReporter(this._reportUrl);
    }

    // 绑定宿主生命周期事件以实现页面关闭防丢
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this._onPageHide);
    }
  }

  /**
   * 当前队列中积压的未发送事件数。
   */
  get size(): number {
    return this._queue.length;
  }

  /**
   * 向队列追加事件。
   * 当积压数量达到 batchSize 时立即冲刷；否则启动防抖定时器。
   *
   * @param event 规范化的监控事件
   */
  push(event: MonitorEvent): void {
    if (this._isDestroyed || !event) {
      return;
    }

    this._queue.push(event);

    // 1. 若达到批次上限，立即触发冲刷
    if (this._queue.length >= this._batchSize) {
      void this.flush();
      return;
    }

    // 2. 否则开启或保留防抖定时器
    if (!this._timer) {
      this._timer = setTimeout(() => {
        void this.flush();
      }, this._flushInterval);
    }
  }

  /**
   * 正常异步冲刷当前内存队列。
   */
  async flush(): Promise<void> {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._queue.length === 0) {
      return;
    }

    const batch = this._queue.splice(0);

    try {
      await this._reporter(batch);
    } catch (err) {
      console.error('[@atengk/monitor] Transport reporter failed:', err);
    }
  }

  /**
   * 页面卸载或隐藏时的同步紧急冲刷。
   * 优先借助 navigator.sendBeacon 实现非阻塞零丢失发送。
   */
  emergencyFlush(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._queue.length === 0) {
      return;
    }

    const batch = this._queue.splice(0);

    // 1. 若存在 reportUrl，优先采用 sendBeacon 穿透页面卸载
    if (this._reportUrl) {
      const beaconSent = sendBeaconTransport(this._reportUrl, batch);
      if (beaconSent) {
        return;
      }
    }

    // 2. 兜底异步执行（尽可能触发请求）
    void this._reporter(batch);
  }

  /**
   * 销毁队列，解除全局生命周期监听并清空内存。
   */
  async destroy(): Promise<void> {
    this._isDestroyed = true;

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this._onPageHide);
    }

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    // 将剩余数据冲刷完毕
    if (this._queue.length > 0) {
      await this.flush();
    }
  }
}
