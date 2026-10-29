/**
 * useCodeEditor 无头状态机单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, effectScope } from 'vue';
import { useCodeEditor } from '../src/composables/useCodeEditor';

describe('useCodeEditor 无头状态机测试', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock matchMedia if missing
    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it('能正确创建 Monaco 实例与 Model，并支持读写与格式化', async () => {
    const scope = effectScope();

    await scope.run(async () => {
      const containerRef = ref(container);
      const state = useCodeEditor(containerRef, {
        value: 'const a = 1;',
        language: 'typescript',
      });

      expect(state.editor.value).toBeDefined();
      expect(state.model.value).toBeDefined();
      expect(state.getValue()).toBe('const a = 1;');

      // 测试设置值
      state.setValue('const b = 2;');
      expect(state.getValue()).toBe('const b = 2;');

      // 测试聚焦与尺寸刷新
      expect(() => state.focus()).not.toThrow();
      expect(() => state.layout()).not.toThrow();

      // 测试格式化
      await expect(state.format()).resolves.not.toThrow();
    });

    scope.stop();
  });

  it('scope 销毁时应确定性调用 dispose 并置空引用', () => {
    const scope = effectScope();
    let stateRef: ReturnType<typeof useCodeEditor> | null = null;

    scope.run(() => {
      const containerRef = ref(container);
      stateRef = useCodeEditor(containerRef, {
        value: 'console.log("hello");',
      });
    });

    expect(stateRef!.editor.value).toBeDefined();
    const disposeSpy = vi.spyOn(stateRef!.editor.value!, 'dispose');

    scope.stop();

    expect(disposeSpy).toHaveBeenCalled();
    expect(stateRef!.editor.value).toBeNull();
    expect(stateRef!.model.value).toBeNull();
  });
});
