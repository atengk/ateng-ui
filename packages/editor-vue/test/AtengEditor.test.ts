/**
 * AtengEditor 表现容器单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理 DOM；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，断言外部公共行为与契约。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengEditor, type AtengEditorInstance } from '../src';

describe('AtengEditor 表现容器', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('正确挂载并渲染根容器与正文编辑区', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>欢迎使用 ateng-ui 现代富文本编辑器</p>',
        placeholder: '请输入内容...',
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('at-editor');
    expect(wrapper.find('.at-editor__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-editor__content').exists()).toBe(true);

    const instance = wrapper.vm as unknown as AtengEditorInstance;
    expect(instance.getHTML()).toContain('欢迎使用 ateng-ui 现代富文本编辑器');
    expect(instance.getText()).toContain('欢迎使用 ateng-ui 现代富文本编辑器');
    expect(instance.isEmpty).toBe(false);
  });

  it('支持全中文微工具栏操作并暴露正确无障碍信息', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>测试文本</p>',
      },
    });

    await nextTick();

    const toolbar = wrapper.find('.at-editor__toolbar');
    expect(toolbar.exists()).toBe(true);
    expect(toolbar.attributes('role')).toBe('toolbar');

    // 断言常见全中文按钮 Tooltip 与 aria-label
    const boldBtn = toolbar.find('button[aria-label="粗体"]');
    expect(boldBtn.exists()).toBe(true);
    expect(boldBtn.attributes('title')).toContain('粗体');

    const italicBtn = toolbar.find('button[aria-label="斜体"]');
    expect(italicBtn.exists()).toBe(true);
    expect(italicBtn.attributes('title')).toContain('斜体');

    const codeBtn = toolbar.find('button[aria-label="代码块"]');
    expect(codeBtn.exists()).toBe(true);
    expect(codeBtn.attributes('title')).toContain('代码块');
  });

  it('支持只读模式与禁用模式的样式解耦与工具栏隐藏', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>只读内容</p>',
        readOnly: true,
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('is-readonly');
    // 只读阅读模式下隐藏工具栏
    expect(wrapper.find('.at-editor__toolbar').exists()).toBe(false);

    // 切换为禁用模式
    await wrapper.setProps({ readOnly: false, disabled: true });
    expect(wrapper.classes()).toContain('is-disabled');
    expect(wrapper.classes()).not.toContain('is-readonly');
    expect(wrapper.find('.at-editor__toolbar').exists()).toBe(true);
  });

  it('支持清空内容与实例方法调用', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>即将被清空的内容</p>',
      },
    });

    await nextTick();

    const instance = wrapper.vm as unknown as AtengEditorInstance;
    expect(instance.getText()).toBe('即将被清空的内容');

    instance.clearContent();
    await nextTick();

    expect(instance.getText()).toBe('');
    expect(instance.isEmpty).toBe(true);
  });

  it('组件卸载时确定性销毁 TipTap 实例，杜绝内存泄漏', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>待销毁</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    expect(instance.editor).not.toBeNull();
    const editor = instance.editor;

    wrapper.unmount();
    wrapper = null;

    // 实例 destroy 后已标记销毁
    expect(editor.isDestroyed).toBe(true);
  });

  it('支持 HTML/Markdown/JSON 多轨数据实时联动发射', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>初始测试<strong>粗体</strong></p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;

    // 模拟内部编辑插入内容
    instance.editor.commands.insertContent('附加文本');
    await nextTick();

    // 断言多轨 update 事件均已触发
    const updateModelValueEvents = wrapper.emitted('update:modelValue');
    const updateMarkdownEvents = wrapper.emitted('update:markdown');
    const updateJsonEvents = wrapper.emitted('update:json');
    const changeEvents = wrapper.emitted('change');

    expect(updateModelValueEvents).toBeDefined();
    expect(updateMarkdownEvents).toBeDefined();
    expect(updateJsonEvents).toBeDefined();
    expect(changeEvents).toBeDefined();

    const lastHtml = updateModelValueEvents![updateModelValueEvents!.length - 1][0] as string;
    expect(lastHtml).toContain('附加文本');

    const lastMd = updateMarkdownEvents![updateMarkdownEvents!.length - 1][0] as string;
    expect(typeof lastMd).toBe('string');
  });

  it('外部内容等价性检查与光标选区保护（防止跳回首行）', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>一段较长的测试内容用于验证光标保持不乱跳</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = instance.editor;

    // 1. 设置光标到字符中间位置（例如第 8 个字符）
    editor.commands.setTextSelection(8);
    expect(editor.state.selection.from).toBe(8);

    // 2. 外部传入等价的 modelValue（模拟父组件 re-render）
    await wrapper.setProps({
      modelValue: '<p>一段较长的测试内容用于验证光标保持不乱跳</p>',
    });
    await nextTick();

    // 验证：光标依然保持在第 8 个字符，绝对未跳回第 0 位！
    expect(editor.state.selection.from).toBe(8);

    // 3. 外部传入真实有效的新内容
    await wrapper.setProps({
      modelValue: '<p>更新后的全新段落内容</p>',
    });
    await nextTick();

    // 验证：光标位置被合法钳制并保持有效
    expect(editor.state.selection.from).toBeGreaterThanOrEqual(1);
    expect(instance.getText()).toContain('更新后的全新段落内容');
  });

  it('外部内容等价回弹时不破坏撤销/重做（Undo/Redo）历史栈', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>第一句</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = instance.editor;

    // 用户在末尾聚焦并键入第二句话
    editor.commands.focus('end');
    editor.commands.insertContent(' 第二句');
    await nextTick();

    expect(instance.getText()).toContain('第二句');
    expect(editor.can().undo()).toBe(true);

    // 外部传入等价 modelValue 回传（父组件 v-model 闭环）
    await wrapper.setProps({
      modelValue: editor.getHTML(),
    });
    await nextTick();

    // 断言撤销栈依然有效可执行
    expect(editor.can().undo()).toBe(true);
    editor.commands.undo();
    await nextTick();

    // 验证 Undo 成功执行，撤销了第二句
    expect(instance.getText()).not.toContain('第二句');
    expect(instance.getText()).toContain('第一句');
  });
});
