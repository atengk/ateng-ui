/**
 * 轻量一键打印点击指令 v-print。
 *
 * 用于将 DOM 触发源（如操作按钮）声明式绑定至目标容器及指定打印驱动。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Directive, DirectiveBinding } from 'vue';
import { usePrint } from '../composables/usePrint';
import type { PrintBindingValue, PrintOptions } from '../types';

interface ExtendedHTMLElement extends HTMLElement {
  __atengPrintHandler__?: (e: Event) => void;
}

export const vPrint: Directive<ExtendedHTMLElement, PrintBindingValue> = {
  mounted(el: ExtendedHTMLElement, binding: DirectiveBinding<PrintBindingValue>) {
    const handler = async (e: Event) => {
      e.preventDefault();

      let target: string | HTMLElement = el;
      let options: PrintOptions | undefined;

      const val = binding.value;
      if (typeof val === 'string') {
        target = val;
      } else if (val instanceof HTMLElement) {
        target = val;
      } else if (val && typeof val === 'object') {
        const { target: targetOpt, ...restOptions } = val;
        if (targetOpt) {
          target = targetOpt;
        }
        options = restOptions;
      }

      const { print } = usePrint();
      try {
        await print(target, options);
      } catch {
        // 异常已在 usePrint 状态机内部转译与 onError 回调中分发
      }
    };

    el.__atengPrintHandler__ = handler;
    el.addEventListener('click', handler);
  },

  unmounted(el: ExtendedHTMLElement) {
    if (el.__atengPrintHandler__) {
      el.removeEventListener('click', el.__atengPrintHandler__);
      delete el.__atengPrintHandler__;
    }
  },
};
