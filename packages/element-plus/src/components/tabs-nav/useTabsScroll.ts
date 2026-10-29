/**
 * AtengTabsNav 视口横向平滑滚动与溢出状态监测 Composable。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import {
  reactive,
  computed,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  type ComputedRef,
  type Ref,
} from 'vue';

export interface UseTabsScrollOptions {
  viewportRef: Ref<HTMLDivElement | null>;
  trackRef: Ref<HTMLDivElement | null>;
  modelValue: () => string;
  tabsLength: () => number;
  height: () => number | string;
}

export interface UseTabsScrollReturn {
  containerHeight: ComputedRef<string>;
  overflow: {
    hasOverflow: boolean;
    canScrollLeft: boolean;
    canScrollRight: boolean;
  };
  scrollByOffset: (offset: number) => void;
  onWheelScroll: (event: WheelEvent) => void;
  scrollToActiveTab: () => void;
  updateScrollStatus: () => void;
}

export function useTabsScroll(options: UseTabsScrollOptions): UseTabsScrollReturn {
  const { viewportRef, trackRef, modelValue, tabsLength, height } = options;

  const containerHeight = computed<string>(() => {
    const h = height();
    return typeof h === 'number' ? `${h}px` : h;
  });

  const overflow = reactive({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollStatus = (): void => {
    const el = viewportRef.value;
    if (!el) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    overflow.hasOverflow = scrollWidth > clientWidth + 2;
    overflow.canScrollLeft = scrollLeft > 2;
    overflow.canScrollRight = scrollLeft + clientWidth < scrollWidth - 2;
  };

  const scrollByOffset = (offset: number): void => {
    viewportRef.value?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const onWheelScroll = (event: WheelEvent): void => {
    const el = viewportRef.value;
    if (!el || !overflow.hasOverflow) {
      return;
    }
    const delta = event.deltaY || event.deltaX;
    if (delta !== 0) {
      el.scrollLeft += delta;
      event.preventDefault();
      updateScrollStatus();
    }
  };

  const scrollToActiveTab = (): void => {
    nextTick(() => {
      const el = viewportRef.value;
      if (!el) {
        return;
      }
      updateScrollStatus();
      if (!overflow.hasOverflow) {
        el.scrollLeft = 0;
        return;
      }
      const activeEl = el.querySelector<HTMLElement>('.at-tabs-nav__item.is-active');
      if (!activeEl) {
        return;
      }
      const activeLeft = activeEl.offsetLeft;
      const activeWidth = activeEl.offsetWidth;
      const viewportWidth = el.clientWidth;
      const targetScrollLeft = activeLeft - (viewportWidth - activeWidth) / 2;
      el.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
      updateScrollStatus();
    });
  };

  watch(modelValue, scrollToActiveTab);
  watch(tabsLength, scrollToActiveTab);

  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    updateScrollStatus();
    scrollToActiveTab();

    if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
      resizeObserver = new ResizeObserver(() => {
        updateScrollStatus();
      });
      resizeObserver.observe(viewportRef.value);
      if (trackRef.value) {
        resizeObserver.observe(trackRef.value);
      }
    }

    viewportRef.value?.addEventListener('scroll', updateScrollStatus, {
      passive: true,
    });
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    viewportRef.value?.removeEventListener('scroll', updateScrollStatus);
  });

  return {
    containerHeight,
    overflow,
    scrollByOffset,
    onWheelScroll,
    scrollToActiveTab,
    updateScrollStatus,
  };
}
