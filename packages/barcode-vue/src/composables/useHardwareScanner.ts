/**
 * @atengk/barcode-vue useHardwareScanner 物理手持扫码枪无头状态机。
 *
 * 依据 ADR-0047，提供毫秒级击键时序捕获（< 30ms 脉冲聚合）、
 * 表单防污染守卫（Form Guard 阻止普通输入框字符污染与回车意外提交）、
 * 靶向输入框定向填充与确定性生命周期治理。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, readonly, onScopeDispose, getCurrentScope } from 'vue';
import type { HardwareScannerOptions, UseHardwareScannerReturn } from '../types/hardware';
import { playSuccessFeedback } from '../utils/audioFeedback';
import { isReceiverElement, dispatchCodeToReceivers } from '../directives/vHardwareScannerReceiver';

/** 辅助功能键过滤列表，不计入字符脉冲 */
const IGNORED_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/**
 * 手持物理扫码枪无头监听 Hook。
 *
 * @param options 硬件扫描与防污染配置项
 * @returns 硬件扫码状态机与控制门面
 */
export function useHardwareScanner(options?: HardwareScannerOptions): UseHardwareScannerReturn {
  const isListening = ref(false);
  const lastScannedCode = ref<string | null>(null);
  const lastScannedTime = ref<number | null>(null);
  const totalScannedCount = ref(0);

  const maxInterval = options?.maxIntervalMs ?? 30;
  const minLength = options?.minLength ?? 3;
  const endKeys = new Set(options?.endKeys ?? ['Enter', 'Tab']);
  const preventPollution = options?.preventInputPollution ?? true;
  const duplicateInterval = options?.duplicateIntervalMs ?? 1000;

  // 击键缓存队列
  let keyBuffer: Array<{ key: string; time: number }> = [];
  let lastKeyTimestamp = 0;

  // 同码去重防刷记录
  let lastReportedCode: string | null = null;
  let lastReportedTime = 0;

  /**
   * 重置当前字符缓冲区。
   */
  const resetBuffer = (): void => {
    keyBuffer = [];
    lastKeyTimestamp = 0;
  };

  /**
   * 重置同码防重复扫描冷却滑窗。
   */
  const resetDeduplication = (): void => {
    lastReportedCode = null;
    lastReportedTime = 0;
  };

  /**
   * 清洗条码前缀与后缀。
   */
  const sanitizeBarcode = (rawCode: string): string => {
    let result = rawCode;
    if (options?.prefix) {
      if (typeof options.prefix === 'string' && result.startsWith(options.prefix)) {
        result = result.slice(options.prefix.length);
      } else if (options.prefix instanceof RegExp) {
        result = result.replace(options.prefix, '');
      }
    }
    if (options?.suffix) {
      if (typeof options.suffix === 'string' && result.endsWith(options.suffix)) {
        result = result.slice(0, -options.suffix.length);
      } else if (options.suffix instanceof RegExp) {
        result = result.replace(options.suffix, '');
      }
    }
    return result.trim();
  };

  /**
   * 键盘按键事件核心处理句柄（在捕获阶段执行以支撑防污染守卫）。
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key;

    // 过滤无意义功能键
    if (IGNORED_KEYS.has(key)) {
      return;
    }

    const now =
      typeof event.timeStamp === 'number' && event.timeStamp > 0 ? event.timeStamp : Date.now();
    const interval = now - lastKeyTimestamp;

    // 1. 判定是否为结束符 (Enter / Tab)
    if (endKeys.has(key)) {
      // 只有缓冲区字符满足最短条码长度时才判定为扫码枪结束
      if (keyBuffer.length >= minLength) {
        // 100% 判定为物理扫码枪完成，强力拦截默认的回车提交或焦点跳跃
        event.preventDefault();
        event.stopPropagation();

        const rawCode = keyBuffer.map(item => item.key).join('');
        const finalCode = sanitizeBarcode(rawCode);

        // 检查同码滑窗去重
        const isSameCode = finalCode === lastReportedCode;
        const isCooldown = now - lastReportedTime < duplicateInterval;

        if (!(isSameCode && isCooldown)) {
          lastReportedCode = finalCode;
          lastReportedTime = now;

          // 触发原生声音与震动反馈
          playSuccessFeedback({
            sound: options?.beepFeedback,
            vibrate: options?.vibrateFeedback,
          });

          // 向已标记的靶向输入框定向填充
          dispatchCodeToReceivers(finalCode);

          lastScannedCode.value = finalCode;
          lastScannedTime.value = Date.now();
          totalScannedCount.value += 1;
          options?.onScan?.(finalCode);
        }

        resetBuffer();
        return;
      }

      // 未达到条码最小长度，视为人类正常按回车，清空缓冲区并不予拦截
      resetBuffer();
      return;
    }

    // 2. 判定普通内容字符时序
    if (key.length === 1) {
      const isHighFrequency = interval <= maxInterval;

      if (!isHighFrequency) {
        // 间隔超时，说明之前击键已中断或属于人类打字，重置缓冲区并存入当前字符
        keyBuffer = [{ key, time: now }];
      } else {
        // 属于高速连续脉冲字符
        keyBuffer.push({ key, time: now });

        // 表单防污染守卫：若当前焦点处于普通未授权输入框，强行拦截打字事件
        if (preventPollution) {
          const target = (event.target ||
            (typeof document !== 'undefined' ? document.activeElement : null)) as Element | null;
          const isInputField =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            Boolean((target as HTMLElement)?.isContentEditable);

          if (isInputField && !isReceiverElement(target)) {
            event.preventDefault();
            event.stopPropagation();

            // 若首个字符在尚未确认脉冲时误打入文本框，尝试进行末位字符回退消除
            if (
              keyBuffer.length === 2 &&
              (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
            ) {
              if (target.value && target.value.endsWith(keyBuffer[0]?.key ?? '')) {
                target.value = target.value.slice(0, -1);
                target.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          }
        }
      }

      lastKeyTimestamp = now;
    }
  };

  /**
   * 启动物理扫码枪监听器。
   */
  const startListening = (): void => {
    if (isListening.value) {
      return;
    }

    const targetEl = options?.target ?? (typeof window !== 'undefined' ? window : null);
    if (targetEl && typeof targetEl.addEventListener === 'function') {
      targetEl.addEventListener('keydown', handleKeyDown as EventListener, {
        capture: true,
        passive: false,
      });
      isListening.value = true;
    }
  };

  /**
   * 停止物理扫码枪监听器并移除所有 DOM 句柄。
   */
  const stopListening = (): void => {
    if (!isListening.value) {
      return;
    }

    const targetEl = options?.target ?? (typeof window !== 'undefined' ? window : null);
    if (targetEl && typeof targetEl.removeEventListener === 'function') {
      targetEl.removeEventListener('keydown', handleKeyDown as EventListener, {
        capture: true,
      });
    }
    isListening.value = false;
    resetBuffer();
  };

  // 默认自动开始监听
  startListening();

  // 确定性生命周期治理：在作用域销毁时 100% 自动注销
  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopListening();
    });
  }

  return {
    isListening: readonly(isListening),
    lastScannedCode: readonly(lastScannedCode),
    lastScannedTime: readonly(lastScannedTime),
    totalScannedCount: readonly(totalScannedCount),
    startListening,
    stopListening,
    resetBuffer,
    resetDeduplication,
  };
}
