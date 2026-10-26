/**
 * useDigitalZoom 纯前端硬件加速电子放大状态机。
 *
 * 基于 CSS Transform 实现 1.0x~5.0x 滚轮无级电子放大与鼠标平移拖拽，
 * 内置边界阻尼防脱框约束与确定性资源清理。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, getCurrentScope, onScopeDispose, ref, toValue, type ComputedRef } from 'vue';
import type { DigitalZoomOptions, UseDigitalZoomReturn } from '../types';

/**
 * 限制数值在 [min, max] 区间内。
 */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * 纯前端电子放大与平移拖拽状态机。
 *
 * @param options 配置选项
 * @returns 电子放大响应式状态与控制方法
 */
export function useDigitalZoom(options: DigitalZoomOptions = {}): UseDigitalZoomReturn {
  const minScale = options.minScale ?? 1.0;
  const maxScale = options.maxScale ?? 5.0;
  const step = options.step ?? 0.25;

  const scale = ref<number>(clamp(options.initialScale ?? 1.0, minScale, maxScale));
  const offsetX = ref<number>(0);
  const offsetY = ref<number>(0);
  const isDragging = ref<boolean>(false);

  // 内部拖拽起点坐标
  let dragStartX = 0;
  let dragStartY = 0;
  let startOffsetX = 0;
  let startOffsetY = 0;

  /**
   * 获取容器物理尺寸（用于精准计算防脱框边界）。
   */
  const getContainerSize = (): { width: number; height: number } => {
    const el = toValue(options.containerRef);
    if (el && typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      return {
        width: rect.width || 800,
        height: rect.height || 450,
      };
    }
    return { width: 800, height: 450 };
  };

  /**
   * 应用边界阻尼，确保放大后内容不被拖出视口。
   */
  const applyBoundaryConstraint = (
    x: number,
    y: number,
    currentScale: number,
  ): { x: number; y: number } => {
    if (currentScale <= 1.0) {
      return { x: 0, y: 0 };
    }

    const { width, height } = getContainerSize();
    // 画面放大后，单侧允许平移的最大位移量为 (scale - 1) * dimension / 2
    const maxOffsetX = ((currentScale - 1) * width) / 2;
    const maxOffsetY = ((currentScale - 1) * height) / 2;

    return {
      x: clamp(x, -maxOffsetX, maxOffsetX),
      y: clamp(y, -maxOffsetY, maxOffsetY),
    };
  };

  /**
   * 派发缩放与偏移变化。
   */
  const notifyChange = (): void => {
    if (options.onZoomChange) {
      options.onZoomChange(scale.value, { x: offsetX.value, y: offsetY.value });
    }
  };

  /**
   * 放大步进。
   */
  const zoomIn = (delta: number = step): void => {
    setZoom(scale.value + delta);
  };

  /**
   * 缩小步进。
   */
  const zoomOut = (delta: number = step): void => {
    setZoom(scale.value - delta);
  };

  /**
   * 重置电子放大至 1.0x 原始视角。
   */
  const resetZoom = (): void => {
    scale.value = 1.0;
    offsetX.value = 0;
    offsetY.value = 0;
    notifyChange();
  };

  /**
   * 直接设置目标缩放倍率。
   */
  const setZoom = (targetScale: number, origin?: { x: number; y: number }): void => {
    const prevScale = scale.value;
    const nextScale = clamp(Number(targetScale.toFixed(2)), minScale, maxScale);

    if (nextScale === prevScale) {
      return;
    }

    scale.value = nextScale;

    if (nextScale <= 1.0) {
      offsetX.value = 0;
      offsetY.value = 0;
    } else if (origin) {
      // 若指定了缩放焦点（如鼠标在容器中的相对坐标），按焦点比例平移
      const { width, height } = getContainerSize();
      const focusX = origin.x - width / 2;
      const focusY = origin.y - height / 2;
      const factor = nextScale / prevScale - 1;

      const newX = offsetX.value - focusX * factor;
      const newY = offsetY.value - focusY * factor;
      const constrained = applyBoundaryConstraint(newX, newY, nextScale);
      offsetX.value = constrained.x;
      offsetY.value = constrained.y;
    } else {
      // 否则保持当前偏移并执行边界约束
      const constrained = applyBoundaryConstraint(offsetX.value, offsetY.value, nextScale);
      offsetX.value = constrained.x;
      offsetY.value = constrained.y;
    }

    notifyChange();
  };

  /**
   * 设置平移偏移量。
   */
  const setOffset = (x: number, y: number): void => {
    const constrained = applyBoundaryConstraint(x, y, scale.value);
    offsetX.value = constrained.x;
    offsetY.value = constrained.y;
    notifyChange();
  };

  /**
   * 拖拽移动监听。
   */
  const onMouseMove = (e: MouseEvent): void => {
    if (!isDragging.value) {
      return;
    }
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    setOffset(startOffsetX + deltaX, startOffsetY + deltaY);
  };

  /**
   * 拖拽结束监听。
   */
  const onMouseUp = (): void => {
    if (isDragging.value) {
      isDragging.value = false;
      cleanupDragListeners();
    }
  };

  /**
   * 解绑全局拖拽监听。
   */
  const cleanupDragListeners = (): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
  };

  /**
   * 开始拖拽。
   */
  const startDrag = (event: MouseEvent): void => {
    // 仅当画面处于电子放大状态且按下主键（左键）时才允许平移
    if (scale.value <= 1.0 || event.button !== 0) {
      return;
    }

    event.preventDefault();
    isDragging.value = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    startOffsetX = offsetX.value;
    startOffsetY = offsetY.value;

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  };

  /**
   * 处理滚轮缩放。
   */
  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? step : -step;

    // 计算鼠标在当前容器中的相对坐标
    let origin: { x: number; y: number } | undefined;
    const el = toValue(options.containerRef) || (event.currentTarget as HTMLElement);
    if (el && typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      origin = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    setZoom(scale.value + delta, origin);
  };

  /**
   * 硬件加速 Transform 样式对象。
   */
  const transformStyle: ComputedRef<Record<string, string>> = computed(() => {
    const isEnlarged = scale.value > 1.0;
    return {
      transform: `translate3d(${offsetX.value}px, ${offsetY.value}px, 0px) scale(${scale.value})`,
      transformOrigin: 'center center',
      willChange: isEnlarged ? 'transform' : 'auto',
      cursor: isEnlarged ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
      transition: isDragging.value ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)',
    };
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cleanupDragListeners();
    });
  }

  return {
    scale,
    offsetX,
    offsetY,
    isDragging,
    transformStyle,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    setOffset,
    handleWheel,
    startDrag,
  };
}
