/**
 * 交互容器统一异步确认状态机。
 *
 * 接管弹窗与抽屉的确定操作，自动编排 Loading 锁、成功自动关闭与抛错保持开启保护现场机制。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, toValue, type Ref, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { FormInstance } from 'element-plus';

export interface UseAsyncConfirmOptions {
  /**
   * 外部受控 loading。
   */
  controlledLoading?: Ref<boolean | undefined>;

  /**
   * 内嵌表单实例（支持 Ref 或 Getter 传入）。
   * 若配置，点击确定将自动优先执行 form.validate() 进行合法性校验。
   */
  formRef?: MaybeRefOrGetter<FormInstance | undefined | null>;

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

    // 1. 若配置了 formRef，优先执行表单合法性校验
    if (options.formRef) {
      const rawForm =
        typeof options.formRef === 'function' ? options.formRef() : toValue(options.formRef);
      const form = rawForm ? toValue(rawForm) : (rawForm as FormInstance | undefined | null);
      if (form && typeof form.validate === 'function') {
        try {
          const valid = await form.validate();
          if (valid === false) {
            return;
          }
        } catch {
          // Element Plus 在校验不通过时会 reject 失败字段对象，此处就地阻断
          // 绝不开启 loading，绝不调用 beforeConfirm，绝不关闭容器，保留现场错误提示
          return;
        }
      }
    }

    // 2. 表单校验通过（或未配置 formRef），触发外部 confirm 事件
    options.onConfirmEmit();

    // 3. 若无 beforeConfirm 钩子，直接关闭并触发成功
    if (!options.beforeConfirm) {
      options.onClose();
      options.onSuccess();
      return;
    }

    try {
      const result = options.beforeConfirm();

      // 4. 判断是否为 Promise
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
      // 5. 异步抛错时保持开启，杜绝表单数据丢失
    } finally {
      internalLoading.value = false;
    }
  };

  return {
    isLoading,
    handleConfirm,
  };
}
