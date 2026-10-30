/**
 * AtengEditor 多态门面模式 (<AtengEditor mode="..." />) 动态分发单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理 DOM；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，断言多态预设分发行为与契约。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import {
  AtengEditor,
  AtengSimpleToolbar,
  AtengEditorToolbar,
  AtengStatusBar,
  AtengSlashCommand,
  AtengDragHandle,
  type AtengEditorInstance,
  type EditorPresetMode,
} from '../src';

describe('AtengEditor 多态动态分发体系 (Polymorphic Presets)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('缺省 mode 或 mode="default" 时维持企业级通用底座完整形态', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>通用富文本底座</p>',
      },
    });

    await nextTick();

    expect(wrapper.classes()).toContain('at-editor');
    expect(wrapper.classes()).not.toContain('at-simple-editor');
    expect(wrapper.classes()).not.toContain('at-notion-editor');

    // 默认展示基础工具栏与状态栏
    expect(wrapper.findComponent(AtengEditorToolbar).exists()).toBe(true);
    expect(wrapper.findComponent(AtengSimpleToolbar).exists()).toBe(false);
    expect(wrapper.findComponent(AtengStatusBar).exists()).toBe(true);
    expect(wrapper.findComponent(AtengSlashCommand).exists()).toBe(true);
    expect(wrapper.findComponent(AtengDragHandle).exists()).toBe(false);

    const instance = wrapper.vm as unknown as AtengEditorInstance;
    expect(instance.getText()).toContain('通用富文本底座');
  });

  it('mode="simple" 时自动分发经典轻量预设（自适应单行工具栏、隔离浮层、支持 dense 与 tools 筛选）', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        mode: 'simple',
        modelValue: '<p>经典轻量表单</p>',
        dense: true,
        tools: ['bold', 'italic', 'underline'],
      },
    });

    await nextTick();

    // 容器样式类
    expect(wrapper.classes()).toContain('at-simple-editor');
    expect(wrapper.classes()).toContain('is-dense');

    // 自动挂载 AtengSimpleToolbar 而非普通工具栏
    expect(wrapper.findComponent(AtengSimpleToolbar).exists()).toBe(true);
    expect(wrapper.findComponent(AtengEditorToolbar).exists()).toBe(false);

    // 严格隔离斜杠命令、选区浮动微菜单与拖拽手柄
    expect(wrapper.findComponent(AtengSlashCommand).exists()).toBe(false);
    expect(wrapper.findComponent(AtengDragHandle).exists()).toBe(false);

    // 状态栏仍保留
    expect(wrapper.findComponent(AtengStatusBar).exists()).toBe(true);
  });

  it('mode="notion" 时自动分发无界知识库白板（隐藏顶栏、自动激活拖拽手柄与斜杠面板、流式宽度）', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        mode: 'notion',
        modelValue: '<p>现代知识库白板</p>',
        maxWidth: '780px',
      },
    });

    await nextTick();

    // 容器样式类与宽度变量
    expect(wrapper.classes()).toContain('at-notion-editor');
    const styleAttr = wrapper.attributes('style') ?? '';
    expect(styleAttr).toContain('--at-notion-max-width: 780px');

    // 默认隐藏顶部工具栏与底部状态栏
    expect(wrapper.findComponent(AtengEditorToolbar).exists()).toBe(false);
    expect(wrapper.findComponent(AtengSimpleToolbar).exists()).toBe(false);
    expect(wrapper.findComponent(AtengStatusBar).exists()).toBe(false);

    // 自动激活原生六点拖拽手柄与斜杠面板
    expect(wrapper.findComponent(AtengDragHandle).exists()).toBe(true);
    expect(wrapper.findComponent(AtengSlashCommand).exists()).toBe(true);
  });

  it('支持在同一实例上动态响应式切换 mode 属性并无缝变换排版形态', async () => {
    const currentMode = ref<EditorPresetMode>('simple');

    wrapper = mount(AtengEditor, {
      props: {
        mode: currentMode.value,
        modelValue: '<p>动态形态蜕变</p>',
      },
    });

    await nextTick();

    // 初始处于 simple 模式
    expect(wrapper.classes()).toContain('at-simple-editor');
    expect(wrapper.findComponent(AtengSimpleToolbar).exists()).toBe(true);
    expect(wrapper.findComponent(AtengDragHandle).exists()).toBe(false);

    // 动态切换为 notion 模式
    await wrapper.setProps({ mode: 'notion' });
    await nextTick();

    expect(wrapper.classes()).toContain('at-notion-editor');
    expect(wrapper.findComponent(AtengSimpleToolbar).exists()).toBe(false);
    expect(wrapper.findComponent(AtengDragHandle).exists()).toBe(true);

    // 动态切回 default 模式
    await wrapper.setProps({ mode: 'default' });
    await nextTick();

    expect(wrapper.classes()).not.toContain('at-simple-editor');
    expect(wrapper.classes()).not.toContain('at-notion-editor');
    expect(wrapper.findComponent(AtengEditorToolbar).exists()).toBe(true);
    expect(wrapper.findComponent(AtengDragHandle).exists()).toBe(false);
  });
});
