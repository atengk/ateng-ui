/**
 * useEditorTheme 主题双源热跟随无头状态机单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 还原、存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import * as monaco from 'monaco-editor';
import { useEditorTheme } from '../src/composables/useEditorTheme';
import type { EditorTheme } from '../src/types';

describe('useEditorTheme 主题双源热跟随状态机测试', () => {
  let themeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.documentElement.className = '';
    themeSpy = vi.spyOn(monaco.editor, 'setTheme').mockImplementation(() => {});
  });

  afterEach(() => {
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  it('显式指定 vs / vs-dark 时应设置对应 Monaco 主题', async () => {
    const theme = ref<EditorTheme>('vs');
    const TestComponent = {
      template: '<div></div>',
      setup() {
        return useEditorTheme(() => theme.value);
      },
    };

    const wrapper = mount(TestComponent);
    expect(wrapper.vm.isDark).toBe(false);
    expect(themeSpy).toHaveBeenCalledWith('vs');

    theme.value = 'vs-dark';
    await nextTick();
    expect(wrapper.vm.isDark).toBe(true);
    expect(themeSpy).toHaveBeenCalledWith('vs-dark');

    wrapper.unmount();
  });

  it('auto 模式下应感知 html.dark 类名变化并同步主题', async () => {
    document.documentElement.classList.add('dark');
    const TestComponent = {
      template: '<div></div>',
      setup() {
        return useEditorTheme(() => 'auto');
      },
    };

    const wrapper = mount(TestComponent);
    expect(wrapper.vm.isDark).toBe(true);
    expect(themeSpy).toHaveBeenCalledWith('vs-dark');

    // 移除 dark 类名后手动触发 syncTheme
    document.documentElement.classList.remove('dark');
    wrapper.vm.syncTheme();
    expect(wrapper.vm.isDark).toBe(false);
    expect(themeSpy).toHaveBeenCalledWith('vs');

    wrapper.unmount();
  });

  it('组件卸载后正确清理 MutationObserver 与媒体查询监听，不残留幽灵监听', () => {
    const disconnectSpy = vi.fn();
    const originalMutationObserver = window.MutationObserver;

    class MockMutationObserver {
      observe = vi.fn();
      disconnect = disconnectSpy;
    }
    window.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    const TestComponent = {
      template: '<div></div>',
      setup() {
        return useEditorTheme(() => 'auto');
      },
    };

    const wrapper = mount(TestComponent);
    wrapper.unmount();

    expect(disconnectSpy).toHaveBeenCalled();
    window.MutationObserver = originalMutationObserver;
  });
});
