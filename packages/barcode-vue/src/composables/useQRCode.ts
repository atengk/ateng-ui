/**
 * @atengk/barcode-vue 艺术二维码响应式无头状态机。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import {
  ref,
  shallowRef,
  watch,
  onMounted,
  onScopeDispose,
  getCurrentInstance,
  getCurrentScope,
  toValue,
  type MaybeRefOrGetter,
} from 'vue';
import QRCodeStyling from 'qr-code-styling';
import type { Options as RawQRCodeStylingOptions } from 'qr-code-styling';
import { resolveQRCodePreset } from '../constants/presets';
import { elevateErrorCorrectionLevel, clampLogoSize, loadSafeImage } from '../utils/corsGuard';
import { exportQRCodeAsImage, downloadQRCodeImage } from '../utils/exportQRCode';
import type {
  QRCodeOptions,
  QRCodePreset,
  ExportQRCodeOptions,
  DownloadQRCodeOptions,
  UseQRCodeReturn,
} from '../types/qrcode';

/**
 * useQRCode 响应式配置参数契约。
 */
export interface UseQRCodeOptions extends QRCodeOptions {
  /**
   * 采用的企业级主题预设，默认为 'standard'。
   */
  preset?: QRCodePreset;
}

/**
 * 艺术二维码响应式状态机 Hook。
 *
 * @param container 挂载目标 DOM 容器引用
 * @param value 二维码字符串数据
 * @param options 二维码配置项与主题预设
 * @returns 状态机实例与操控契约
 */
export function useQRCode(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  value: MaybeRefOrGetter<string>,
  options?: MaybeRefOrGetter<UseQRCodeOptions | undefined>,
): UseQRCodeReturn {
  const qrCodeInstance = shallowRef<QRCodeStyling | null>(null);
  const isRendered = ref<boolean>(false);
  const error = ref<Error | null>(null);
  const logoError = ref<Error | null>(null);

  /**
   * 规范化并组装 QRCodeStyling 所需的最终配置。
   */
  async function compileOptions(): Promise<{
    stylingOptions: RawQRCodeStylingOptions;
    logicalWidth: number;
    logicalHeight: number;
    isCanvas: boolean;
    autoDpr: boolean;
  }> {
    const rawVal = toValue(value) || '';
    const rawOpts = toValue(options) || {};
    const preset = rawOpts.preset || 'standard';

    // 1. 深度解析并合并主题预设
    const merged = resolveQRCodePreset(preset, rawOpts);

    const logicalWidth = merged.width ?? 200;
    const logicalHeight = merged.height ?? 200;
    const isCanvas = merged.type !== 'svg';
    const autoDpr = merged.autoDpr !== false;

    // 2. 高分屏 Retina 自适应计算
    const dpr =
      isCanvas && autoDpr && typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const renderWidth = Math.round(logicalWidth * dpr);
    const renderHeight = Math.round(logicalHeight * dpr);

    const stylingOptions: RawQRCodeStylingOptions = {
      width: renderWidth,
      height: renderHeight,
      data: rawVal,
      margin: merged.margin ?? 0,
      type: merged.type ?? 'canvas',
      shape: merged.shape ?? 'square',
    };

    // 3. Logo 与容错自动提升安全护栏
    const rawLogo = merged.logo || merged.image;
    const hasLogo = !!rawLogo;
    const autoElevate = merged.autoElevateErrorCorrection !== false;

    const currentLevel = merged.qrOptions?.errorCorrectionLevel;
    const safeErrorLevel = elevateErrorCorrectionLevel(currentLevel, hasLogo, autoElevate);

    stylingOptions.qrOptions = {
      ...(merged.qrOptions || {}),
      errorCorrectionLevel: safeErrorLevel,
    };

    // 4. Logo 安全防干扰保护与跨域预检
    logoError.value = null;
    if (hasLogo && rawLogo) {
      const userImageOpts = merged.imageOptions || {};
      const safeImageOpts = {
        hideBackgroundDots: userImageOpts.hideBackgroundDots !== false,
        margin: userImageOpts.margin ?? 4,
        imageSize: clampLogoSize(userImageOpts.imageSize, 0.25, 0.3),
        crossOrigin: userImageOpts.crossOrigin || 'anonymous',
        saveAsBlob: userImageOpts.saveAsBlob,
      };

      stylingOptions.imageOptions = safeImageOpts;

      // CORS 跨域防污损守卫
      const checkResult = await loadSafeImage(rawLogo, safeImageOpts.crossOrigin);
      if (checkResult.success && checkResult.src) {
        stylingOptions.image = checkResult.src;
      } else {
        logoError.value = checkResult.error || new Error('Logo 加载失败');
      }
    } else if (merged.imageOptions) {
      stylingOptions.imageOptions = merged.imageOptions;
    }

    if (merged.dotsOptions) {
      stylingOptions.dotsOptions = merged.dotsOptions;
    }
    if (merged.cornersSquareOptions) {
      stylingOptions.cornersSquareOptions = merged.cornersSquareOptions;
    }
    if (merged.cornersDotOptions) {
      stylingOptions.cornersDotOptions = merged.cornersDotOptions;
    }
    if (merged.backgroundOptions) {
      stylingOptions.backgroundOptions = merged.backgroundOptions;
    }

    return {
      stylingOptions,
      logicalWidth,
      logicalHeight,
      isCanvas,
      autoDpr,
    };
  }

  /**
   * 调整 Canvas 在高分屏下的 CSS 逻辑尺寸。
   */
  function applyRetinaStyle(
    targetEl: HTMLElement,
    logicalWidth: number,
    logicalHeight: number,
  ): void {
    const canvas = targetEl.querySelector('canvas');
    if (canvas) {
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;
      canvas.style.display = 'block';
    }
  }

  /**
   * 渲染或更新二维码。
   */
  async function render(): Promise<void> {
    const targetEl = toValue(container);
    if (!targetEl) {
      return;
    }

    try {
      error.value = null;
      const { stylingOptions, logicalWidth, logicalHeight, isCanvas } = await compileOptions();

      if (!qrCodeInstance.value) {
        // 首次构建实例并挂载
        const instance = new QRCodeStyling(stylingOptions);
        targetEl.innerHTML = '';
        instance.append(targetEl);
        qrCodeInstance.value = instance;
      } else {
        // 存量实例增量更新
        qrCodeInstance.value.update(stylingOptions);
      }

      // 若为 Canvas，应用 Retina CSS 尺寸自适应
      if (isCanvas) {
        // 微任务等待 DOM 挂载稳定
        await Promise.resolve();
        applyRetinaStyle(targetEl, logicalWidth, logicalHeight);
      }

      isRendered.value = true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.value = e;
      isRendered.value = false;
    }
  }

  /**
   * 手动触发刷新重绘。
   */
  async function refresh(): Promise<void> {
    const targetEl = toValue(container);
    if (targetEl) {
      targetEl.innerHTML = '';
    }
    qrCodeInstance.value = null;
    await render();
  }

  /**
   * 动态更新配置。
   */
  async function update(newOptions?: Partial<QRCodeOptions>): Promise<void> {
    if (newOptions) {
      // 若提供了增量配置，直接触发整体重绘
      await render();
    } else {
      await render();
    }
  }

  /**
   * 导出二维码图像。
   */
  async function exportAsImage(exportOpts?: ExportQRCodeOptions): Promise<string | Blob> {
    const targetEl = toValue(container);
    return exportQRCodeAsImage(targetEl || qrCodeInstance.value, exportOpts);
  }

  /**
   * 一键触发下载。
   */
  async function download(downloadOpts?: DownloadQRCodeOptions): Promise<void> {
    const targetEl = toValue(container);
    return downloadQRCodeImage(targetEl || qrCodeInstance.value, downloadOpts);
  }

  // 响应式监听入参变化
  watch(
    [() => toValue(container), () => toValue(value), () => toValue(options)],
    () => {
      void render();
    },
    { deep: true },
  );

  if (getCurrentInstance()) {
    onMounted(() => {
      void render();
    });
  } else {
    // 非组件环境（如普通函数式调用或单元测试中直接调用），尝试立即异步触发渲染
    Promise.resolve().then(() => {
      void render();
    });
  }

  // 严格遵循 ADR-0009 与 ADR-0012 句柄清理
  if (getCurrentScope()) {
    onScopeDispose(() => {
      const targetEl = toValue(container);
      if (targetEl) {
        targetEl.innerHTML = '';
      }
      qrCodeInstance.value = null;
      isRendered.value = false;
    });
  }

  return {
    qrCodeInstance,
    isRendered,
    error,
    logoError,
    refresh,
    update,
    exportAsImage,
    download,
  };
}
