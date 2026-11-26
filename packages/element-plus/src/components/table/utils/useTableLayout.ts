/**
 * AtengTable 容器宽度响应式监测与 autoHeight 视口高度自适应组合式函数。
 *
 * @author Ateng
 * @since 2026-11-26
 */

import { ref, watch, nextTick, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue';
import type { TableSurface } from '../types';

export interface UseTableLayoutOptions {
  /** 根容器 DOM 引用 */
  tableRootRef: Ref<HTMLElement | null>;
  /** 顶部检索表单容器 DOM 引用 */
  tableQueryRef?: Ref<HTMLElement | null>;
  /** 工具栏容器 DOM 引用 */
  tableToolbarRef?: Ref<HTMLElement | null>;
  /** 表格表面卡片 DOM 引用 */
  tableSurfaceRef: Ref<HTMLElement | null>;
  /** 表格主体区 DOM 引用 */
  tableMainRef: Ref<HTMLElement | null>;
  /** 分页容器 DOM 引用 */
  paginationContainerRef: Ref<HTMLElement | null>;
  /** 视口高度自适应配置 */
  autoHeight: ComputedRef<boolean | number>;
  /** 是否开启窄容器响应式分页 */
  responsivePagination: ComputedRef<boolean>;
  /** 分页区是否处于显示状态 */
  shouldShowPagination: ComputedRef<boolean>;
  /** 表面外观模式 */
  surface: ComputedRef<TableSurface>;
  /** 是否处于全屏模式 */
  isFullscreen: ComputedRef<boolean>;
}

export interface UseTableLayoutResult {
  /** 根容器实时宽度（px） */
  tableContainerWidth: Ref<number | undefined>;
  /** 计算后的表格动态高度（px） */
  calculatedHeight: Ref<number | undefined>;
  /** 调度在下一帧 DOM 同步后平滑重算可用高度 */
  scheduleAutoHeightUpdate: (onUpdated?: () => void) => void;
}

/**
 * 判断视口高度自适应配置是否处于启用状态（数字 0 亦视为启用并预留 0px）。
 *
 * @param val autoHeight 配置值
 * @returns 是否启用高度自适应
 */
export function isAutoHeightEnabled(val: boolean | number | undefined): boolean {
  if (typeof val === 'number') {
    return Number.isFinite(val);
  }
  return Boolean(val);
}

/**
 * 统一管理 AtengTable 根容器宽度探测与视口剩余高度计算。
 *
 * @param options 容器引用与响应式配置
 * @returns 容器宽度、计算高度引用与异步重算调度函数
 */
export function useTableLayout(options: UseTableLayoutOptions): UseTableLayoutResult {
  const tableContainerWidth = ref<number | undefined>(undefined);
  const calculatedHeight = ref<number | undefined>(undefined);
  let rootResizeObserver: ResizeObserver | null = null;
  let auxResizeObserver: ResizeObserver | null = null;

  function updateAutoHeight(): void {
    const autoHeightVal = options.autoHeight.value;
    if (!isAutoHeightEnabled(autoHeightVal) || typeof window === 'undefined') {
      return;
    }
    const anchorEl = options.tableMainRef.value ?? options.tableRootRef.value;
    if (!anchorEl) {
      return;
    }
    const anchorRect = anchorEl.getBoundingClientRect();
    const bottomOffset = typeof autoHeightVal === 'number' ? Math.max(0, autoHeightVal) : 32;
    const paginationHeight =
      options.shouldShowPagination.value && options.paginationContainerRef.value
        ? Math.ceil(options.paginationContainerRef.value.getBoundingClientRect().height)
        : 0;

    let surfaceBottomPadding = 0;
    let surfaceBottomBorder = 0;
    if (options.surface.value !== 'plain' && !options.isFullscreen.value) {
      const surfaceStyle = options.tableSurfaceRef.value
        ? window.getComputedStyle(options.tableSurfaceRef.value)
        : null;
      const rawPadding = surfaceStyle?.paddingBottom ?? '';
      const parsedPadding = parseFloat(rawPadding);
      surfaceBottomPadding =
        rawPadding !== '' && Number.isFinite(parsedPadding) ? parsedPadding : 16;

      if (surfaceStyle?.borderBottomStyle !== 'none') {
        const rawBorder = surfaceStyle?.borderBottomWidth ?? '';
        const parsedBorder = parseFloat(rawBorder);
        surfaceBottomBorder = rawBorder !== '' && Number.isFinite(parsedBorder) ? parsedBorder : 0;
      }
    }

    const availableHeight = Math.max(
      150,
      Math.floor(
        window.innerHeight -
          anchorRect.top -
          paginationHeight -
          surfaceBottomPadding -
          surfaceBottomBorder -
          bottomOffset,
      ),
    );
    calculatedHeight.value = availableHeight;
  }

  function scheduleAutoHeightUpdate(onUpdated?: () => void): void {
    if (!isAutoHeightEnabled(options.autoHeight.value)) {
      return;
    }
    nextTick(() => {
      updateAutoHeight();
      onUpdated?.();
    });
  }

  function attachAutoHeightWindowListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateAutoHeight);
    }
  }

  function detachAutoHeightWindowListener(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateAutoHeight);
    }
    calculatedHeight.value = undefined;
  }

  function disconnectRootResizeObserver(): void {
    if (rootResizeObserver) {
      rootResizeObserver.disconnect();
      rootResizeObserver = null;
    }
  }

  function disconnectAuxResizeObserver(): void {
    if (auxResizeObserver) {
      auxResizeObserver.disconnect();
      auxResizeObserver = null;
    }
  }

  function syncRootResizeObserver(): void {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }
    const autoHeightActive = isAutoHeightEnabled(options.autoHeight.value);
    const needsObserver = autoHeightActive || options.responsivePagination.value;
    if (!needsObserver) {
      disconnectRootResizeObserver();
      return;
    }
    if (!rootResizeObserver && options.tableRootRef.value) {
      rootResizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect?.width || (entry.target as HTMLElement).clientWidth;
          if (typeof width === 'number' && width > 0) {
            tableContainerWidth.value = width;
          }
        }
        if (isAutoHeightEnabled(options.autoHeight.value)) {
          updateAutoHeight();
        }
      });
      rootResizeObserver.observe(options.tableRootRef.value);
    }
  }

  function syncAuxResizeObserver(): void {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }
    disconnectAuxResizeObserver();
    if (!isAutoHeightEnabled(options.autoHeight.value)) {
      return;
    }
    const targets = [
      options.tableQueryRef?.value,
      options.tableToolbarRef?.value,
      options.paginationContainerRef.value,
    ].filter((el): el is HTMLElement => Boolean(el));

    if (targets.length === 0) {
      return;
    }
    auxResizeObserver = new ResizeObserver(() => {
      if (isAutoHeightEnabled(options.autoHeight.value)) {
        updateAutoHeight();
      }
    });
    for (const target of targets) {
      auxResizeObserver.observe(target);
    }
  }

  onMounted(() => {
    if (options.tableRootRef.value && options.tableRootRef.value.clientWidth > 0) {
      tableContainerWidth.value = options.tableRootRef.value.clientWidth;
    }
    syncRootResizeObserver();
    if (isAutoHeightEnabled(options.autoHeight.value)) {
      attachAutoHeightWindowListener();
      nextTick(() => {
        syncAuxResizeObserver();
        updateAutoHeight();
      });
    }
  });

  onUnmounted(() => {
    detachAutoHeightWindowListener();
    disconnectRootResizeObserver();
    disconnectAuxResizeObserver();
  });

  watch(options.autoHeight, newVal => {
    if (isAutoHeightEnabled(newVal)) {
      syncRootResizeObserver();
      attachAutoHeightWindowListener();
      nextTick(() => {
        syncAuxResizeObserver();
        updateAutoHeight();
      });
    } else {
      detachAutoHeightWindowListener();
      disconnectAuxResizeObserver();
      syncRootResizeObserver();
    }
  });

  watch(options.responsivePagination, () => {
    syncRootResizeObserver();
  });

  watch(
    [
      options.shouldShowPagination,
      options.surface,
      options.isFullscreen,
      () => options.tableQueryRef?.value,
      () => options.tableToolbarRef?.value,
      () => options.paginationContainerRef.value,
    ],
    () => {
      if (isAutoHeightEnabled(options.autoHeight.value)) {
        nextTick(() => {
          syncAuxResizeObserver();
          updateAutoHeight();
        });
      }
    },
  );

  return {
    tableContainerWidth,
    calculatedHeight,
    scheduleAutoHeightUpdate,
  };
}
