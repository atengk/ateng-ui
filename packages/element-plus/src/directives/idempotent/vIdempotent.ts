/**
 * 提交防重与前端幂等指令实现。
 *
 * 支持时间窗口防刷与异步 Promise 互斥锁双模：
 * 1. 时间窗口模式：在指定时间窗口内阻断连击，支持参数语法（如 v-idempotent:500）；
 * 2. 异步互斥锁模式：接管异步函数执行，执行期间自动联动 is-loading、is-disabled 与 disabled 属性；
 * 3. 拦截机制：在 DOM 捕获阶段注册监听，彻底切断下游业务绑定的点击处理；
 * 4. 防死锁机制：异步报错 (reject) 或同步异常确定性释放，配备可配置的超时兜底释放机制。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DirectiveBinding } from 'vue';
import type { IdempotentDirective, IdempotentDirectiveValue, IdempotentOptions } from './types';

/**
 * 默认时间窗口防刷间隔（毫秒）。
 */
export const DEFAULT_IDEMPOTENT_DELAY: number = 1000;

/**
 * 默认异步防死锁超时时间（毫秒）。
 */
export const DEFAULT_IDEMPOTENT_TIMEOUT: number = 30000;

/**
 * 指令内部运行态上下文。
 */
interface IdempotentState {
  options: IdempotentOptions;
  isLocked: boolean;
  isDestroyed: boolean;
  delayTimer: ReturnType<typeof setTimeout> | null;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
  originalDisabled: boolean;
  wasDisabledApplied: boolean;
  captureListener: (event: MouseEvent) => void;
}

const stateMap = new WeakMap<HTMLElement, IdempotentState>();

/**
 * 规范化解析指令入参为标准配置对象。
 *
 * @param value 指令绑定值
 * @param arg 指令参数（如 v-idempotent:500 中的 500）
 * @param modifiers 指令修饰符（如 .noFeedback）
 * @returns 规范化的配置项
 */
function resolveOptions(
  value: IdempotentDirectiveValue,
  arg?: string,
  modifiers?: Record<string, boolean | undefined>,
): IdempotentOptions {
  let options: IdempotentOptions;

  if (typeof value === 'number') {
    options = {
      delay: value > 0 ? value : DEFAULT_IDEMPOTENT_DELAY,
      feedback: true,
    };
  } else if (typeof value === 'function') {
    options = {
      handler: value,
      timeout: DEFAULT_IDEMPOTENT_TIMEOUT,
      feedback: true,
    };
  } else if (value && typeof value === 'object') {
    options = {
      handler: typeof value.handler === 'function' ? value.handler : undefined,
      delay:
        typeof value.delay === 'number' && value.delay > 0 ? value.delay : DEFAULT_IDEMPOTENT_DELAY,
      timeout:
        typeof value.timeout === 'number' && value.timeout > 0
          ? value.timeout
          : DEFAULT_IDEMPOTENT_TIMEOUT,
      feedback: value.feedback !== false,
    };
  } else {
    options = {
      delay: DEFAULT_IDEMPOTENT_DELAY,
      timeout: DEFAULT_IDEMPOTENT_TIMEOUT,
      feedback: true,
    };
  }

  // 1. 支持 v-idempotent:500 参数语法
  if (arg && !Number.isNaN(Number(arg)) && Number(arg) > 0) {
    options.delay = Number(arg);
  }

  // 2. 支持修饰符 .noFeedback
  if (modifiers?.noFeedback) {
    options.feedback = false;
  }

  return options;
}

/**
 * 为宿主元素装配加载与置灰视觉反馈及禁用状态。
 *
 * @param el 宿主 DOM 元素
 * @param state 内部运行态
 */
function applyFeedback(el: HTMLElement, state: IdempotentState): void {
  if (state.options.feedback === false) {
    return;
  }
  el.classList.add('is-loading', 'is-disabled');
  if ('disabled' in el) {
    const buttonEl = el as HTMLButtonElement;
    state.originalDisabled = buttonEl.disabled;
    buttonEl.disabled = true;
    state.wasDisabledApplied = true;
  }
  el.setAttribute('aria-disabled', 'true');
}

/**
 * 清除宿主元素的视觉反馈并还原初始交互状态。
 *
 * @param el 宿主 DOM 元素
 * @param state 内部运行态
 */
function removeFeedback(el: HTMLElement, state: IdempotentState): void {
  el.classList.remove('is-loading', 'is-disabled');
  if (state.wasDisabledApplied && 'disabled' in el) {
    (el as HTMLButtonElement).disabled = state.originalDisabled;
    state.wasDisabledApplied = false;
  }
  el.removeAttribute('aria-disabled');
}

/**
 * 释放互斥锁并恢复初始状态。
 *
 * @param el 宿主 DOM 元素
 * @param state 内部运行态
 */
function unlock(el: HTMLElement, state: IdempotentState): void {
  state.isLocked = false;
  if (state.delayTimer !== null) {
    clearTimeout(state.delayTimer);
    state.delayTimer = null;
  }
  if (state.timeoutTimer !== null) {
    clearTimeout(state.timeoutTimer);
    state.timeoutTimer = null;
  }
  if (!state.isDestroyed) {
    removeFeedback(el, state);
  }
}

/**
 * 创建捕获阶段的事件监听处理器。
 *
 * @param el 宿主 DOM 元素
 * @returns 捕获事件处理器
 */
function createCaptureListener(el: HTMLElement): (event: MouseEvent) => void {
  return (event: MouseEvent) => {
    const state = stateMap.get(el);
    if (!state) {
      return;
    }

    // 1. 若当前已处于锁定状态，在原生捕获阶段彻底阻断事件向下传递与默认行为
    if (state.isLocked) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }

    const { options } = state;

    // 2. 异步 Promise 互斥锁模式（配置了 handler 处理函数）
    if (options.handler) {
      event.stopImmediatePropagation();
      event.preventDefault();

      state.isLocked = true;
      applyFeedback(el, state);

      // 配置超时兜底释放定时器，防止异步任务挂起引发页面死锁
      const timeoutMs = options.timeout ?? DEFAULT_IDEMPOTENT_TIMEOUT;
      state.timeoutTimer = setTimeout(() => {
        unlock(el, state);
      }, timeoutMs);

      try {
        const result = options.handler(event);
        if (
          result !== null &&
          typeof result === 'object' &&
          typeof (result as Promise<unknown>).then === 'function'
        ) {
          Promise.resolve(result)
            .catch(() => {
              // 静默吸收内部拦截链异常，由业务方外部 Promise 自行消费，杜绝未捕获告警
            })
            .finally(() => {
              unlock(el, state);
            });
        } else {
          // 同步调用，在微任务阶段释放
          queueMicrotask(() => {
            unlock(el, state);
          });
        }
      } catch (err) {
        unlock(el, state);
        throw err;
      }
      return;
    }

    // 3. 时间窗口防刷模式（无 handler）：放行本次点击，同时进入锁定态并开启窗口倒计时
    state.isLocked = true;
    const delayMs = options.delay ?? DEFAULT_IDEMPOTENT_DELAY;
    state.delayTimer = setTimeout(() => {
      unlock(el, state);
    }, delayMs);
  };
}

/**
 * 提交防重与前端幂等指令 v-idempotent。
 */
export const vIdempotent: IdempotentDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<IdempotentDirectiveValue>) {
    // 1. 初始化指令状态并绑定捕获监听器
    const options = resolveOptions(binding.value, binding.arg, binding.modifiers);
    const captureListener = createCaptureListener(el);
    const state: IdempotentState = {
      options,
      isLocked: false,
      isDestroyed: false,
      delayTimer: null,
      timeoutTimer: null,
      originalDisabled: false,
      wasDisabledApplied: false,
      captureListener,
    };
    stateMap.set(el, state);

    // 2. 注册原生 DOM 捕获阶段点击监听（capture = true）
    el.addEventListener('click', captureListener, true);
  },

  updated(el: HTMLElement, binding: DirectiveBinding<IdempotentDirectiveValue>) {
    // 1. 同步更新最新配置项
    const state = stateMap.get(el);
    if (state) {
      state.options = resolveOptions(binding.value, binding.arg, binding.modifiers);
    }
  },

  beforeUnmount(el: HTMLElement) {
    // 1. 确定性解绑原生监听器与清理定时器资源
    const state = stateMap.get(el);
    if (state) {
      state.isDestroyed = true;
      el.removeEventListener('click', state.captureListener, true);
      unlock(el, state);
      stateMap.delete(el);
    }
  },
};
