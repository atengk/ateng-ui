/**
 * @atengk/barcode-vue vHardwareScannerReceiver 靶向输入框接收标记指令。
 *
 * 依据 ADR-0047，标记某个输入框为物理扫码枪的唯一定向注入靶点。
 * 无论当前操作员光标处于页面的何处，扫码枪识别成功后均可自动定向填充至该输入框。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Directive } from 'vue';

/** 全局活跃的靶向接收输入框集合 */
const receiverElements = new Set<HTMLInputElement | HTMLTextAreaElement>();

/**
 * 从元素或其子树中解析得到实际的 input / textarea 元素。
 */
function resolveInputElement(el: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el;
  }
  return el.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
}

/**
 * 注册靶向输入框。
 */
export function registerReceiver(el: HTMLElement): void {
  const input = resolveInputElement(el);
  if (input) {
    input.setAttribute('data-at-hardware-scanner-receiver', 'true');
    receiverElements.add(input);
  }
}

/**
 * 注销靶向输入框。
 */
export function unregisterReceiver(el: HTMLElement): void {
  const input = resolveInputElement(el);
  if (input) {
    input.removeAttribute('data-at-hardware-scanner-receiver');
    receiverElements.delete(input);
  }
}

/**
 * 检查指定 DOM 元素是否属于已受管的靶向接收输入框。
 */
export function isReceiverElement(el: Element | null): boolean {
  if (!el) {
    return false;
  }
  return (
    el.getAttribute('data-at-hardware-scanner-receiver') === 'true' ||
    Boolean(el.closest('[data-at-hardware-scanner-receiver="true"]'))
  );
}

/**
 * 向当前所有已注册的靶向接收输入框定向派发条码内容。
 *
 * @param code 识别到的条码内容
 */
export function dispatchCodeToReceivers(code: string): void {
  receiverElements.forEach(input => {
    input.value = code;
    // 派发原生事件，确保 Vue v-model 与各类表单框架能够正常响应更新
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * v-hardware-scanner-receiver 靶向指令导出。
 */
export const vHardwareScannerReceiver: Directive<HTMLElement> = {
  mounted(el) {
    registerReceiver(el);
  },
  unmounted(el) {
    unregisterReceiver(el);
  },
};
