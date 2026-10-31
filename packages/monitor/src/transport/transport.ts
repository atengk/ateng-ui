/**
 * 高可用三阶数据传输通道与防循环调用协议。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { MonitorEvent } from '../types/event';

/** 监控内部上报跳过标记请求头，避免拦截器二次捕获导致死循环 */
export const MONITOR_SKIP_HEADER = 'X-Ateng-Monitor-Skip';

/**
 * 判断某个网络请求是否为监控系统发起的上报请求。
 *
 * @param url 目标请求绝对或相对 URL
 * @param headers 请求头字典
 * @param reportUrl 监控上报网关地址
 * @returns 是否应当在网络采集插件中跳过忽略
 */
export function isMonitorReportRequest(
  url?: string,
  headers?: Record<string, string>,
  reportUrl?: string,
): boolean {
  if (headers) {
    for (const [key, val] of Object.entries(headers)) {
      if (key.toLowerCase() === MONITOR_SKIP_HEADER.toLowerCase() && val === 'true') {
        return true;
      }
    }
  }

  if (url && reportUrl) {
    if (url === reportUrl || url.startsWith(reportUrl)) {
      return true;
    }
  }

  return false;
}

/**
 * 优先通道：利用 navigator.sendBeacon 异步无阻塞上报。
 * 具备穿透页面卸载能力，不阻塞浏览器退出与事件循环。
 *
 * @param url 上报接收网关
 * @param events 待上报事件列表
 * @returns 浏览器是否成功接收并排队
 */
export function sendBeaconTransport(url: string, events: MonitorEvent[]): boolean {
  if (!url || !Array.isArray(events) || events.length === 0) {
    return false;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const data = JSON.stringify(events);
      // 使用标准 application/json Blob 包装，防止部分后端解析非标准表单
      const blob = new Blob([data], { type: 'application/json' });
      return navigator.sendBeacon(url, blob);
    } catch {
      // 捕获超额异常（如超过 64KB 上限）以进入降级通道
      return false;
    }
  }

  return false;
}

/**
 * 降级通道：利用 fetch({ keepalive: true }) 进行非阻塞上报。
 *
 * @param url 上报接收网关
 * @param events 待上报事件列表
 * @returns 是否发送成功
 */
export async function fetchTransport(url: string, events: MonitorEvent[]): Promise<boolean> {
  if (!url || !Array.isArray(events) || events.length === 0) {
    return false;
  }

  if (typeof fetch === 'function') {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(events),
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          [MONITOR_SKIP_HEADER]: 'true',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * 兜底通道：利用原生 XMLHttpRequest 进行异步发送。
 *
 * @param url 上报接收网关
 * @param events 待上报事件列表
 * @returns 是否发送成功
 */
export function xhrTransport(url: string, events: MonitorEvent[]): Promise<boolean> {
  if (!url || !Array.isArray(events) || events.length === 0) {
    return Promise.resolve(false);
  }

  if (typeof XMLHttpRequest === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise(resolve => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader(MONITOR_SKIP_HEADER, 'true');

      xhr.onload = () => {
        resolve(xhr.status >= 200 && xhr.status < 300);
      };

      xhr.onerror = () => {
        resolve(false);
      };

      xhr.ontimeout = () => {
        resolve(false);
      };

      xhr.send(JSON.stringify(events));
    } catch {
      resolve(false);
    }
  });
}

/**
 * 创建内置的三阶自适应传输上报执行器 (Reporter)。
 *
 * @param reportUrl 上报接收端点 URL
 * @returns 标准 reporter 执行函数
 */
export function createDefaultReporter(
  reportUrl?: string,
): (events: MonitorEvent[]) => Promise<void> {
  return async (events: MonitorEvent[]): Promise<void> => {
    if (!reportUrl || !events || events.length === 0) {
      return;
    }

    // 1. 优先尝试 sendBeacon
    const beaconSuccess = sendBeaconTransport(reportUrl, events);
    if (beaconSuccess) {
      return;
    }

    // 2. 降级尝试 fetch { keepalive: true }
    const fetchSuccess = await fetchTransport(reportUrl, events);
    if (fetchSuccess) {
      return;
    }

    // 3. 兜底使用 XMLHttpRequest
    await xhrTransport(reportUrl, events);
  };
}
