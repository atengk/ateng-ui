/**
 * useStreamReconnect: 流媒体断流指数退避重连状态机。
 *
 * 遵循无头状态机与工业级生命周期防线：
 * 采用指数退避算法 min(baseDelay * 2^attempt, maxDelay) 伴随 ±20% 抖动防惊群风暴，
 * 达到最大上限后确定性转入硬失败态，支持倒计时观测与组件销毁时的定时器确定性清理。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { onScopeDispose, ref, shallowRef, toValue } from 'vue';
import type { StreamReconnectOptions, StreamReconnectReturn } from '../types';

export function useStreamReconnect(
  options: StreamReconnectOptions = {},
  reconnectHandler?: () => void | Promise<void>,
): StreamReconnectReturn {
  const isReconnecting = ref(false);
  const retryCount = ref(0);
  const hasFailed = ref(false);
  const lastError = shallowRef<unknown | null>(null);
  const remainingTime = ref(0);

  let timerHandle: ReturnType<typeof setTimeout> | null = null;
  let countdownHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * 清除当前执行中的一切计时器。
   */
  const clearTimers = (): void => {
    if (timerHandle !== null) {
      clearTimeout(timerHandle);
      timerHandle = null;
    }
    if (countdownHandle !== null) {
      clearInterval(countdownHandle);
      countdownHandle = null;
    }
    remainingTime.value = 0;
  };

  /**
   * 重置状态机至初始待机态。
   */
  const reset = (): void => {
    clearTimers();
    isReconnecting.value = false;
    retryCount.value = 0;
    hasFailed.value = false;
    lastError.value = null;
  };

  /**
   * 计算下一次重试的指数退避等待延迟。
   */
  const calculateDelay = (attempt: number): number => {
    const base = toValue(options.baseDelay ?? 1000);
    const max = toValue(options.maxDelay ?? 10000);
    const exponential = base * Math.pow(2, attempt);
    let delay = Math.min(exponential, max);

    // 默认开启 ±20% 抖动 (Jitter)，避免多终端网络恢复时并发冲击直播源
    if (options.jitter !== false) {
      const jitterFactor = 0.8 + Math.random() * 0.4;
      delay = Math.round(delay * jitterFactor);
    }

    return Math.max(delay, 200);
  };

  /**
   * 触发一次自动重连尝试。
   */
  const triggerReconnect = (err?: unknown): void => {
    const maxRetries = toValue(options.maxRetries ?? 5);

    lastError.value = err ?? null;

    // 1. 若当前重试计数已达上限，熔断转入硬失败态
    if (retryCount.value >= maxRetries) {
      clearTimers();
      isReconnecting.value = false;
      hasFailed.value = true;
      options.onFail?.(err);
      return;
    }

    // 2. 防重检查：若当前正在等待倒计时中，则不重复调度
    if (timerHandle !== null) {
      return;
    }

    clearTimers();
    isReconnecting.value = true;

    const delay = calculateDelay(retryCount.value);
    const currentAttempt = retryCount.value + 1;
    remainingTime.value = delay;

    // 3. 启动倒计时指示器（每 100ms 更新一次）
    const startTime = Date.now();
    countdownHandle = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, delay - elapsed);
      remainingTime.value = left;
    }, 100);

    // 4. 定时调度真实重试动作 (保持 isReconnecting 为 true，杜绝中途断层闪黑与报错弹窗闪现)
    timerHandle = setTimeout(async () => {
      if (countdownHandle !== null) {
        clearInterval(countdownHandle);
        countdownHandle = null;
      }
      timerHandle = null;
      remainingTime.value = 0;
      retryCount.value = currentAttempt;
      options.onRetry?.(currentAttempt, delay, err);

      try {
        if (reconnectHandler) {
          await reconnectHandler();
        }
        isReconnecting.value = false;
      } catch (retryErr: unknown) {
        // 本次重连尝试再度失败，继续下一轮指数退避
        isReconnecting.value = false;
        triggerReconnect(retryErr);
      }
    }, delay);
  };

  /**
   * 用户或界面发起的手动重试动作（重置失败态并立即调度）。
   */
  const manualRetry = (): void => {
    reset();
    triggerReconnect();
  };

  // 确定性生命周期清理防线：在当前响应式作用域注销时 100% 释放计时器
  onScopeDispose(() => {
    clearTimers();
  });

  return {
    isReconnecting,
    retryCount,
    hasFailed,
    lastError,
    remainingTime,
    triggerReconnect,
    reset,
    manualRetry,
  };
}
