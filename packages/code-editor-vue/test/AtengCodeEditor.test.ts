/**
 * AtengCodeEditor 组件单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengCodeEditor, type CodeEditorExpose } from '../src';

describe('AtengCodeEditor 组件单元测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('能正确挂载并渲染微工具栏与画布宿主容器', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'const x = 100;',
        language: 'typescript',
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.at-code-editor').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__canvas').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__badge').text()).toBe('typescript');

    // 检查向外暴露的接口
    const vm = wrapper.vm as unknown as CodeEditorExpose;
    expect(typeof vm.getValue).toBe('function');
    expect(typeof vm.setValue).toBe('function');
    expect(typeof vm.focus).toBe('function');
    expect(typeof vm.layout).toBe('function');
    expect(vm.getValue()).toBe('const x = 100;');
  });

  it('支持只读模式与只读徽章展示', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'SELECT 1;',
        language: 'sql',
        readOnly: true,
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.at-code-editor__badge--readonly').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__badge--readonly').text()).toBe('只读');
  });

  it('外部修改 v-model 时能同步更新编辑器内容', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'initial',
        language: 'javascript',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;
    expect(vm.getValue()).toBe('initial');

    await wrapper.setProps({ modelValue: 'updated' });
    await nextTick();

    expect(vm.getValue()).toBe('updated');
  });

  it('隐藏微工具栏与状态栏属性生效', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'test',
        showToolbar: false,
        showStatusbar: false,
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.at-code-editor__toolbar').exists()).toBe(false);
    expect(wrapper.find('.at-code-editor__statusbar').exists()).toBe(false);
  });

  it('插槽反转能够完整替换微工具栏与状态栏', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'custom',
      },
      slots: {
        toolbar: '<div class="custom-toolbar">Custom Tool</div>',
        statusbar: '<div class="custom-statusbar">Custom Status</div>',
      },
      attachTo: document.body,
    });

    await nextTick();

    expect(wrapper.find('.custom-toolbar').exists()).toBe(true);
    expect(wrapper.find('.custom-toolbar').text()).toBe('Custom Tool');
    expect(wrapper.find('.custom-statusbar').exists()).toBe(true);
    expect(wrapper.find('.custom-statusbar').text()).toBe('Custom Status');
  });

  it('组件集成测试：外部修改 v-model 增量保持光标位置并支持 Undo', async () => {
    const textA = ['const a = 1;', 'const b = 2;', 'const c = 3;'].join('\n');
    const textB = ['const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;'].join('\n');

    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: textA,
        language: 'javascript',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;
    const ed = vm.getEditor()!;

    // 定位光标在第 2 行第 3 列
    ed.setPosition({ lineNumber: 2, column: 3 });

    // 外部修改 modelValue
    await wrapper.setProps({ modelValue: textB });
    await nextTick();

    // 验证内容已更新
    expect(vm.getValue()).toBe(textB);

    // 验证光标依然在第 2 行第 3 列
    expect(ed.getPosition()).toEqual({ lineNumber: 2, column: 3 });

    // 验证可撤销
    vm.undo();
    expect(vm.getValue()).toBe(textA);
  });

  it('组件集成测试：大文件自适应保护徽章正确显示', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'normal text',
        largeFileThreshold: 5,
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;
    expect(vm.isLargeFile()).toBe(false);
    expect(wrapper.find('.at-code-editor__badge--warning').exists()).toBe(false);

    // 超过阈值（6 行 > 5）
    await wrapper.setProps({
      modelValue: ['line1', 'line2', 'line3', 'line4', 'line5', 'line6'].join('\n'),
    });
    await nextTick();

    expect(vm.isLargeFile()).toBe(true);
    expect(wrapper.find('.at-code-editor__badge--warning').exists()).toBe(true);
    expect(wrapper.find('.at-code-editor__badge--warning').text()).toContain('大文件保护已启用');
  });
});
