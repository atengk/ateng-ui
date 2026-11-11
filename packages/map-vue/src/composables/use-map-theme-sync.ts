/**
 * useMapThemeSync 响应式暗黑模式主题跟随状态机。
 *
 * 遵循 ADR-0021、ADR-0029 与 ADR-0051 规范，自动监听宿主 DOM 的 .dark / [data-theme='dark'] 标记，
 * 动态同步地图瓦片反色滤镜并触发暗黑热换肤。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, watch, onScopeDispose, getCurrentScope, toValue, type MaybeRefOrGetter } from 'vue';

export interface UseMapThemeSyncOptions {
  /** 显式指定暗黑模式，或传入 'auto' 跟随系统/宿主环境 */
  theme?: MaybeRefOrGetter<boolean | 'auto' | undefined>;
  /** 主题状态切换时的通知回调 */
  onThemeChange?: (isDark: boolean) => void;
}

export interface UseMapThemeSyncReturn {
  /** 当前是否处于暗黑模式 */
  isDark: Readonly<{ value: boolean }>;
  /** 手动重新检测宿主暗黑状态 */
  checkDarkNow: () => boolean;
  /** 销毁 MutationObserver 监听 */
  dispose: () => void;
}

/**
 * 嗅探当前宿主 HTML 根节点是否带有暗黑标记。
 */
export function detectHostIsDark(): boolean {
  if (typeof document === 'undefined') return false;
  const docEl = document.documentElement;
  return docEl.classList.contains('dark') || docEl.getAttribute('data-theme') === 'dark';
}

export function useMapThemeSync(options: UseMapThemeSyncOptions = {}): UseMapThemeSyncReturn {
  const isDark = ref(false);
  let mutationObserver: MutationObserver | null = null;

  const updateState = (darkVal: boolean): void => {
    if (isDark.value !== darkVal) {
      isDark.value = darkVal;
      options.onThemeChange?.(darkVal);
    }
  };

  const checkDarkNow = (): boolean => {
    const rawTheme = toValue(options.theme);
    if (typeof rawTheme === 'boolean') {
      updateState(rawTheme);
      return rawTheme;
    }
    const hostDark = detectHostIsDark();
    updateState(hostDark);
    return hostDark;
  };

  const initObserver = (): void => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    mutationObserver = new MutationObserver(() => {
      const rawTheme = toValue(options.theme);
      if (rawTheme === 'auto' || rawTheme === undefined) {
        checkDarkNow();
      }
    });

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
  };

  const dispose = (): void => {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  };

  // 初始同步
  checkDarkNow();
  initObserver();

  // 响应式监听外部 theme 配置变化
  watch(
    () => toValue(options.theme),
    newTheme => {
      if (typeof newTheme === 'boolean') {
        updateState(newTheme);
      } else {
        checkDarkNow();
      }
    },
  );

  if (getCurrentScope()) {
    onScopeDispose(dispose);
  }

  return {
    isDark,
    checkDarkNow,
    dispose,
  };
}
