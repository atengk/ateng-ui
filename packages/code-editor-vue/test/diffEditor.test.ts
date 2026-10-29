/**
 * AtengCodeDiffEditor 组件与 useCodeDiff 状态机单元测试。
 *
 * 依据全自洽单测 3 项铁律：
 * 1. DOM 严格还原（afterEach 卸载 wrapper 并清理 document.body）；
 * 2. 响应式与存储零污染；
 * 3. 100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, isReactive } from 'vue';
import type * as monaco from 'monaco-editor';
import {
  AtengCodeDiffEditor,
  useCodeDiff,
  computeDiffStats,
  type CodeDiffEditorExpose,
} from '../src';

describe('Diff 差异统计工具 computeDiffStats 测试', () => {
  it('在空数组或空值输入时安全保底返回全 0 统计', () => {
    expect(computeDiffStats(null)).toEqual({ additions: 0, deletions: 0, changesCount: 0 });
    expect(computeDiffStats(undefined)).toEqual({ additions: 0, deletions: 0, changesCount: 0 });
    expect(computeDiffStats([])).toEqual({ additions: 0, deletions: 0, changesCount: 0 });
  });

  it('能精准统计纯新增、纯删除与替换修改行数', () => {
    const mockLineChanges: monaco.editor.ILineChange[] = [
      // 1. 纯新增：原始行 0，修改行 1~3 (新增 3 行)
      {
        originalStartLineNumber: 0,
        originalEndLineNumber: 0,
        modifiedStartLineNumber: 1,
        modifiedEndLineNumber: 3,
        charChanges: undefined,
      },
      // 2. 纯删除：原始行 10~11，修改行 0 (删除 2 行)
      {
        originalStartLineNumber: 10,
        originalEndLineNumber: 11,
        modifiedStartLineNumber: 0,
        modifiedEndLineNumber: 0,
        charChanges: undefined,
      },
      // 3. 修改替换：原始行 20~21，修改行 20~23 (删 2 行，增 4 行)
      {
        originalStartLineNumber: 20,
        originalEndLineNumber: 21,
        modifiedStartLineNumber: 20,
        modifiedEndLineNumber: 23,
        charChanges: undefined,
      },
    ];

    const stats = computeDiffStats(mockLineChanges);
    expect(stats.additions).toBe(7); // 3 + 4 = 7
    expect(stats.deletions).toBe(4); // 2 + 2 = 4
    expect(stats.changesCount).toBe(3);
  });
});

describe('useCodeDiff 无头状态机测试', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    vi.restoreAllMocks();
  });

  it('防线 1：响应式解耦，Monaco Diff 实例与双 Model 必须为 markRaw 原始对象', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const { diffEditor, originalModel, modifiedModel, dispose } = useCodeDiff(container, {
      original: 'const a = 1;',
      modified: 'const a = 2;',
      language: 'typescript',
    });

    expect(diffEditor.value).toBeTruthy();
    expect(originalModel.value).toBeTruthy();
    expect(modifiedModel.value).toBeTruthy();

    // 严禁被 Vue Proxy 深度劫持代理
    expect(isReactive(diffEditor.value)).toBe(false);
    expect(isReactive(originalModel.value)).toBe(false);
    expect(isReactive(modifiedModel.value)).toBe(false);

    dispose();
    expect(diffEditor.value).toBeNull();
    expect(originalModel.value).toBeNull();
    expect(modifiedModel.value).toBeNull();
  });

  it('防线 2：支持双轨文本读写、模式切换与差异跳转动作', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const {
      getOriginalValue,
      setOriginalValue,
      getModifiedValue,
      setModifiedValue,
      diffMode,
      setDiffMode,
      goToPreviousDiff,
      goToNextDiff,
      dispose,
    } = useCodeDiff(container, {
      original: 'line 1\nline 2',
      modified: 'line 1\nline 2 modified',
      diffMode: 'split',
    });

    expect(getOriginalValue()).toBe('line 1\nline 2');
    expect(getModifiedValue()).toBe('line 1\nline 2 modified');

    // 动态修改
    setOriginalValue('updated orig');
    expect(getOriginalValue()).toBe('updated orig');

    setModifiedValue('updated mod');
    expect(getModifiedValue()).toBe('updated mod');

    // 模式切换
    expect(diffMode.value).toBe('split');
    setDiffMode('inline');
    expect(diffMode.value).toBe('inline');

    // 导航跳转不抛出异常
    expect(() => goToPreviousDiff()).not.toThrow();
    expect(() => goToNextDiff()).not.toThrow();

    dispose();
  });
});

describe('AtengCodeDiffEditor 组件单元测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('能正确挂载并渲染微工具栏、模式切换按钮与 Diff 画布宿主容器', async () => {
    wrapper = mount(AtengCodeDiffEditor, {
      props: {
        original: 'const x = 100;',
        modified: 'const x = 200;\nconst y = 300;',
        language: 'typescript',
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.at-code-diff-editor').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__canvas').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-code-diff-editor__stat').exists()).toBe(true);

    const vm = wrapper.vm as unknown as CodeDiffEditorExpose;
    expect(typeof vm.getDiffEditor).toBe('function');
    expect(typeof vm.getOriginalEditor).toBe('function');
    expect(typeof vm.getModifiedEditor).toBe('function');
    expect(typeof vm.goToNextDiff).toBe('function');
    expect(typeof vm.goToPreviousDiff).toBe('function');
    expect(typeof vm.setDiffMode).toBe('function');
    expect(vm.getOriginalValue()).toBe('const x = 100;');
    expect(vm.getModifiedValue()).toBe('const x = 200;\nconst y = 300;');
  });

  it('支持双向绑定 v-model:original 与 v-model:modified 的外部响应更新', async () => {
    wrapper = mount(AtengCodeDiffEditor, {
      props: {
        original: 'orig 1',
        modified: 'mod 1',
        language: 'javascript',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeDiffEditorExpose;

    expect(vm.getOriginalValue()).toBe('orig 1');
    expect(vm.getModifiedValue()).toBe('mod 1');

    await wrapper.setProps({
      original: 'orig 2',
      modified: 'mod 2',
    });
    await nextTick();

    expect(vm.getOriginalValue()).toBe('orig 2');
    expect(vm.getModifiedValue()).toBe('mod 2');
  });

  it('点击工具栏按钮能平滑切换并排 (split) 与行内 (inline) 比对视图', async () => {
    wrapper = mount(AtengCodeDiffEditor, {
      props: {
        original: 'a',
        modified: 'b',
        diffMode: 'split',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeDiffEditorExpose;
    expect(vm.getDiffMode()).toBe('split');

    // 找到行内按钮并点击
    const btns = wrapper.findAll('.at-code-editor__btn');
    const inlineBtn = btns.find(b => b.text().includes('行内'));
    expect(inlineBtn).toBeTruthy();

    await inlineBtn!.trigger('click');
    await nextTick();

    expect(vm.getDiffMode()).toBe('inline');
    expect(wrapper.emitted('update:diffMode')?.[0]).toEqual(['inline']);
    expect(wrapper.emitted('diffModeChange')?.[0]).toEqual(['inline']);

    // 再次点击并排按钮
    const splitBtn = btns.find(b => b.text().includes('并排'));
    expect(splitBtn).toBeTruthy();
    await splitBtn!.trigger('click');
    await nextTick();

    expect(vm.getDiffMode()).toBe('split');
    expect(wrapper.emitted('update:diffMode')?.[1]).toEqual(['split']);
  });

  it('点击差异跳转按钮触发 goToPreviousDiff 与 goToNextDiff 方法', async () => {
    wrapper = mount(AtengCodeDiffEditor, {
      props: {
        original: 'orig',
        modified: 'mod',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeDiffEditorExpose;
    const prevSpy = vi.spyOn(vm, 'goToPreviousDiff');
    const nextSpy = vi.spyOn(vm, 'goToNextDiff');

    const btns = wrapper.findAll('.at-code-editor__btn');
    const prevBtn = btns.find(b => b.text().includes('上一处'));
    const nextBtn = btns.find(b => b.text().includes('下一处'));

    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();

    await prevBtn!.trigger('click');
    expect(prevSpy).toHaveBeenCalled();

    await nextBtn!.trigger('click');
    expect(nextSpy).toHaveBeenCalled();
  });

  it('支持插槽反转自定义工具栏与状态栏', async () => {
    wrapper = mount(AtengCodeDiffEditor, {
      props: {
        original: 'orig',
        modified: 'mod',
      },
      slots: {
        toolbar: '<div class="custom-diff-tool">Custom Diff Bar</div>',
        statusbar: '<div class="custom-diff-status">Custom Status</div>',
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.custom-diff-tool').exists()).toBe(true);
    expect(wrapper.find('.custom-diff-tool').text()).toBe('Custom Diff Bar');
    expect(wrapper.find('.custom-diff-status').exists()).toBe(true);
    expect(wrapper.find('.custom-diff-status').text()).toBe('Custom Status');
  });
});
