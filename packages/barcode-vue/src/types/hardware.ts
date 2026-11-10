/**
 * @atengk/barcode-vue 物理硬件扫码枪强类型契约。
 *
 * 依据 ADR-0047，定义手持扫码枪（HID 虚拟键盘输入）时序捕获参数、
 * 表单防污染守卫策略与状态机强类型。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Ref, Directive } from 'vue';

/**
 * 手持物理扫码枪监听配置项。
 */
export interface HardwareScannerOptions {
  /** 连续击键最大间隔判定阈值 (ms)，默认 30ms */
  maxIntervalMs?: number;
  /** 条码结束判定按键数组，默认 ['Enter', 'Tab'] */
  endKeys?: string[];
  /** 有效条码的最短字符长度，默认 3 */
  minLength?: number;
  /** 是否开启表单防污染守卫 (拦截普通输入框污染与回车提交)，默认 true */
  preventInputPollution?: boolean;
  /** 监听的目标元素，默认 window */
  target?: HTMLElement | Window;
  /** 扫码成功是否播放声音反馈，默认 true */
  beepFeedback?: boolean;
  /** 扫码成功是否触发震动反馈，默认 true */
  vibrateFeedback?: boolean;
  /** 同码防重复扫描冷却时间 (ms)，默认 1000 */
  duplicateIntervalMs?: number;
  /** 扫码前缀清除正则或字符串 */
  prefix?: string | RegExp;
  /** 扫码后缀清除正则或字符串 */
  suffix?: string | RegExp;
  /** 扫码识别成功回调 */
  onScan?: (code: string) => void;
}

/**
 * 手持物理扫码枪无头状态机返回值。
 */
export interface UseHardwareScannerReturn {
  /** 是否处于硬件键盘事件持续监听中 */
  isListening: Readonly<Ref<boolean>>;
  /** 最近一次成功扫描的条码内容 */
  lastScannedCode: Readonly<Ref<string | null>>;
  /** 最近一次成功扫描的时间戳 (毫秒) */
  lastScannedTime: Readonly<Ref<number | null>>;
  /** 当前生命周期内累计成功扫描的件数 */
  totalScannedCount: Readonly<Ref<number>>;

  /** 启动物理扫码枪键盘监听 */
  startListening: () => void;
  /** 停止物理扫码枪键盘监听并彻底清理事件句柄 */
  stopListening: () => void;
  /** 重置当前击键缓冲区 */
  resetBuffer: () => void;
  /** 重置同码防重冷却记录 */
  resetDeduplication: () => void;
}

/**
 * 靶向输入框接收标记指令契约。
 */
export type HardwareScannerReceiverDirective = Directive<HTMLElement, boolean | undefined>;
