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
});
