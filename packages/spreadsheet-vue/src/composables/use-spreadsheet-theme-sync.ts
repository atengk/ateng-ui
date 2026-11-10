/**
 * 电子表格主题模式与宿主环境暗黑热跟随 Hook (useSpreadsheetThemeSync)。
 *
 * 遵循 ADR-0021、ADR-0029 与 ADR-0049 规约：
 * 1. 采用 Vue 3.5 原生 toValue() 解包 MaybeRefOrGetter 动态入参；
 * 2. 在 'auto' 模式下利用 MutationObserver 实时监听 document.documentElement 类名，
 *    无损热跟随 html.dark 变更，并降级兼容 window.matchMedia 媒体查询；
 * 3. 确定性生命周期防线：组件卸载或作用域销毁时 100% 释放观察者与监听器。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import {
  ref,
  watch,
  toValue,
  readonly,
  onBeforeUnmount,
  onScopeDispose,
  getCurrentInstance,
  getCurrentScope,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type { SpreadsheetTheme } from '../types';

export function useSpreadsheetThemeSync(
  themeSource: MaybeRefOrGetter<SpreadsheetTheme | undefined>,
  onThemeChange?: (theme: 'light' | 'dark') => void,
): {
  currentResolvedTheme: Readonly<Ref<'light' | 'dark'>>;
  destroy: () => void;
} {
  const currentResolvedTheme = ref<'light' | 'dark'>('light');

  let mutationObserver: MutationObserver | null = null;
  let mediaQueryList: MediaQueryList | null = null;
  let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

  /**
   * 嗅探当前宿主是否处于深色模式。
   */
  const detectIsDark = (): boolean => {
    if (typeof document === 'undefined') return false;

    // 1. 优先检查 html 根节点或 body 节点是否挂载了 dark 类
    const htmlClasses = document.documentElement.classList;
    if (htmlClasses.contains('dark')) {
      return true;
    }

    // 2. 检查系统媒体查询偏好
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {
        // 容错兜底
      }
    }

    return false;
  };

  /**
   * 清理所有 DOM 观察者与媒体查询监听。
   */
  const cleanupObservers = (): void => {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    if (mediaQueryList && mediaQueryHandler) {
      if (typeof mediaQueryList.removeEventListener === 'function') {
        mediaQueryList.removeEventListener('change', mediaQueryHandler);
      } else if (
        typeof (mediaQueryList as unknown as { removeListener?: (cb: unknown) => void })
          .removeListener === 'function'
      ) {
        (mediaQueryList as unknown as { removeListener: (cb: unknown) => void }).removeListener(
          mediaQueryHandler,
        );
      }
      mediaQueryList = null;
      mediaQueryHandler = null;
    }
  };

  /**
   * 触发主题变更通知。
   */
  const applyTheme = (targetTheme: 'light' | 'dark'): void => {
    currentResolvedTheme.value = targetTheme;
    onThemeChange?.(targetTheme);
  };

  /**
   * 建立 auto 模式下的热跟随监听。
   */
  const setupAutoFollow = (): void => {
    cleanupObservers();

    // 立即嗅探并应用初始主题
    const isDark = detectIsDark();
    applyTheme(isDark ? 'dark' : 'light');

    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    // 监听 <html> 类名变化
    mutationObserver = new MutationObserver(() => {
      const darkActive = detectIsDark();
      const nextTheme = darkActive ? 'dark' : 'light';
      if (currentResolvedTheme.value !== nextTheme) {
        applyTheme(nextTheme);
      }
    });

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // 监听系统偏好媒体查询变更
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQueryHandler = () => {
          const darkActive = detectIsDark();
          const nextTheme = darkActive ? 'dark' : 'light';
          if (currentResolvedTheme.value !== nextTheme) {
            applyTheme(nextTheme);
          }
        };

        if (typeof mediaQueryList.addEventListener === 'function') {
          mediaQueryList.addEventListener('change', mediaQueryHandler);
        } else if (
          typeof (mediaQueryList as unknown as { addListener?: (cb: unknown) => void })
            .addListener === 'function'
        ) {
          (mediaQueryList as unknown as { addListener: (cb: unknown) => void }).addListener(
            mediaQueryHandler,
          );
        }
      } catch {
        // 容错兜底
      }
    }
  };

  /**
   * 刷新主题解析。
   */
  const syncTheme = (): void => {
    const rawTheme = toValue(themeSource) ?? 'auto';

    if (rawTheme === 'dark') {
      cleanupObservers();
      applyTheme('dark');
    } else if (rawTheme === 'light') {
      cleanupObservers();
      applyTheme('light');
    } else {
      setupAutoFollow();
    }
  };

  // 监听入参变动
  watch(
    () => toValue(themeSource),
    () => {
      syncTheme();
    },
    { immediate: true },
  );

  /**
   * 销毁与资源释放。
   */
  const destroy = (): void => {
    cleanupObservers();
  };

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      destroy();
    });
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      destroy();
    });
  }

  return {
    currentResolvedTheme: readonly(currentResolvedTheme) as Readonly<Ref<'light' | 'dark'>>,
    destroy,
  };
}
