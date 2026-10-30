/**
 * @atengk/editor-vue 选区气泡浮层与块级斜杠命令单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理挂载容器与 body；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证选区文本划选气泡、键盘流斜杠命令唤起、物料插入与插槽反转契约。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  AtengEditor,
  AtengBubbleMenu,
  AtengSlashCommand,
  type AtengEditorInstance,
  type SlashCommandItem,
} from '../src';

describe('选区气泡浮层与斜杠命令 (Selection Bubble & Slash Commands)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const extractEditor = (inst: AtengEditorInstance): Editor => {
    const raw = (inst.editor as unknown as { value?: Editor })?.value ?? inst.editor;
    return raw as unknown as Editor;
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('AtengBubbleMenu 独立组件正确初始化并包含常用排版操作按钮', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>划选测试文本内容</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);
    expect(editor).toBeTruthy();

    const bubbleMenuWrapper = mount(AtengBubbleMenu, {
      props: {
        editor,
      },
    });

    await nextTick();
    expect(bubbleMenuWrapper.find('.at-editor-bubble-menu').exists()).toBe(true);

    // 验证包含粗体、斜体、下划线、删除线、行内代码、高亮与超链接按钮
    expect(bubbleMenuWrapper.find('button[aria-label="粗体"]').exists()).toBe(true);
    expect(bubbleMenuWrapper.find('button[aria-label="斜体"]').exists()).toBe(true);
    expect(bubbleMenuWrapper.find('button[aria-label="下划线"]').exists()).toBe(true);
    expect(bubbleMenuWrapper.find('button[aria-label="删除线"]').exists()).toBe(true);
    expect(bubbleMenuWrapper.find('button[aria-label="行内代码"]').exists()).toBe(true);
    expect(bubbleMenuWrapper.find('button[aria-label="文本高亮"]').exists()).toBe(true);
    expect(bubbleMenuWrapper.find('button[aria-label="超链接"]').exists()).toBe(true);

    bubbleMenuWrapper.unmount();
  });

  it('AtengBubbleMenu 支持响应划选文本并执行加粗、高亮与删除线指令', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>高频格式排版测试</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    const bubbleMenuWrapper = mount(AtengBubbleMenu, {
      props: {
        editor,
      },
    });

    await nextTick();

    // 选中前 4 个字符并执行加粗
    editor.commands.setTextSelection({ from: 1, to: 5 });
    const boldBtn = bubbleMenuWrapper.find('button[aria-label="粗体"]');
    await boldBtn.trigger('click');
    await nextTick();

    expect(instance.getHTML()).toContain('<strong>高频格式</strong>');

    // 选中后 4 个字符并执行高亮
    editor.commands.setTextSelection({ from: 5, to: 9 });
    const highlightBtn = bubbleMenuWrapper.find('button[aria-label="文本高亮"]');
    await highlightBtn.trigger('click');
    await nextTick();

    expect(instance.getHTML()).toContain('<mark');

    bubbleMenuWrapper.unmount();
  });

  it('支持通过 #bubble-menu 插槽实现 100% 选区气泡浮层定制反转', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>测试选区气泡插槽</p>',
      },
      slots: {
        'bubble-menu': (slotProps: { editor: Editor }) =>
          h(
            'div',
            { class: 'custom-bubble-menu-slot' },
            `自定义选区气泡浮层: ${Boolean(slotProps.editor)}`,
          ),
      },
    });

    await nextTick();
    const customSlot = wrapper.find('.custom-bubble-menu-slot');
    expect(customSlot.exists()).toBe(true);
    expect(customSlot.text()).toContain('自定义选区气泡浮层: true');
  });

  it('AtengSlashCommand 独立组件正确初始化并展示标准中文块级物料', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p></p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    const slashWrapper = mount(AtengSlashCommand, {
      props: {
        editor,
      },
    });

    await nextTick();
    expect(slashWrapper.find('.at-editor-slash-menu').exists()).toBe(true);

    // 验证包含所有 11 种标准块级物料项
    const items = slashWrapper.findAll('.at-editor-slash-menu__item');
    expect(items.length).toBe(11);

    const itemTitles = items.map(item => item.find('.at-editor-slash-menu__item-title').text());
    expect(itemTitles).toContain('一级标题');
    expect(itemTitles).toContain('二级标题');
    expect(itemTitles).toContain('三级标题');
    expect(itemTitles).toContain('正文文本');
    expect(itemTitles).toContain('无序列表');
    expect(itemTitles).toContain('有序列表');
    expect(itemTitles).toContain('任务待办');
    expect(itemTitles).toContain('引用');
    expect(itemTitles).toContain('代码块');
    expect(itemTitles).toContain('表格');
    expect(itemTitles).toContain('分割线');

    slashWrapper.unmount();
  });

  it('AtengSlashCommand 支持鼠标点击物料项并插入到编辑器文档中', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p></p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    const slashWrapper = mount(AtengSlashCommand, {
      props: {
        editor,
      },
    });

    await nextTick();

    // 点击“一级标题”物料
    const h1Item = slashWrapper
      .findAll('.at-editor-slash-menu__item')
      .find(btn => btn.text().includes('一级标题'));
    expect(h1Item).toBeTruthy();
    if (h1Item) {
      await h1Item.trigger('click');
      await nextTick();
    }

    expect(instance.getHTML()).toContain('<h1');

    slashWrapper.unmount();
  });

  it('AtengSlashCommand 支持键盘 ArrowDown/ArrowUp 切换高亮与 Enter 快速插入', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p></p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    const slashWrapper = mount(AtengSlashCommand, {
      props: {
        editor,
      },
    });

    await nextTick();

    // 默认第 0 项高亮 (一级标题)
    let selectedItem = slashWrapper.find('.at-editor-slash-menu__item.is-selected');
    expect(selectedItem.text()).toContain('一级标题');

    // 模拟按下 ArrowDown：切换到第 1 项 (二级标题)
    editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    await nextTick();

    selectedItem = slashWrapper.find('.at-editor-slash-menu__item.is-selected');
    expect(selectedItem.text()).toContain('二级标题');

    // 模拟按下 ArrowUp：回退到第 0 项 (一级标题)
    editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    await nextTick();

    selectedItem = slashWrapper.find('.at-editor-slash-menu__item.is-selected');
    expect(selectedItem.text()).toContain('一级标题');

    // 模拟按下 Enter：插入当前选中的物料
    editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await nextTick();

    expect(instance.getHTML()).toContain('<h1');

    slashWrapper.unmount();
  });

  it('AtengSlashCommand 在输入斜杠与关键字后能正确清理斜杠并插入物料', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>/table</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    // 将光标定位在 /table 文本末尾
    editor.commands.setTextSelection(7);

    const slashWrapper = mount(AtengSlashCommand, {
      props: {
        editor,
      },
    });

    await nextTick();

    // 找到表格物料并执行插入
    const tableItem = slashWrapper
      .findAll('.at-editor-slash-menu__item')
      .find(btn => btn.text().includes('表格'));
    expect(tableItem).toBeTruthy();
    if (tableItem) {
      await tableItem.trigger('click');
      await nextTick();
    }

    const html = instance.getHTML();
    // 验证前置的 /table 字符已被干净清除，且成功插入了表格
    expect(html).not.toContain('<p>/table</p>');
    expect(instance.getText()).not.toContain('/table');
    expect(html).toContain('<table');

    slashWrapper.unmount();
  });

  it('支持通过 #slash-command 插槽实现 100% 斜杠菜单定制反转', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>测试斜杠命令插槽</p>',
      },
      slots: {
        'slash-command': (slotProps: {
          editor: Editor;
          items: SlashCommandItem[];
          selectedIndex: number;
        }) =>
          h(
            'div',
            { class: 'custom-slash-command-slot' },
            `自定义斜杠物料数量: ${slotProps.items?.length ?? 0}`,
          ),
      },
    });

    await nextTick();
    const customSlot = wrapper.find('.custom-slash-command-slot');
    expect(customSlot.exists()).toBe(true);
    expect(customSlot.text()).toContain('自定义斜杠物料数量: 11');
  });

  it('支持通过 showBubbleMenu 与 showSlashCommand 显式关闭浮层渲染', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>浮层关闭测试</p>',
        showBubbleMenu: false,
        showSlashCommand: false,
      },
    });

    await nextTick();
    expect(wrapper.findComponent(AtengBubbleMenu).exists()).toBe(false);
    expect(wrapper.findComponent(AtengSlashCommand).exists()).toBe(false);
  });
});
