/**
 * useAntiFlicker 工业级防闪烁时序状态机。
 *
 * 核心契约：
 * 1. 150ms 延迟保护：请求在 150ms 内极速返回，Loading 绝不挂载（0ms 视觉打扰）；
 * 2. 300ms 最小展示期：耗时突破 150ms 阈值激活后，至少保证展示 300ms 最小周期并优雅淡出，彻底消除 1 帧闪现“鬼影”；
 * 3. 严格遵循确定性清理铁律：在 onScopeDispose 中自动清空内部所有活跃定时器。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import {
  ref,
  readonly,
  watch,
  toValue,
  onScopeDispose,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

/**
 * 防闪烁时序配置选项。
 */
export interface AntiFlickerOptions {
  /**
   * 静默延迟保护窗口（毫秒）。
   * 耗时低于此阈值时指示器不露头。
   *
   * @default 150
   */
  delay?: number;

  /**
   * 最小展示持续时间（毫秒）。
   * 突破延迟阈值后，至少保证展示的时长。
   *
   * @default 300
   */
  minDuration?: number;
}

/**
 * 包装布尔 loading 源，返回具备防闪烁时序保护的受控只读状态。
 *
 * @param source 原始布尔响应源（Ref、Getter 或原始值）
 * @param options 防闪烁时序配置
 * @returns 经过防闪烁保护的只读 Ref<boolean>
 */
export function useAntiFlicker(
  source: MaybeRefOrGetter<boolean>,
  options: AntiFlickerOptions = {},
): Readonly<Ref<boolean>> {
  const { delay = 150, minDuration = 300 } = options;

  const isPending = ref(false);
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let minDurationTimer: ReturnType<typeof setTimeout> | null = null;
  let showStartTime = 0;

  const clearAllTimers = () => {
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (minDurationTimer !== null) {
      clearTimeout(minDurationTimer);
      minDurationTimer = null;
    }
  };

  watch(
    () => toValue(source),
    active => {
      if (active) {
        // 清理上一次未完结的收尾定时器
        if (minDurationTimer !== null) {
          clearTimeout(minDurationTimer);
          minDurationTimer = null;
        }

        // 已经处于展示状态，无需重新延迟
        if (isPending.value) {
          return;
        }

        // 启动延迟静默窗口
        if (delay <= 0) {
          isPending.value = true;
          showStartTime = Date.now();
        } else {
          delayTimer = setTimeout(() => {
            isPending.value = true;
            showStartTime = Date.now();
            delayTimer = null;
          }, delay);
        }
      } else {
        // 请求结束
        // 1. 若仍在静默延迟窗口内，立即取消展示，指标从未露头 (0ms 视觉打扰)
        if (delayTimer !== null) {
          clearTimeout(delayTimer);
          delayTimer = null;
        }

        // 2. 若当前已经处于展示状态，计算已展示时长，强制满足 minDuration 最短保护期
        if (isPending.value) {
          const elapsed = Date.now() - showStartTime;
          const remaining = Math.max(0, minDuration - elapsed);

          if (remaining <= 0) {
            isPending.value = false;
          } else {
            minDurationTimer = setTimeout(() => {
              isPending.value = false;
              minDurationTimer = null;
            }, remaining);
          }
        }
      }
    },
    { immediate: true, flush: 'sync' },
  );

  // 物理销毁时 100% 确定性清理
  onScopeDispose(() => {
    clearAllTimers();
  });

  return readonly(isPending);
}
