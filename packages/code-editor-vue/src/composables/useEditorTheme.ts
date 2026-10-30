/**
 * useEditorTheme 主题双源热跟随无头状态机 Hook。
 *
 * 依据 ADR-0035 与成熟度防线：
 * 1. 监听 DOM <html> 类名 (.dark) 与系统色彩方案 (prefers-color-scheme)；
 * 2. 0ms 无感无闪烁热同步调用 monaco.editor.setTheme，无需重载 DOM；
 * 3. 确定性生命周期治理，在卸载时彻底断开 MutationObserver 与 MediaQueryList 监听。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import * as monaco from 'monaco-editor';
import type { EditorTheme } from '../types';

export interface UseEditorThemeReturn {
  /** 当前是否解析为暗黑深色模式 */
  isDark: Ref<boolean>;
  /** 手动触发主题同步 */
  syncTheme: () => void;
}

/**
 * 创建编辑器主题感知与热跟随管理器。
 *
 * @param themeGetter 主题配置 Getter
 */
export function useEditorTheme(themeGetter: () => EditorTheme | undefined): UseEditorThemeReturn {
  const isDark = ref<boolean>(false);
  let themeObserver: MutationObserver | null = null;
  let mediaQuery: MediaQueryList | null = null;
  let mediaQueryListener: (() => void) | null = null;

  // 探测当前是否应渲染为暗黑深色模式
  const checkDarkMode = (): boolean => {
    if (typeof document === 'undefined') return false;
    const theme = themeGetter();
    if (theme === 'vs-dark' || theme === 'hc-black') return true;
    if (theme === 'vs') return false;
    // auto 模式下优先探测 html.dark 类名与媒体查询
    return (
      document.documentElement.classList.contains('dark') ||
      (typeof window !== 'undefined' &&
        window.matchMedia !== undefined &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  };

  // 触发 Monaco 全局主题同步
  const syncTheme = (): void => {
    const dark = checkDarkMode();
    isDark.value = dark;
    const theme = themeGetter();
    const resolvedTheme = theme === 'auto' ? (dark ? 'vs-dark' : 'vs') : (theme ?? 'vs');
    monaco.editor.setTheme(resolvedTheme);
  };

  // 监听外部 theme 配置变更
  watch(themeGetter, () => {
    syncTheme();
  });

  onMounted(() => {
    syncTheme();

    // 1. 注册 DOM html.dark 变更监听
    if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => {
        if (themeGetter() === 'auto') {
          syncTheme();
        }
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    // 2. 注册系统色彩方案变更监听
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQueryListener = () => {
        if (themeGetter() === 'auto') {
          syncTheme();
        }
      };
      mediaQuery.addEventListener('change', mediaQueryListener);
    }
  });

  onUnmounted(() => {
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }
    if (mediaQuery && mediaQueryListener) {
      mediaQuery.removeEventListener('change', mediaQueryListener);
      mediaQuery = null;
      mediaQueryListener = null;
    }
  });

  return {
    isDark,
    syncTheme,
  };
}
