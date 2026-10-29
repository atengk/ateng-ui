/**
 * 暗黑模式无感热跟随、0x0 视口几何自愈与生命周期清理单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import { AtengCodeEditor, useCodeEditor, type CodeEditorExpose } from '../src';

describe('0x0 视口几何自愈与生命周期清理测试 (Ticket #180)', () => {
  let container: HTMLDivElement;
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    document.documentElement.className = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    container.remove();
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  it('防线 1：暗黑模式无感热跟随，支持 DOM class 与系统色彩方案联动', async () => {
    const setThemeSpy = vi.spyOn(monaco.editor, 'setTheme');

    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'const x = 1;',
        theme: 'auto',
      },
      attachTo: document.body,
    });

    await nextTick();

    // 默认亮色（未开启暗黑时设置为 vs）
    expect(setThemeSpy).toHaveBeenCalledWith('vs');

    // 1. 模拟 DOM 增加 dark class
    document.documentElement.classList.add('dark');
    // 等待 MutationObserver 或微任务触发
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(setThemeSpy).toHaveBeenLastCalledWith('vs-dark');

    // 2. 模拟 DOM 移除 dark class
    document.documentElement.classList.remove('dark');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(setThemeSpy).toHaveBeenLastCalledWith('vs');
  });

  it('防线 2：0x0 视口几何挂起与可见时自动触发 layout 自愈', async () => {
    // 模拟容器初始尺寸为 0x0（类似被关闭的 el-dialog 或隐藏 Tab）
    let clientW = 0;
    let clientH = 0;

    Object.defineProperty(container, 'clientWidth', {
      get: () => clientW,
      configurable: true,
    });
    Object.defineProperty(container, 'clientHeight', {
      get: () => clientH,
      configurable: true,
    });

    const { editor, isSuspended, layout, dispose } = useCodeEditor(container, {
      value: 'console.log("0x0 test");',
      autoLayoutHealing: true,
    });

    const ed = editor.value!;
    const layoutSpy = vi.spyOn(ed, 'layout');

    // 初始 0x0 视口挂起
    expect(isSuspended.value).toBe(true);

    // 模拟容器展开变为可见（800x600）
    clientW = 800;
    clientH = 600;

    // 手动或通过 ResizeObserver 触发自愈
    layout();
    await nextTick();

    expect(isSuspended.value).toBe(false);
    expect(layoutSpy).toHaveBeenCalled();

    dispose();
  });

  it('防线 3：确定性生命周期治理，组件卸载时彻底解绑 ResizeObserver 与释放 Monaco 实例', async () => {
    let observedElement: Element | null = null;
    let disconnected = false;

    // Mock 全局 ResizeObserver 监控卸载行为
    const originalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class MockResizeObserver {
      constructor(private cb: ResizeObserverCallback) {}
      observe(el: Element) {
        observedElement = el;
      }
      unobserve() {}
      disconnect() {
        disconnected = true;
      }
    } as unknown as typeof ResizeObserver;

    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'lifecycle test',
      },
      attachTo: document.body,
    });

    await nextTick();

    const vm = wrapper.vm as unknown as CodeEditorExpose;
    const ed = vm.getEditor()!;
    const disposeSpy = vi.spyOn(ed, 'dispose');

    expect(observedElement).not.toBeNull();

    // 执行卸载
    wrapper.unmount();
    wrapper = null;
    await nextTick();

    // 断言确定性清理与销毁
    expect(disconnected).toBe(true);
    expect(disposeSpy).toHaveBeenCalled();

    window.ResizeObserver = originalResizeObserver;
  });
});
