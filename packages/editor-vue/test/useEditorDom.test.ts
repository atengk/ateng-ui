/**
 * @atengk/editor-vue useEditorDom 状态机单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原；
 * 2. 状态零污染；
 * 3. 100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref, shallowRef, effectScope } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import { useEditorDom } from '../src';

describe('useEditorDom 视口与全屏状态机', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('正确初始化脱壳全屏状态机并支持 toggleFullscreen 切换', () => {
    const scope = effectScope();
    scope.run(() => {
      const rootEl = document.createElement('div');
      const container = document.createElement('div');
      container.appendChild(rootEl);
      document.body.appendChild(container);

      const rootRef = ref<HTMLElement | null>(rootEl);
      const editor = shallowRef<Editor | null>(null);
      const onFullscreenChange = vi.fn();

      const { isFullscreen, toggleFullscreen } = useEditorDom({
        rootRef,
        editor,
        onFullscreenChange,
      });

      expect(isFullscreen.value).toBe(false);

      // 切换至全屏
      toggleFullscreen();
      expect(isFullscreen.value).toBe(true);
      expect(onFullscreenChange).toHaveBeenCalledWith(true);

      // 再次切换退出全屏
      toggleFullscreen();
      expect(isFullscreen.value).toBe(false);
      expect(onFullscreenChange).toHaveBeenCalledWith(false);
    });
    scope.stop();
  });

  it('监听 Esc 键自动退出全屏模式', () => {
    const scope = effectScope();
    scope.run(() => {
      const rootEl = document.createElement('div');
      document.body.appendChild(rootEl);

      const rootRef = ref<HTMLElement | null>(rootEl);
      const editor = shallowRef<Editor | null>(null);
      const onFullscreenChange = vi.fn();

      const { isFullscreen, toggleFullscreen } = useEditorDom({
        rootRef,
        editor,
        onFullscreenChange,
      });

      toggleFullscreen();
      expect(isFullscreen.value).toBe(true);

      // 模拟按下 Esc 键
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      window.dispatchEvent(escEvent);

      expect(isFullscreen.value).toBe(false);
      expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
    });
    scope.stop();
  });

  it('初始化时探测暗黑模式并通过 onThemeChange 派发', () => {
    document.documentElement.classList.add('dark');

    const scope = effectScope();
    scope.run(() => {
      const rootEl = document.createElement('div');
      const rootRef = ref<HTMLElement | null>(rootEl);
      const editor = shallowRef<Editor | null>(null);
      const onThemeChange = vi.fn();

      useEditorDom({
        rootRef,
        editor,
        onThemeChange,
      });

      expect(onThemeChange).toHaveBeenCalledWith(true);
    });
    scope.stop();
  });
});
