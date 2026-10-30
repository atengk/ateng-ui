/**
 * @atengk/editor-vue 视口几何自愈、脱壳全屏与主题热跟随 Composable。
 *
 * 遵循确定性生命周期与资源清理不变量：
 * 1. 纳管全屏脱壳挂载至 document.body 与无损还原；
 * 2. 基于 ResizeObserver 监听 0x0 视口几何自愈；
 * 3. 基于 MutationObserver 监听 html.dark 实现 0ms 主题热跟随；
 * 4. 在组件注销时确定性解绑观察器与全局物理监听。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import {
  ref,
  watch,
  onMounted,
  onScopeDispose,
  getCurrentInstance,
  type Ref,
  type ShallowRef,
} from 'vue';
import type { Editor } from '@tiptap/vue-3';

export interface UseEditorDomOptions {
  /**
   * 编辑器根容器 DOM 引用。
   */
  rootRef: Ref<HTMLElement | null>;

  /**
   * TipTap 原生 Editor 实例引用。
   */
  editor: ShallowRef<Editor | null>;

  /**
   * 主题变动回调函数。
   */
  onThemeChange?: (isDark: boolean) => void;

  /**
   * 全屏变动回调函数。
   */
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export interface UseEditorDomReturn {
  /**
   * 是否处于脱壳全屏状态。
   */
  isFullscreen: Ref<boolean>;

  /**
   * 切换全屏状态。
   */
  toggleFullscreen: () => void;
}

/**
 * 组装编辑器 DOM 视口与全屏状态机。
 */
export function useEditorDom(options: UseEditorDomOptions): UseEditorDomReturn {
  const { rootRef, editor, onThemeChange, onFullscreenChange } = options;

  // 脱壳全屏状态机
  const isFullscreen = ref<boolean>(false);
  let originalParent: Node | null = null;
  let originalNextSibling: Node | null = null;

  const toggleFullscreen = (): void => {
    isFullscreen.value = !isFullscreen.value;
    onFullscreenChange?.(isFullscreen.value);
  };

  // 监听全屏状态，脱壳提升至 document.body 顶层突破局部弹窗裁剪
  watch(isFullscreen, fullscreen => {
    if (typeof document === 'undefined' || !rootRef.value) return;
    if (fullscreen) {
      originalParent = rootRef.value.parentNode;
      originalNextSibling = rootRef.value.nextSibling;
      document.body.appendChild(rootRef.value);
    } else if (originalParent && rootRef.value) {
      if (originalNextSibling && originalParent.contains(originalNextSibling)) {
        originalParent.insertBefore(rootRef.value, originalNextSibling);
      } else {
        originalParent.appendChild(rootRef.value);
      }
    }
  });

  const handleEscKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && isFullscreen.value) {
      e.preventDefault();
      isFullscreen.value = false;
      onFullscreenChange?.(false);
    }
  };

  // ResizeObserver 弹窗隐藏唤起 0x0 几何自愈
  let resizeObserver: ResizeObserver | null = null;
  let previousWidth = 0;
  let previousHeight = 0;

  const initResizeObserver = (): void => {
    if (typeof ResizeObserver === 'undefined' || !rootRef.value) return;
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // 当容器从 0x0 展开时触发重新派发事务与几何自愈
        if ((previousWidth === 0 || previousHeight === 0) && width > 0 && height > 0) {
          if (editor.value && editor.value.view) {
            editor.value.view.dispatch(editor.value.state.tr);
          }
        }
        previousWidth = width;
        previousHeight = height;
      }
    });
    resizeObserver.observe(rootRef.value);
  };

  // MutationObserver 监听 html.dark 无损热跟随
  let mutationObserver: MutationObserver | null = null;

  const initMutationObserver = (): void => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    const checkTheme = (): void => {
      const isDark = document.documentElement.classList.contains('dark');
      onThemeChange?.(isDark);
    };
    checkTheme();

    mutationObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkTheme();
        }
      }
    });

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  };

  const setupListeners = (): void => {
    initResizeObserver();
    initMutationObserver();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleEscKeyDown);
    }
  };

  const cleanupListeners = (): void => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleEscKeyDown);
    }
    if (isFullscreen.value && rootRef.value?.parentNode === document.body) {
      document.body.removeChild(rootRef.value);
    }
  };

  if (getCurrentInstance()) {
    onMounted(setupListeners);
  } else {
    setupListeners();
  }

  onScopeDispose(cleanupListeners);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}
