/**
 * 交互容器统一异步确认状态机。
 *
 * 接管弹窗与抽屉的确定操作，自动编排 Loading 锁、成功自动关闭与抛错保持开启保护现场机制。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';

export interface UseAsyncConfirmOptions {
  /**
   * 外部受控 loading。
   */
  controlledLoading?: Ref<boolean | undefined>;

  /**
   * 确认前置钩子函数，支持异步 Promise。
   */
  beforeConfirm?: () => Promise<boolean | void> | boolean | void;

  /**
   * 触发关闭并更新可见性。
   */
  onClose: () => void;

  /**
   * 确认成功回调。
   */
  onSuccess: () => void;

  /**
   * 派发 confirm 事件。
   */
  onConfirmEmit: () => void;
}

export interface UseAsyncConfirmReturn {
  isLoading: ComputedRef<boolean>;
  handleConfirm: () => Promise<void>;
}

export function useAsyncConfirm(options: UseAsyncConfirmOptions): UseAsyncConfirmReturn {
  const internalLoading = ref(false);

  // 计算当前最终 loading 状态（受控优先）
  const isLoading = computed(() => {
    return options.controlledLoading?.value ?? internalLoading.value;
  });

  /**
   * 处理确定按钮点击。
   */
  const handleConfirm = async () => {
    if (isLoading.value) {
      return;
    }

    // 1. 触发外部 confirm 事件
    options.onConfirmEmit();

    // 2. 若无 beforeConfirm 钩子，直接关闭并触发成功
    if (!options.beforeConfirm) {
      options.onClose();
      options.onSuccess();
      return;
    }

    try {
      const result = options.beforeConfirm();

      // 3. 判断是否为 Promise
      if (
        result !== null &&
        typeof result === 'object' &&
        typeof (result as Promise<unknown>).then === 'function'
      ) {
        internalLoading.value = true;
        const shouldProceed = await result;

        // 若显式返回 false，则不关闭
        if (shouldProceed !== false) {
          options.onClose();
          options.onSuccess();
        }
      } else if (result !== false) {
        // 同步返回值且非 false
        options.onClose();
        options.onSuccess();
      }
    } catch {
      // 4. 异步抛错时保持开启，杜绝表单数据丢失
    } finally {
      internalLoading.value = false;
    }
  };

  return {
    isLoading,
    handleConfirm,
  };
}
