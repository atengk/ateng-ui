/**
 * @atengk/barcode-vue useHardwareScanner 与表单防污染单测。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effectScope } from 'vue';
import { useHardwareScanner } from '../src/composables/useHardwareScanner';
import { vHardwareScannerReceiver } from '../src/directives/vHardwareScannerReceiver';
import { setAudioContextMock, resetAudioContextMock } from '../src/utils/audioFeedback';

describe('useHardwareScanner (物理扫码枪与表单防污染守卫)', () => {
  beforeEach(() => {
    setAudioContextMock({
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createGain: vi.fn().mockReturnValue({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    resetAudioContextMock();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  /**
   * 辅助工具：模拟向目标元素发送一系列带有特定时间戳的 keydown 事件。
   */
  function dispatchKeySeries(
    keys: string[],
    intervalMs: number,
    target: HTMLElement = document.body,
  ) {
    let currentTime = 1000;
    const events: KeyboardEvent[] = [];

    keys.forEach(key => {
      currentTime += intervalMs;
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });

      // 覆盖 timeStamp
      Object.defineProperty(event, 'timeStamp', {
        value: currentTime,
        configurable: true,
      });

      // 跟踪是否被拦截
      vi.spyOn(event, 'preventDefault');
      vi.spyOn(event, 'stopPropagation');

      events.push(event);
      target.dispatchEvent(event);
    });

    return events;
  }

  describe('时序分析与扫码枪高速脉冲识别', () => {
    it('高频脉冲输入 (15ms 间隔) 结尾附带 Enter 应精准识别为物理扫码枪', () => {
      const onScan = vi.fn();
      const scanner = useHardwareScanner({
        maxIntervalMs: 30,
        onScan,
      });

      // 模拟扫码枪输出 "690123" + "Enter"，每个按键间隔 15ms
      dispatchKeySeries(['6', '9', '0', '1', '2', '3', 'Enter'], 15);

      expect(onScan).toHaveBeenCalledWith('690123');
      expect(scanner.lastScannedCode.value).toBe('690123');
      expect(scanner.totalScannedCount.value).toBe(1);

      scanner.stopListening();
    });

    it('人类手动慢速打字 (120ms 间隔) 应被算法判定为人工作业，绝不误触扫码', () => {
      const onScan = vi.fn();
      const scanner = useHardwareScanner({
        maxIntervalMs: 30,
        onScan,
      });

      // 模拟人类按键，间隔 120ms
      dispatchKeySeries(['6', '9', '0', '1', '2', '3', 'Enter'], 120);

      expect(onScan).not.toHaveBeenCalled();
      expect(scanner.totalScannedCount.value).toBe(0);

      scanner.stopListening();
    });

    it('有效条码长度低于 minLength 时应被过滤丢弃', () => {
      const onScan = vi.fn();
      const scanner = useHardwareScanner({
        minLength: 4,
        onScan,
      });

      // 仅两个字符 + Enter
      dispatchKeySeries(['A', 'B', 'Enter'], 15);

      expect(onScan).not.toHaveBeenCalled();
      scanner.stopListening();
    });

    it('同码在 duplicateIntervalMs 内快速重复扫描应进行滑窗防重拦截', () => {
      const onScan = vi.fn();
      const scanner = useHardwareScanner({
        duplicateIntervalMs: 1500,
        onScan,
      });

      // 第一次扫码
      dispatchKeySeries(['S', 'A', 'M', 'E', 'Enter'], 15);
      expect(onScan).toHaveBeenCalledTimes(1);

      // 紧接着第二次相同扫码
      dispatchKeySeries(['S', 'A', 'M', 'E', 'Enter'], 15);
      expect(onScan).toHaveBeenCalledTimes(1);

      scanner.stopListening();
    });
  });

  describe('表单防污染守卫 (Form Guard)', () => {
    it('当焦点处于普通输入框时，扫码枪的高速脉冲应在捕获阶段被拦截防污染', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const scanner = useHardwareScanner({
        preventInputPollution: true,
      });

      const events = dispatchKeySeries(['1', '2', '3', 'Enter'], 15, input);

      // 从第二个脉冲字符开始及结束符 Enter，应被调用 preventDefault 拦截
      const preventedCount = events.filter(e => e.preventDefault).length;
      expect(preventedCount).toBeGreaterThan(0);

      scanner.stopListening();
    });

    it('人类正常在输入框打字时不应被防污染守卫误杀拦截', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const scanner = useHardwareScanner({
        preventInputPollution: true,
      });

      const events = dispatchKeySeries(['H', 'E', 'L', 'L', 'O'], 120, input);

      events.forEach(e => {
        expect(e.preventDefault).not.toHaveBeenCalled();
      });

      scanner.stopListening();
    });
  });

  describe('vHardwareScannerReceiver 靶向指令定向填充', () => {
    it('标记了指令的输入框能定向接收扫码结果并触发 input 事件', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      // 模拟挂载指令
      vHardwareScannerReceiver.mounted(input, { value: true } as any, null as any, null as any);

      const scanner = useHardwareScanner();
      const inputSpy = vi.fn();
      input.addEventListener('input', inputSpy);

      // 模拟扫码
      dispatchKeySeries(['B', 'A', 'R', 'C', 'O', 'D', 'E', 'Enter'], 15);

      expect(input.value).toBe('BARCODE');
      expect(inputSpy).toHaveBeenCalled();

      // 模拟卸载指令
      vHardwareScannerReceiver.unmounted(input, {} as any, null as any, null as any);
      scanner.stopListening();
    });
  });

  describe('确定性生命周期治理', () => {
    it('scope 销毁或调用 stopListening 时彻底移除事件监听', () => {
      const onScan = vi.fn();
      const scope = effectScope();
      let scanner: any;

      scope.run(() => {
        scanner = useHardwareScanner({ onScan });
      });

      expect(scanner.isListening.value).toBe(true);

      // 销毁 scope
      scope.stop();
      expect(scanner.isListening.value).toBe(false);

      // 再次发送扫码序列，已不触发
      dispatchKeySeries(['1', '2', '3', 'Enter'], 15);
      expect(onScan).not.toHaveBeenCalled();
    });
  });
});
