/**
 * useBarcode 一维条形码无头渲染与状态机 Composable。
 *
 * 封装格式离线预检、SVG/Canvas 渲染管道调度与错误状态管理。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, readonly, type MaybeRefOrGetter, toValue } from 'vue';
import JsBarcode from 'jsbarcode';
import type { BarcodeFormat, BarcodeRenderOptions, BarcodeValidationResult } from '../types';
import { validateBarcode } from '../utils/validator';

export interface UseBarcodeReturn {
  /** 当前条码内容与格式是否合法 */
  isValid: Readonly<import('vue').Ref<boolean>>;
  /** 格式校验失败时的错误诊断信息 */
  errorMessage: Readonly<import('vue').Ref<string>>;
  /** 主动执行条码离线校验 */
  validate: (value: string, format?: BarcodeFormat) => BarcodeValidationResult;
  /** 手动执行条码重绘渲染 */
  render: (
    element: SVGSVGElement | HTMLCanvasElement,
    value: string,
    options?: BarcodeRenderOptions,
  ) => BarcodeValidationResult;
}

/**
 * 一维条形码无头状态机 Hook。
 *
 * @param defaultOptions 默认渲染选项
 * @returns 响应式状态与渲染方法集合
 */
export function useBarcode(
  defaultOptions?: MaybeRefOrGetter<BarcodeRenderOptions>,
): UseBarcodeReturn {
  const isValid = ref(true);
  const errorMessage = ref('');

  /**
   * 离线格式前置校验。
   */
  const validate = (value: string, format?: BarcodeFormat): BarcodeValidationResult => {
    const opts = toValue(defaultOptions) ?? {};
    const targetFormat = format ?? opts.format ?? 'CODE128';
    return validateBarcode(value, targetFormat);
  };

  /**
   * 在给定的 SVG 或 Canvas 元素上执行条码绘制。
   */
  const render = (
    element: SVGSVGElement | HTMLCanvasElement,
    value: string,
    options?: BarcodeRenderOptions,
  ): BarcodeValidationResult => {
    const mergedOptions: BarcodeRenderOptions = {
      format: 'CODE128',
      renderType: 'svg',
      width: 2,
      height: 100,
      displayValue: true,
      textPosition: 'bottom',
      textAlign: 'center',
      fontSize: 20,
      font: 'monospace',
      textMargin: 2,
      margin: 10,
      lineColor: '#000000',
      background: '#ffffff',
      ...toValue(defaultOptions),
      ...options,
    };

    // 1. 前置离线校验，拦截非法格式与空值，彻底防白屏
    const validation = validateBarcode(value, mergedOptions.format);
    if (!validation.valid) {
      isValid.value = false;
      errorMessage.value = validation.message ?? '无效的条码数据';
      return validation;
    }

    // 2. 组装 JsBarcode 原生配置
    const doc = element.ownerDocument || (typeof document !== 'undefined' ? document : undefined);
    const jsBarcodeOpts: Record<string, unknown> = {
      xmlDocument: doc,
      format: mergedOptions.format,
      width: mergedOptions.width,
      height: mergedOptions.height,
      displayValue: mergedOptions.displayValue,
      textPosition: mergedOptions.textPosition,
      textAlign: mergedOptions.textAlign,
      fontSize: mergedOptions.fontSize,
      font: mergedOptions.font,
      textMargin: mergedOptions.textMargin,
      margin: mergedOptions.margin,
      lineColor: mergedOptions.lineColor,
      background: mergedOptions.background,
    };

    if (mergedOptions.marginTop !== undefined) jsBarcodeOpts.marginTop = mergedOptions.marginTop;
    if (mergedOptions.marginBottom !== undefined)
      jsBarcodeOpts.marginBottom = mergedOptions.marginBottom;
    if (mergedOptions.marginLeft !== undefined) jsBarcodeOpts.marginLeft = mergedOptions.marginLeft;
    if (mergedOptions.marginRight !== undefined)
      jsBarcodeOpts.marginRight = mergedOptions.marginRight;

    // 3. 处理肉眼防错展示格式化管道
    if (typeof mergedOptions.formatText === 'function') {
      try {
        jsBarcodeOpts.text = mergedOptions.formatText(value);
      } catch {
        jsBarcodeOpts.text = value;
      }
    }

    // 4. 调用底层引擎绘制，包覆异常防止底层同步抛出
    try {
      JsBarcode(element, value, jsBarcodeOpts);
      isValid.value = true;
      errorMessage.value = '';
      return { valid: true, normalizedValue: value };
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err);
      isValid.value = false;
      errorMessage.value = `条码渲染异常: ${errText}`;
      return { valid: false, message: errorMessage.value };
    }
  };

  return {
    isValid: readonly(isValid),
    errorMessage: readonly(errorMessage),
    validate,
    render,
  };
}
