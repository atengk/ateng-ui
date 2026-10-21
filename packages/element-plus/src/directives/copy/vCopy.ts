/**
 * 剪贴板一键复制指令实现。
 *
 * 优先采用现代标准的 navigator.clipboard.writeText 进行异步复制；
 * 在非安全上下文（HTTP）或旧版浏览器环境中，自动无缝降级至 document.execCommand('copy') 兼容方案。
 * 支持纯字符串、数字、动态 Getter 箭头函数以及高级配置对象（配置静默复制、自定义文案与成功/失败回调）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ElMessage } from 'element-plus';
import type { DirectiveBinding } from 'vue';
import type { CopyDirective, CopyDirectiveValue, CopyOptions } from './types';

/**
 * 默认复制成功提示文案。
 */
export const DEFAULT_COPY_SUCCESS_MESSAGE: string = '复制成功';

/**
 * 指令内部上下文状态。
 */
interface CopyState {
  bindingValue: CopyDirectiveValue;
  clickHandler: (event: MouseEvent) => void;
}

const stateMap = new WeakMap<HTMLElement, CopyState>();

/**
 * 解析并提取待复制的最终纯文本内容。
 *
 * @param value 指令入参值
 * @param el 宿主 DOM 元素
 * @returns 待复制文本
 */
export function resolveCopyText(value: CopyDirectiveValue, el: HTMLElement): string {
  // 1. 若无入参，保底从宿主元素自身内容提取（input 取 value，其他元素取 textContent）
  if (value === undefined || value === null) {
    if ('value' in el && typeof (el as HTMLInputElement).value === 'string') {
      return (el as HTMLInputElement).value;
    }
    return el.textContent?.trim() ?? '';
  }

  // 2. 动态 Getter 箭头函数求值
  if (typeof value === 'function') {
    const res = value();
    return res === undefined || res === null ? '' : String(res);
  }

  // 3. 高级配置对象
  if (typeof value === 'object') {
    const rawVal = value.value;
    if (typeof rawVal === 'function') {
      const res = rawVal();
      return res === undefined || res === null ? '' : String(res);
    }
    if (rawVal !== undefined && rawVal !== null) {
      return String(rawVal);
    }
    // 未显式指定 value，保底读取宿主 DOM 内容
    if ('value' in el && typeof (el as HTMLInputElement).value === 'string') {
      return (el as HTMLInputElement).value;
    }
    return el.textContent?.trim() ?? '';
  }

  // 4. 普通字符串或数字
  return String(value);
}

/**
 * 基于 document.execCommand 的剪贴板降级复制方案。
 *
 * @param text 待写入剪贴板文本
 * @returns 复制结果 Promise
 */
function copyByExecCommand(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // 样式完全移出可视区域
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        resolve();
      } else {
        reject(new Error('execCommand copy failed'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 将文本写入系统剪贴板（含现代 API 与降级方案）。
 *
 * @param text 待写入剪贴板文本
 * @returns 复制结果 Promise
 */
export async function writeClipboard(text: string): Promise<void> {
  // 1. 优先尝试现代 navigator.clipboard API（需处于安全上下文或具备能力）
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 权限拒绝或调用报错时降级至 execCommand
    }
  }

  // 2. 降级方案
  await copyByExecCommand(text);
}

/**
 * 触发复制动作的主流程。
 *
 * @param el 宿主 DOM 元素
 * @param value 指令入参值
 */
async function performCopy(el: HTMLElement, value: CopyDirectiveValue): Promise<void> {
  const text = resolveCopyText(value, el);
  const options: CopyOptions = typeof value === 'object' && value !== null ? value : {};

  try {
    // 1. 写入系统剪贴板
    await writeClipboard(text);

    // 2. 复制成功反馈
    if (options.message !== false) {
      const msg =
        typeof options.message === 'string' ? options.message : DEFAULT_COPY_SUCCESS_MESSAGE;
      ElMessage.success(msg);
    }
    options.onSuccess?.(text);
  } catch (error) {
    // 3. 复制失败反馈
    ElMessage.error('复制失败');
    options.onError?.(error);
  }
}

/**
 * 剪贴板复制指令 v-copy。
 */
export const vCopy: CopyDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<CopyDirectiveValue>) {
    // 1. 初始化指令状态并绑定点击事件
    const clickHandler = () => {
      const state = stateMap.get(el);
      void performCopy(el, state?.bindingValue);
    };

    stateMap.set(el, {
      bindingValue: binding.value,
      clickHandler,
    });

    el.addEventListener('click', clickHandler);
  },

  updated(el: HTMLElement, binding: DirectiveBinding<CopyDirectiveValue>) {
    // 1. 同步更新最新绑定值
    const state = stateMap.get(el);
    if (state) {
      state.bindingValue = binding.value;
    }
  },

  beforeUnmount(el: HTMLElement) {
    // 1. 确定性解绑事件监听并清理引用
    const state = stateMap.get(el);
    if (state) {
      el.removeEventListener('click', state.clickHandler);
      stateMap.delete(el);
    }
  },
};
