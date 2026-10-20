/**
 * 生命周期受管资源清理与安全注销工具。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { getCurrentScope, onScopeDispose, watch, type MaybeRefOrGetter, toValue } from 'vue';

/**
 * 安全尝试在当前活跃的 effectScope 中注册销毁回调。
 *
 * @param fn 销毁时执行的清理函数
 * @returns 是否成功在活跃作用域中注册
 */
export function tryOnScopeDispose(fn: () => void): boolean {
  if (getCurrentScope()) {
    onScopeDispose(fn);
    return true;
  }
  return false;
}

/**
 * 受管事件监听器，并在作用域销毁时 100% 确定性注销。
 *
 * @param target 监听目标，支持普通 DOM 节点、Window 或 MaybeRefOrGetter
 * @param event 事件名称
 * @param listener 事件监听回调
 * @param options 事件监听选项
 * @returns 手动注销函数
 */
export function useEventListener<T extends EventTarget>(
  target: MaybeRefOrGetter<T | null | undefined>,
  event: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): () => void {
  let cleanup = () => {};

  const stopWatch = watch(
    () => toValue(target),
    el => {
      cleanup();
      if (!el) {
        return;
      }
      el.addEventListener(event, listener, options);
      cleanup = () => {
        el.removeEventListener(event, listener, options);
      };
    },
    { immediate: true, flush: 'sync' },
  );

  const stop = () => {
    stopWatch();
    cleanup();
  };

  tryOnScopeDispose(stop);

  return stop;
}
