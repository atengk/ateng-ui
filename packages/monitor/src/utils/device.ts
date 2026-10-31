/**
 * 宿主环境与设备信息安全探测工具。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { DeviceContext } from '../types/context';

/**
 * 提取当前宿主浏览器与视口设备元数据快照。
 * 在 SSR 或无窗口环境中具备完整的安全保底防御。
 *
 * @returns 规范化的设备上下文实体
 */
export function getDeviceContext(): DeviceContext {
  const isBrowser = typeof window !== 'undefined';
  const nav = isBrowser ? window.navigator : undefined;
  const screen = isBrowser ? window.screen : undefined;

  let connectionType: string | undefined;
  if (nav && 'connection' in nav) {
    const conn = (nav as unknown as { connection?: { effectiveType?: string; type?: string } })
      .connection;
    connectionType = conn?.effectiveType || conn?.type;
  }

  return {
    userAgent: nav?.userAgent || 'unknown',
    language: nav?.language || 'unknown',
    viewport: {
      width: isBrowser ? window.innerWidth || document.documentElement?.clientWidth || 0 : 0,
      height: isBrowser ? window.innerHeight || document.documentElement?.clientHeight || 0 : 0,
    },
    screen: {
      width: screen?.width || 0,
      height: screen?.height || 0,
    },
    pixelRatio: isBrowser ? window.devicePixelRatio || 1 : 1,
    online: nav ? nav.onLine !== false : true,
    connectionType,
  };
}

/**
 * 获取当前页面完整 URL。
 *
 * @returns 当前页面地址，若无 window 则返回空字符串
 */
export function getCurrentUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.href;
  }
  return '';
}

/**
 * 获取当前页面标题。
 *
 * @returns 页面标题
 */
export function getDocumentTitle(): string {
  if (typeof document !== 'undefined') {
    return document.title || '';
  }
  return '';
}
