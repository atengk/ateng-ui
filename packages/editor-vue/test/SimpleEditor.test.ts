/**
 * AtengSimpleEditor 与 AtengSimpleToolbar 独立单元测试。
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
import { nextTick, effectScope, type EffectScope, type ShallowRef } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  AtengSimpleEditor,
  AtengSimpleToolbar,
  useEditor,
  type AtengSimpleEditorInstance,
} from '../src';

describe('AtengSimpleEditor 经典轻量编辑器预设', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('正确挂载并渲染根容器、自适应工具栏与正文编辑区', async () => {
    wrapper = mount(AtengSimpleEditor, {
      props: {
        modelValue: '<p>欢迎使用 Simple Editor 轻量富文本</p>',
        placeholder: '请输入正文...',
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('at-simple-editor');
    expect(wrapper.find('.at-simple-toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-editor__content').exists()).toBe(true);

    const instance = wrapper.vm as unknown as AtengSimpleEditorInstance;
    expect(instance.getHTML()).toContain('欢迎使用 Simple Editor 轻量富文本');
    expect(instance.getText()).toContain('欢迎使用 Simple Editor 轻量富文本');
    expect(instance.isEmpty).toBe(false);
  });

  it('默认严格禁用斜杠面板与选区气泡浮层以杜绝打字干扰', async () => {
    wrapper = mount(AtengSimpleEditor, {
      props: {
        modelValue: '<p>普通正文</p>',
      },
    });

    await nextTick();

    // 默认不渲染斜杠面板与气泡浮层
    expect(wrapper.findComponent({ name: 'AtengSlashCommand' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'AtengBubbleMenu' }).exists()).toBe(false);
  });

  it('支持声明式 tools 定制过滤工具栏可见按钮', async () => {
    wrapper = mount(AtengSimpleEditor, {
      props: {
        modelValue: '<p>定制工具集</p>',
        tools: ['bold', 'italic'],
      },
    });

    await nextTick();

    const toolbar = wrapper.find('.at-simple-toolbar');
    expect(toolbar.exists()).toBe(true);

    // 粗体和斜体按钮存在
    expect(toolbar.find('button[title*="粗体"]').exists()).toBe(true);
    expect(toolbar.find('button[title*="斜体"]').exists()).toBe(true);

    // 标题、表格等未声明工具不存在
    expect(toolbar.find('button[title*="级标题"]').exists()).toBe(false);
    expect(toolbar.find('button[title*="表格"]').exists()).toBe(false);
  });

  it('支持 dense 紧凑模式并应用对应样式类', async () => {
    wrapper = mount(AtengSimpleEditor, {
      props: {
        modelValue: '<p>紧凑模式测试</p>',
        dense: true,
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('is-dense');
    const toolbar = wrapper.find('.at-simple-toolbar');
    expect(toolbar.classes()).toContain('is-dense');
  });

  it('支持自定义 #toolbar 插槽完全接管工具栏渲染', async () => {
    wrapper = mount(AtengSimpleEditor, {
      props: {
        modelValue: '<p>插槽接管</p>',
      },
      slots: {
        toolbar: '<div class="custom-user-toolbar"><button>我的按钮</button></div>',
      },
    });

    await nextTick();

    expect(wrapper.find('.custom-user-toolbar').exists()).toBe(true);
    expect(wrapper.find('.custom-user-toolbar').text()).toBe('我的按钮');
    expect(wrapper.find('.at-simple-toolbar').exists()).toBe(false);
  });

  it('正确暴露所有核心门面方法 (focus, blur, clearContent, setContent, getHTML, getFullHTML)', async () => {
    wrapper = mount(AtengSimpleEditor, {
      props: {
        modelValue: '<p>初始文字</p>',
      },
    });

    await nextTick();

    const instance = wrapper.vm as unknown as AtengSimpleEditorInstance;
    expect(typeof instance.focus).toBe('function');
    expect(typeof instance.blur).toBe('function');
    expect(typeof instance.clearContent).toBe('function');
    expect(typeof instance.setContent).toBe('function');
    expect(typeof instance.getHTML).toBe('function');
    expect(typeof instance.getFullHTML).toBe('function');

    // 测试 setContent
    instance.setContent('<p>更新后的内容</p>');
    await nextTick();
    expect(instance.getHTML()).toContain('更新后的内容');

    // 测试 full HTML 导出
    const fullHtml = instance.getFullHTML({ title: '测试文档' });
    expect(fullHtml).toContain('<!DOCTYPE html>');
    expect(fullHtml).toContain('<title>测试文档</title>');

    // 测试 clearContent
    instance.clearContent();
    await nextTick();
    expect(instance.isEmpty).toBe(true);
  });
});

describe('AtengSimpleToolbar 独立微工具栏', () => {
  let wrapper: ReturnType<typeof mount> | null = null;
  let scope: EffectScope | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    if (scope) {
      scope.stop();
      scope = null;
    }
    document.body.innerHTML = '';
  });

  it('正确挂载并渲染常用排版按钮', async () => {
    scope = effectScope();
    let editorRef: ShallowRef<Editor | null> | null = null;

    scope.run(() => {
      const { editor } = useEditor({
        content: '<p>测试工具栏文本</p>',
      });
      editorRef = editor;
    });

    await nextTick();

    wrapper = mount(AtengSimpleToolbar, {
      props: {
        editor: editorRef?.value ?? null,
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('at-simple-toolbar');
    expect(wrapper.attributes('role')).toBe('toolbar');
    expect(wrapper.find('button[title*="粗体"]').exists()).toBe(true);
  });
});
