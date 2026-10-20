/**
 * 纯原生受管防抖与节流微工具。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { tryOnScopeDispose } from './lifecycle';

/**
 * 带有取消能力的受控函数接口。
 */
export type ControlledFn<T extends (...args: unknown[]) => unknown> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
};

/**
 * 纯原生防抖函数，在作用域销毁时确定性自动取消未决定时器。
 *
 * @param fn 目标执行函数
 * @param delay 防抖延迟毫秒数
 * @returns 防抖包装后的受控函数
 */
export function useDebounceFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 200,
): ControlledFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const debounced = (...args: Parameters<T>) => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = cancel;
  tryOnScopeDispose(cancel);

  return debounced;
}

/**
 * 纯原生节流函数，在作用域销毁时确定性自动取消未决定时器。
 *
 * @param fn 目标执行函数
 * @param interval 节流间隔毫秒数
 * @returns 节流包装后的受控函数
 */
export function useThrottleFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number = 200,
): ControlledFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTime = 0;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = interval - (now - lastTime);

    if (remaining <= 0 || remaining > interval) {
      cancel();
      lastTime = now;
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        lastTime = Date.now();
        fn(...args);
      }, remaining);
    }
  };

  throttled.cancel = cancel;
  tryOnScopeDispose(cancel);

  return throttled;
}
