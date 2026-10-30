/**
 * AtengDragHandle 原生悬浮拖拽手柄独立单元测试。
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
import { AtengDragHandle, AtengEditor, useEditor } from '../src';

describe('AtengDragHandle 原生块级悬浮拖拽手柄', () => {
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

  it('独立组件正确挂载并渲染六点手柄按钮', async () => {
    scope = effectScope();
    let editorRef: ShallowRef<Editor | null> | null = null;

    scope.run(() => {
      const { editor } = useEditor({
        content: '<p>测试拖拽手柄第一行</p><p>第二行</p>',
      });
      editorRef = editor;
    });

    await nextTick();

    wrapper = mount(AtengDragHandle, {
      props: {
        editor: editorRef?.value ?? null,
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('at-drag-handle');
    const btn = wrapper.find('.at-drag-handle__btn');
    expect(btn.exists()).toBe(true);
    expect(btn.attributes('draggable')).toBe('true');
    expect(btn.attributes('aria-label')).toBe('块级拖拽手柄');
    expect(btn.find('svg.at-drag-handle__icon').exists()).toBe(true);
  });

  it('点击手柄能够弹出纯中文块级上下文菜单并包含完整操作项', async () => {
    scope = effectScope();
    let editorRef: ShallowRef<Editor | null> | null = null;

    scope.run(() => {
      const { editor } = useEditor({
        content: '<p>测试块操作菜单</p>',
      });
      editorRef = editor;
    });

    await nextTick();

    wrapper = mount(AtengDragHandle, {
      props: {
        editor: editorRef?.value ?? null,
      },
    });

    await nextTick();

    // 初始状态菜单未展开
    expect(wrapper.find('.at-drag-handle__menu').exists()).toBe(false);

    // 点击手柄按钮
    const btn = wrapper.find('.at-drag-handle__btn');
    await btn.trigger('click');
    await nextTick();

    // 菜单已展开
    const menu = wrapper.find('.at-drag-handle__menu');
    expect(menu.exists()).toBe(true);
    expect(menu.attributes('role')).toBe('menu');

    // 验证中文菜单项
    expect(menu.text()).toContain('复制当前块');
    expect(menu.text()).toContain('删除当前块');
    expect(menu.text()).toContain('清空块内容');
    expect(menu.text()).toContain('转换为...');
    expect(menu.text()).toContain('正文段落');
    expect(menu.text()).toContain('一级标题');
  });

  it('支持插槽倒置：#drag-handle 与 #block-menu 自定义接管', async () => {
    scope = effectScope();
    let editorRef: ShallowRef<Editor | null> | null = null;

    scope.run(() => {
      const { editor } = useEditor({
        content: '<p>插槽倒置测试</p>',
      });
      editorRef = editor;
    });

    await nextTick();

    wrapper = mount(AtengDragHandle, {
      props: {
        editor: editorRef?.value ?? null,
      },
      slots: {
        'drag-handle': '<button class="custom-handle-btn">Custom Grip</button>',
        'block-menu': '<div class="custom-block-menu">My Custom Menu</div>',
      },
    });

    await nextTick();

    expect(wrapper.find('.custom-handle-btn').exists()).toBe(true);
    expect(wrapper.find('.custom-handle-btn').text()).toBe('Custom Grip');
    expect(wrapper.find('.at-drag-handle__btn').exists()).toBe(false);
  });

  it('在 AtengEditor 表现容器中通过 showDragHandle 开启时能正确渲染', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>编辑器内拖拽手柄实测</p>',
        showDragHandle: true,
      },
    });

    await nextTick();

    const dragHandle = wrapper.findComponent({ name: 'AtengDragHandle' });
    expect(dragHandle.exists()).toBe(true);
  });
});
