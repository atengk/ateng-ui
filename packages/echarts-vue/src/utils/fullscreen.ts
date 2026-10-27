/**
 * 全屏与脱壳操作工具方法集合。
 *
 * @author Ateng
 * @since 2026-10-27
 */

/**
 * 探测当前宿主环境是否支持原生浏览器全屏 API。
 */
export function isNativeFullscreenSupported(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return Boolean(
    document.fullscreenEnabled ||
    // @ts-expect-error webkit prefix fallback
    document.webkitFullscreenEnabled ||
    // @ts-expect-error moz prefix fallback
    document.mozFullScreenEnabled ||
    // @ts-expect-error ms prefix fallback
    document.msFullscreenEnabled,
  );
}

/**
 * 探测指定 DOM 元素当前是否处于浏览器原生全屏状态中。
 */
export function isElementInNativeFullscreen(element: HTMLElement | null): boolean {
  if (!element || typeof document === 'undefined') {
    return false;
  }

  const currentFullscreenElement =
    document.fullscreenElement ||
    // @ts-expect-error webkit prefix fallback
    document.webkitFullscreenElement ||
    // @ts-expect-error moz prefix fallback
    document.mozFullScreenElement ||
    // @ts-expect-error ms prefix fallback
    document.msFullscreenElement;

  return currentFullscreenElement === element;
}

/**
 * 请求将指定 DOM 元素进入浏览器原生全屏。
 */
export async function requestNativeFullscreen(element: HTMLElement): Promise<boolean> {
  if (!element || typeof document === 'undefined') {
    return false;
  }

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    }
    // @ts-expect-error webkit prefix fallback
    if (element.webkitRequestFullscreen) {
      // @ts-expect-error webkit prefix fallback
      await element.webkitRequestFullscreen();
      return true;
    }
    // @ts-expect-error moz prefix fallback
    if (element.mozRequestFullScreen) {
      // @ts-expect-error moz prefix fallback
      await element.mozRequestFullScreen();
      return true;
    }
    // @ts-expect-error ms prefix fallback
    if (element.msRequestFullscreen) {
      // @ts-expect-error ms prefix fallback
      await element.msRequestFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[AtengECharts] 原生全屏请求被拒绝或不支持:', err);
    return false;
  }
}

/**
 * 退出浏览器原生全屏状态。
 */
export async function exitNativeFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    }
    // @ts-expect-error webkit prefix fallback
    if (document.webkitExitFullscreen) {
      // @ts-expect-error webkit prefix fallback
      await document.webkitExitFullscreen();
      return true;
    }
    // @ts-expect-error moz prefix fallback
    if (document.mozCancelFullScreen) {
      // @ts-expect-error moz prefix fallback
      await document.mozCancelFullScreen();
      return true;
    }
    // @ts-expect-error ms prefix fallback
    if (document.msExitFullscreen) {
      // @ts-expect-error ms prefix fallback
      await document.msExitFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[AtengECharts] 退出原生全屏失败:', err);
    return false;
  }
}
