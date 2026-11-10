/**
 * 图片裁剪无头响应式状态机 useCropper。
 *
 * 遵循 ADR-0002、ADR-0013 与 ADR-0048 规范，
 * 封装底层 Cropper.js 引擎、确定性生命周期治理、BlobUrlGuard 内存守卫与对称操作 API。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, shallowRef, toValue, getCurrentScope, onScopeDispose, nextTick } from 'vue';
import type { Ref, MaybeRefOrGetter } from 'vue';
import Cropper from 'cropperjs';
import { BlobUrlGuard } from '../guards/blob-url-guard';
import type {
  CropperSource,
  CropperCropData,
  CropperBoxData,
  CropperDragMode,
  CropperExportOptions,
  CropperResult,
  UseCropperReturn,
} from '../types';

/**
 * useCropper 响应式与静态配置项契约。
 */
export interface UseCropperOptions {
  /** 裁剪长宽比（如 1、16/9），为 NaN 时自由裁剪 */
  aspectRatio?: number;
  /** 视口模式，默认 1（裁剪框限制在画布范围内） */
  viewMode?: 0 | 1 | 2 | 3;
  /** 拖拽模式，默认 'crop' */
  dragMode?: CropperDragMode;
  /** 裁剪框形状，默认 'rect' */
  shape?: 'rect' | 'circle';
  /** 是否监听容器尺寸变化自愈，默认 true */
  responsive?: boolean;
  /** 是否自动校正 EXIF 旋转，默认 true */
  checkOrientation?: boolean;
  /** 是否显示黑色模态遮罩，默认 true */
  modal?: boolean;
  /** 是否显示裁剪虚线参考线，默认 true */
  guides?: boolean;
  /** 是否显示中心指示器，默认 true */
  center?: boolean;
  /** 是否高亮裁剪区域，默认 true */
  highlight?: boolean;
  /** 是否显示网格背景，默认 true */
  background?: boolean;
  /** 初始化完成是否自动渲染裁剪区域，默认 true */
  autoCrop?: boolean;
  /** 自动裁剪区域占画布百分比（0 ~ 1），默认 0.8 */
  autoCropArea?: number;
  /** 是否允许移动图片，默认 true */
  movable?: boolean;
  /** 是否允许旋转图片，默认 true */
  rotatable?: boolean;
  /** 是否允许缩放翻转图片，默认 true */
  scalable?: boolean;
  /** 是否允许滚轮/手势放大缩小，默认 true */
  zoomable?: boolean;
  /** 是否允许触摸缩放，默认 true */
  zoomOnTouch?: boolean;
  /** 是否允许滚轮缩放，默认 true */
  zoomOnWheel?: boolean;
  /** 是否允许移动裁剪框，默认 true */
  cropBoxMovable?: boolean;
  /** 是否允许拖拽改变裁剪框尺寸，默认 true */
  cropBoxResizable?: boolean;
  /** 裁剪框最小宽度（像素） */
  minCropBoxWidth?: number;
  /** 裁剪框最小高度（像素） */
  minCropBoxHeight?: number;
  /** 初始化完成回调 */
  onReady?: (event: CustomEvent) => void;
  /** 裁剪区域几何坐标变化回调 */
  onCrop?: (event: CustomEvent) => void;
}

/**
 * 创建并管理 Cropper.js 图片裁剪无头状态机。
 *
 * @param imageRef 目标 HTMLImageElement 元素的 Ref 引用
 * @param rawOptions 可选的配置选项或 Getter
 * @returns 包含只读响应式状态与对称操作 API 的对象
 */
export function useCropper(
  imageRef: Ref<HTMLImageElement | null>,
  rawOptions?: MaybeRefOrGetter<UseCropperOptions>,
): UseCropperReturn {
  const blobGuard = new BlobUrlGuard();
  const cropperInstance = shallowRef<Cropper | null>(null);

  // 只读响应式状态
  const ready = ref(false);
  const loading = ref(false);
  const data = ref<CropperCropData>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
  });
  const cropBoxData = ref<CropperBoxData>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const zoomRatio = ref(1);
  const rotateAngle = ref(0);

  /**
   * 同步当前 Cropper 几何度量数据至响应式状态。
   */
  const syncCropData = (): void => {
    const cropper = cropperInstance.value;
    if (!cropper || !ready.value) {
      return;
    }
    try {
      const rawData = cropper.getData(true);
      data.value = {
        x: Math.round(rawData.x),
        y: Math.round(rawData.y),
        width: Math.round(rawData.width),
        height: Math.round(rawData.height),
        rotate: rawData.rotate,
        scaleX: rawData.scaleX,
        scaleY: rawData.scaleY,
      };
      const rawBox = cropper.getCropBoxData();
      cropBoxData.value = {
        left: Math.round(rawBox.left),
        top: Math.round(rawBox.top),
        width: Math.round(rawBox.width),
        height: Math.round(rawBox.height),
      };
      rotateAngle.value = rawData.rotate % 360;
    } catch {
      // 容错保护
    }
  };

  /**
   * 初始化 Cropper.js 实例。
   */
  const init = async (): Promise<void> => {
    await nextTick();
    const imageEl = imageRef.value;
    if (!imageEl) {
      return;
    }

    // 销毁存量实例
    if (cropperInstance.value) {
      cropperInstance.value.destroy();
      cropperInstance.value = null;
    }

    ready.value = false;
    loading.value = true;

    const opt = toValue(rawOptions) ?? {};

    const cropperOptions: Cropper.Options = {
      aspectRatio: opt.aspectRatio,
      viewMode: opt.viewMode ?? 1,
      dragMode: opt.dragMode ?? 'crop',
      responsive: opt.responsive ?? true,
      checkOrientation: opt.checkOrientation ?? true,
      modal: opt.modal ?? true,
      guides: opt.guides ?? true,
      center: opt.center ?? true,
      highlight: opt.highlight ?? true,
      background: opt.background ?? true,
      autoCrop: opt.autoCrop ?? true,
      autoCropArea: opt.autoCropArea ?? 0.8,
      movable: opt.movable ?? true,
      rotatable: opt.rotatable ?? true,
      scalable: opt.scalable ?? true,
      zoomable: opt.zoomable ?? true,
      zoomOnTouch: opt.zoomOnTouch ?? true,
      zoomOnWheel: opt.zoomOnWheel ?? true,
      cropBoxMovable: opt.cropBoxMovable ?? true,
      cropBoxResizable: opt.cropBoxResizable ?? true,
      minCropBoxWidth: opt.minCropBoxWidth,
      minCropBoxHeight: opt.minCropBoxHeight,
      ready(event) {
        ready.value = true;
        loading.value = false;
        zoomRatio.value = 1;
        syncCropData();
        opt.onReady?.(event as CustomEvent);
      },
      crop(event) {
        syncCropData();
        opt.onCrop?.(event as CustomEvent);
      },
    };

    try {
      cropperInstance.value = new Cropper(imageEl, cropperOptions);
    } catch {
      loading.value = false;
    }
  };

  /**
   * 确定性销毁实例并释放跟踪的全部临时资源。
   */
  const destroy = (): void => {
    if (cropperInstance.value) {
      try {
        cropperInstance.value.destroy();
      } catch {
        // 静默保护
      }
      cropperInstance.value = null;
    }
    ready.value = false;
    loading.value = false;
    blobGuard.revokeAll();
  };

  /**
   * 缩放相对倍率。
   */
  const zoom = (ratio: number): void => {
    zoomRatio.value = Math.max(0.1, zoomRatio.value + ratio);
    if (cropperInstance.value) {
      cropperInstance.value.zoom(ratio);
    }
  };

  /**
   * 缩放到绝对倍率。
   */
  const zoomTo = (ratio: number): void => {
    zoomRatio.value = Math.max(0.1, ratio);
    if (cropperInstance.value) {
      cropperInstance.value.zoomTo(ratio);
    }
  };

  /**
   * 相对旋转指定角度（正数为顺时针，负数为逆时针）。
   */
  const rotate = (degree: number): void => {
    rotateAngle.value = (rotateAngle.value + degree) % 360;
    if (cropperInstance.value) {
      cropperInstance.value.rotate(degree);
      syncCropData();
    }
  };

  /**
   * 旋转到指定绝对角度。
   */
  const rotateTo = (degree: number): void => {
    rotateAngle.value = degree % 360;
    if (cropperInstance.value) {
      cropperInstance.value.rotateTo(degree);
      syncCropData();
    }
  };

  /**
   * 水平镜像翻转。
   */
  const flipX = (): void => {
    if (!cropperInstance.value || !ready.value) {
      return;
    }
    const currentScale = data.value.scaleX || 1;
    cropperInstance.value.scaleX(-currentScale);
    syncCropData();
  };

  /**
   * 垂直镜像翻转。
   */
  const flipY = (): void => {
    if (!cropperInstance.value || !ready.value) {
      return;
    }
    const currentScale = data.value.scaleY || 1;
    cropperInstance.value.scaleY(-currentScale);
    syncCropData();
  };

  /**
   * 动态更新裁切长宽比。
   */
  const setAspectRatio = (aspectRatio: number): void => {
    if (!cropperInstance.value) {
      return;
    }
    cropperInstance.value.setAspectRatio(aspectRatio);
    syncCropData();
  };

  /**
   * 设置交互拖拽模式。
   */
  const setDragMode = (mode: CropperDragMode): void => {
    if (!cropperInstance.value) {
      return;
    }
    cropperInstance.value.setDragMode(mode);
  };

  /**
   * 动态替换图片源。
   */
  const replace = async (source: CropperSource): Promise<void> => {
    if (!source) {
      destroy();
      return;
    }

    loading.value = true;
    let url: string;

    if (source instanceof Blob) {
      url = blobGuard.create(source);
    } else {
      url = source;
    }

    const imageEl = imageRef.value;
    if (!imageEl) {
      loading.value = false;
      return;
    }

    if (cropperInstance.value) {
      try {
        cropperInstance.value.replace(url);
      } catch {
        loading.value = false;
      }
    } else {
      imageEl.src = url;
      await init();
    }
  };

  /**
   * 重置裁剪区域至初始状态。
   */
  const reset = (): void => {
    zoomRatio.value = 1;
    rotateAngle.value = 0;
    if (cropperInstance.value) {
      cropperInstance.value.reset();
      syncCropData();
    }
  };

  /**
   * 清除裁切框。
   */
  const clear = (): void => {
    if (!cropperInstance.value) {
      return;
    }
    cropperInstance.value.clear();
  };

  /**
   * 导出为 HTMLCanvasElement。
   */
  const exportCanvas = (options?: CropperExportOptions): HTMLCanvasElement => {
    if (!cropperInstance.value || !ready.value) {
      throw new Error('Cropper 实例尚未就绪，无法执行 Canvas 导出操作。');
    }

    const opt: Cropper.GetCroppedCanvasOptions = {
      maxWidth: options?.maxWidth ?? 4096,
      maxHeight: options?.maxHeight ?? 4096,
      fillColor: options?.fillColor ?? (options?.format === 'image/jpeg' ? '#ffffff' : undefined),
    };

    const canvas = cropperInstance.value.getCroppedCanvas(opt);
    if (!canvas) {
      throw new Error('Canvas 导出失败：未能获取到有效的 CroppedCanvas。');
    }

    return canvas;
  };

  /**
   * 导出为二进制 Blob。
   */
  const exportBlob = async (options?: CropperExportOptions): Promise<Blob> => {
    const canvas = exportCanvas(options);
    const format = options?.format ?? 'image/png';
    const quality = options?.quality ?? 0.92;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas 转 Blob 失败。'));
          }
        },
        format,
        quality,
      );
    });
  };

  /**
   * 导出为带类型 File 实例。
   */
  const exportFile = async (fileName?: string, options?: CropperExportOptions): Promise<File> => {
    const blob = await exportBlob(options);
    const format = options?.format ?? 'image/png';
    const ext = format === 'image/jpeg' ? '.jpg' : format === 'image/webp' ? '.webp' : '.png';
    const finalName = fileName
      ? fileName.includes('.')
        ? fileName
        : `${fileName}${ext}`
      : `cropped-${Date.now()}${ext}`;

    return new File([blob], finalName, { type: blob.type });
  };

  /**
   * 导出为 Base64 Data URL。
   */
  const exportDataUrl = (options?: CropperExportOptions): string => {
    const canvas = exportCanvas(options);
    const format = options?.format ?? 'image/png';
    const quality = options?.quality ?? 0.92;
    return canvas.toDataURL(format, quality);
  };

  /**
   * 导出完整结构体结果。
   */
  const exportResult = async (
    fileName?: string,
    options?: CropperExportOptions,
  ): Promise<CropperResult> => {
    const [blob, file] = await Promise.all([exportBlob(options), exportFile(fileName, options)]);
    const dataUrl = exportDataUrl(options);

    return {
      blob,
      file,
      dataUrl,
      data: { ...data.value },
      cropBoxData: { ...cropBoxData.value },
    };
  };

  // 严格在当前组件生命周期作用域销毁时释放
  if (getCurrentScope()) {
    onScopeDispose(() => {
      destroy();
    });
  }

  return {
    ready,
    loading,
    data,
    cropBoxData,
    zoomRatio,
    rotateAngle,
    zoom,
    zoomTo,
    rotate,
    rotateTo,
    flipX,
    flipY,
    setAspectRatio,
    setDragMode,
    replace,
    reset,
    clear,
    exportBlob,
    exportFile,
    exportDataUrl,
    exportCanvas,
    exportResult,
    destroy,
  };
}
