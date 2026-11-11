/**
 * 响应式暗黑主题热跟随状态机 (useGanttThemeSync)。
 *
 * 遵循 ADR-0002、ADR-0021 与 ADR-0050 规范，
 * 响应式嗅探宿主环境或 html.dark 类名变化，动态热更新 VTable-Gantt 画布背景与网格线调色板，
 * 实现 0 刷新平滑换肤。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import {
  ref,
  readonly,
  watch,
  toValue,
  onScopeDispose,
  onBeforeUnmount,
  getCurrentScope,
  getCurrentInstance,
} from 'vue';
import type { GanttConstructorOptions } from '@visactor/vtable-gantt';
import type { UseGanttThemeSyncOptions, UseGanttThemeSyncReturn, GanttTheme } from '../types';

/**
 * 甘特图主题色板契约。
 */
export interface GanttThemePalette {
  /** 是否为暗黑模式 */
  isDark: boolean;
  /** 时间轴表头背景色 */
  headerBg: string;
  /** 时间轴表头分割线颜色 */
  headerBorder: string;
  /** 网格刻度线颜色 */
  gridLine: string;
  /** 周末非工作日高亮背景色 */
  weekendBg: string;
  /** 画布底层背景色 */
  underlayBg: string;
  /** 任务条基础主色 */
  barColor: string;
  /** 任务进度填充主色 */
  barProgressColor: string;
  /** 默认文字颜色 */
  textColor: string;
}

/**
 * 根据暗黑状态生成甘特图调色板。
 */
export function getGanttThemePalette(isDark: boolean): GanttThemePalette {
  if (isDark) {
    return {
      isDark: true,
      headerBg: '#1f2937',
      headerBorder: '#374151',
      gridLine: '#374151',
      weekendBg: 'rgba(31, 41, 55, 0.5)',
      underlayBg: '#111827',
      barColor: '#2563eb',
      barProgressColor: '#1d4ed8',
      textColor: '#f3f4f6',
    };
  }
  return {
    isDark: false,
    headerBg: '#f9fafb',
    headerBorder: '#e5e7eb',
    gridLine: '#f3f4f6',
    weekendBg: 'rgba(243, 244, 246, 0.6)',
    underlayBg: '#ffffff',
    barColor: '#3b82f6',
    barProgressColor: '#1d4ed8',
    textColor: '#1f2937',
  };
}

/**
 * 嗅探当前宿主环境是否处于暗黑模式。
 */
export function detectHostIsDark(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('dark')) return true;
  if (document.body && document.body.classList.contains('dark')) return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

/**
 * 根据设定解析实际暗黑状态。
 */
export function resolveThemeIsDark(theme: GanttTheme = 'auto'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return detectHostIsDark();
}

/**
 * 甘特图主题热同步 Composable 状态机。
 */
export function useGanttThemeSync(options: UseGanttThemeSyncOptions = {}): UseGanttThemeSyncReturn {
  const currentTheme = (): GanttTheme => toValue(options.theme) ?? 'auto';
  const isDarkRef = ref(resolveThemeIsDark(currentTheme()));

  let observer: MutationObserver | null = null;
  let mediaQueryList: MediaQueryList | null = null;
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;
  let isDisposed = false;

  /**
   * 应用主题调色板至甘特图实例。
   */
  const applyPaletteToGantt = (targetDark: boolean): void => {
    const rawGantt = toValue(options.gantt);
    if (!rawGantt || typeof rawGantt.updateOption !== 'function') return;

    const palette = getGanttThemePalette(targetDark);
    const existingOptions = rawGantt.options ?? {};
    const themeOptions = {
      ...existingOptions,
      underlayBackgroundColor: palette.underlayBg,
      timelineHeader: {
        ...(existingOptions.timelineHeader ?? {}),
        backgroundColor: palette.headerBg,
        verticalLine: { lineColor: palette.headerBorder, lineWidth: 1 },
        horizontalLine: { lineColor: palette.headerBorder, lineWidth: 1 },
      },
      grid: {
        ...(existingOptions.grid ?? {}),
        weekendBackgroundColor: palette.weekendBg,
        horizontalLine: { lineColor: palette.gridLine, lineWidth: 1 },
        verticalLine: { lineColor: palette.gridLine, lineWidth: 1 },
      },
    };

    try {
      rawGantt.updateOption(themeOptions as unknown as GanttConstructorOptions);
    } catch {
      // 容错降级
    }
  };

  /**
   * 手动触发同步主题。
   */
  const syncTheme = (customDark?: boolean): void => {
    if (isDisposed) return;
    const resolvedDark =
      typeof customDark === 'boolean' ? customDark : resolveThemeIsDark(currentTheme());
    const changed = isDarkRef.value !== resolvedDark;
    isDarkRef.value = resolvedDark;

    applyPaletteToGantt(resolvedDark);

    if (changed) {
      options.onThemeChange?.(resolvedDark);
    }
  };

  /**
   * 启动环境暗黑模式监听。
   */
  const startObserving = (): void => {
    if (typeof document === 'undefined' || observer) return;

    // 1. 监听 document.documentElement 类名突变 (html.dark)
    observer = new MutationObserver(() => {
      if (currentTheme() === 'auto') {
        const nextDark = resolveThemeIsDark('auto');
        if (isDarkRef.value !== nextDark) {
          isDarkRef.value = nextDark;
          applyPaletteToGantt(nextDark);
          options.onThemeChange?.(nextDark);
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // 2. 监听系统偏好 prefers-color-scheme
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      mediaHandler = (e: MediaQueryListEvent) => {
        if (currentTheme() === 'auto' && !document.documentElement.classList.contains('dark')) {
          const nextDark = e.matches;
          if (isDarkRef.value !== nextDark) {
            isDarkRef.value = nextDark;
            applyPaletteToGantt(nextDark);
            options.onThemeChange?.(nextDark);
          }
        }
      };
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', mediaHandler);
      }
    }
  };

  /**
   * 停止环境监听。
   */
  const stopObserving = (): void => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (mediaQueryList && mediaHandler && mediaQueryList.removeEventListener) {
      mediaQueryList.removeEventListener('change', mediaHandler);
      mediaQueryList = null;
      mediaHandler = null;
    }
  };

  // 初始化监听
  startObserving();

  // 监听 theme prop / getter 变动
  watch(
    () => toValue(options.theme),
    newTheme => {
      syncTheme();
      if (newTheme === 'auto') {
        startObserving();
      } else {
        stopObserving();
      }
    },
  );

  // 监听 gantt 实例挂载，实例就绪后立即同步当前主题
  watch(
    () => toValue(options.gantt),
    instance => {
      if (instance) {
        applyPaletteToGantt(isDarkRef.value);
      }
    },
    { immediate: true },
  );

  /**
   * 显式销毁并释放所有监听。
   */
  const dispose = (): void => {
    isDisposed = true;
    stopObserving();
  };

  if (getCurrentScope()) {
    onScopeDispose(dispose);
  } else if (getCurrentInstance()) {
    onBeforeUnmount(dispose);
  }

  return {
    isDark: readonly(isDarkRef),
    syncTheme,
    dispose,
  };
}
