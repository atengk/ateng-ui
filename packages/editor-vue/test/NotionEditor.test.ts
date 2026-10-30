/**
 * AtengNotionEditor 沉浸式无界白板预设独立单元测试。
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
import { AtengNotionEditor, type AtengNotionEditorInstance } from '../src';

describe('AtengNotionEditor 沉浸式无界白板预设', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('正确挂载并渲染沉浸式无界白板布局，无顶部大工具栏，默认装配拖拽手柄与斜杠面板', async () => {
    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: '<p>欢迎体验 Notion-like 现代白板知识库</p>',
        placeholder: '输入内容，或键入 "/" 插入块...',
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('at-notion-editor');
    // 默认不渲染大工具栏
    expect(wrapper.find('.at-editor-toolbar').exists()).toBe(false);
    // 默认装配编辑区与手柄
    expect(wrapper.find('.at-editor__content').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AtengDragHandle' }).exists()).toBe(true);

    const instance = wrapper.vm as unknown as AtengNotionEditorInstance;
    expect(instance.getHTML()).toContain('欢迎体验 Notion-like 现代白板知识库');
    expect(instance.isEmpty).toBe(false);
  });

  it('自动装配 CalloutBlock 与 ToggleList 物料扩展并支持内容解析', async () => {
    const initialContent = `
      <div class="at-editor-callout at-editor-callout--info" data-callout-type="info" data-callout-icon="💡">
        <div class="at-editor-callout__content"><p>重点技术架构决议说明</p></div>
      </div>
      <div class="at-editor-toggle is-open" data-open="true">
        <div class="at-editor-toggle__content"><p>展开查看演进细节</p></div>
      </div>
    `;

    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: initialContent,
      },
    });

    await nextTick();

    const instance = wrapper.vm as unknown as AtengNotionEditorInstance;
    const html = instance.getHTML();

    expect(html).toContain('at-editor-callout--info');
    expect(html).toContain('data-callout-type="info"');
    expect(html).toContain('重点技术架构决议说明');
    expect(html).toContain('at-editor-toggle');
    expect(html).toContain('展开查看演进细节');
  });

  it('支持关闭手柄与斜杠面板以满足极简展示需求', async () => {
    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: '<p>极简纯文本只读视图</p>',
        dragHandle: false,
        slashCommand: false,
      },
    });

    await nextTick();

    expect(wrapper.findComponent({ name: 'AtengDragHandle' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'AtengSlashCommand' }).exists()).toBe(false);
  });

  it('支持插槽倒置完全受控接管拖拽手柄与菜单', async () => {
    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: '<p>段落内容</p>',
      },
      slots: {
        'drag-handle': '<button class="custom-notion-handle">自定义手柄</button>',
      },
    });

    await nextTick();

    const customBtn = wrapper.find('.custom-notion-handle');
    expect(customBtn.exists()).toBe(true);
    expect(customBtn.text()).toBe('自定义手柄');
    // 验证 AtengDragHandle 容器未被抹除，坐标与事件体系依然完整就绪
    expect(wrapper.findComponent({ name: 'AtengDragHandle' }).exists()).toBe(true);
  });

  it('支持通过 #drag-handle-container 插槽完全自接管外层容器', async () => {
    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: '<p>容器接管测试</p>',
      },
      slots: {
        'drag-handle-container': '<div class="custom-drag-container">Custom Container</div>',
      },
    });

    await nextTick();

    expect(wrapper.find('.custom-drag-container').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AtengDragHandle' }).exists()).toBe(false);
  });

  it('支持通过 callout 与 toggle 属性声明式禁用专属物料扩展', async () => {
    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: '<p>测试扩展开关</p>',
        callout: false,
        toggle: false,
      },
    });

    await nextTick();

    const inst = wrapper.vm as unknown as AtengNotionEditorInstance;
    const editor =
      (inst.editor as unknown as { value?: Editor })?.value ?? (inst.editor as unknown as Editor);
    expect(editor).toBeTruthy();
    // 验证禁用后 Schema 中不包含 calloutBlock 与 toggleList
    expect(editor?.schema.nodes['calloutBlock']).toBeUndefined();
    expect(editor?.schema.nodes['toggleList']).toBeUndefined();
  });

  it('提供完整的 Editor 门面方法与字数统计统计闭环', async () => {
    wrapper = mount(AtengNotionEditor, {
      props: {
        modelValue: '<p>Hello Notion</p>',
      },
    });

    await nextTick();

    const instance = wrapper.vm as unknown as AtengNotionEditorInstance;
    expect(instance.getText()).toBe('Hello Notion');
    expect(instance.getWords()).toBe(2);
    expect(instance.getCharacters()).toBe(12);

    instance.setContent('<p>更新后的白板知识库</p>');
    await nextTick();

    expect(instance.getHTML()).toContain('更新后的白板知识库');
  });
});
