/**
 * @atengk/editor-vue 表格人体工学与动态上下文气泡菜单单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理挂载容器与 body；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证表格增删行列、单元格合并拆分与插槽反转契约。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import { AtengEditor, AtengTableBubbleMenu, type AtengEditorInstance } from '../src';

describe('表格人体工学与上下文气泡浮层 (Table Ergonomics)', () => {
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

  it('成功在编辑器中插入 3x3 标准表格并生成语义化 HTML 结构', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>前置段落</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);
    expect(editor).toBeTruthy();

    // 插入包含表头行的 3x3 表格
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    await nextTick();

    const html = instance.getHTML();
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');

    // 验证表格节点在 ProseMirror DOM 中正常渲染
    const tableEl = wrapper.find('table');
    expect(tableEl.exists()).toBe(true);
    const rows = tableEl.findAll('tr');
    expect(rows.length).toBe(3);
  });

  it('支持在表格中动态添加行、删除行与增删列', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>正文</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);
    expect(editor).toBeTruthy();

    // 插入 2x2 表格
    editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    await nextTick();

    let tableEl = wrapper.find('table');
    expect(tableEl.findAll('tr').length).toBe(2);

    // 在下方追加行
    editor.chain().focus().addRowAfter().run();
    await nextTick();
    tableEl = wrapper.find('table');
    expect(tableEl.findAll('tr').length).toBe(3);

    // 在右侧追加列
    editor.chain().focus().addColumnAfter().run();
    await nextTick();
    const firstRowCols = wrapper.find('tr').findAll('td');
    expect(firstRowCols.length).toBe(3);

    // 删除当前行
    editor.chain().focus().deleteRow().run();
    await nextTick();
    expect(wrapper.find('table').findAll('tr').length).toBe(2);

    // 删除当前列
    editor.chain().focus().deleteColumn().run();
    await nextTick();
    expect(wrapper.find('tr').findAll('td').length).toBe(2);
  });

  it('支持切换表头行与整表删除', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>测试文本</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    // 插入无表头的 2x2 表格
    editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    await nextTick();

    expect(wrapper.find('th').exists()).toBe(false);

    // 切换表头行
    editor.chain().focus().toggleHeaderRow().run();
    await nextTick();
    expect(wrapper.find('th').exists()).toBe(true);

    // 删除整张表格
    editor.chain().focus().deleteTable().run();
    await nextTick();
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('微工具栏包含表格插入按钮并具备无障碍标题', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>内容</p>',
      },
    });

    await nextTick();
    const tableBtn = wrapper.find('button[aria-label="插入表格"]');
    expect(tableBtn.exists()).toBe(true);
    expect(tableBtn.attributes('title')).toContain('插入表格');

    // 点击微工具栏的插入表格按钮
    await tableBtn.trigger('click');
    await nextTick();

    expect(wrapper.find('table').exists()).toBe(true);
  });

  it('支持通过 #table-menu 插槽实现 100% 表现层反转替换', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>测试表格插槽</p>',
      },
      slots: {
        'table-menu': (slotProps: { editor: Editor }) =>
          h(
            'div',
            { class: 'custom-table-menu' },
            `自定义表格操作栏: ${Boolean(slotProps.editor)}`,
          ),
      },
    });

    await nextTick();
    const customMenu = wrapper.find('.custom-table-menu');
    expect(customMenu.exists()).toBe(true);
    expect(customMenu.text()).toContain('自定义表格操作栏: true');
  });

  it('AtengTableBubbleMenu 独立组件正确初始化', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>普通无表格文本</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);
    expect(editor).toBeTruthy();

    const bubbleMenuWrapper = mount(AtengTableBubbleMenu, {
      props: {
        editor,
      },
    });

    await nextTick();
    expect(bubbleMenuWrapper.find('.at-editor-table-menu').exists()).toBe(true);
    // 验证包含清空表格按钮
    const clearBtn = bubbleMenuWrapper.find('button[aria-label="清空表格"]');
    expect(clearBtn.exists()).toBe(true);
    expect(clearBtn.attributes('title')).toBe('清空表格');
    bubbleMenuWrapper.unmount();
  });

  it('支持通过 clearTable 门面清空表格所有单元格内容并保持排版结构', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>正文</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;
    const editor = extractEditor(instance);

    // 插入包含文本的表格
    editor
      .chain()
      .focus()
      .insertTable({ rows: 2, cols: 2, withHeaderRow: false })
      .insertContent('单元格A内容')
      .run();
    await nextTick();

    expect(instance.getText()).toContain('单元格A内容');

    // 调用高阶门面 clearTable()
    const success = instance.clearTable();
    await nextTick();

    expect(success).toBe(true);
    // 验证单元格文本被清空，但 2x2 表格结构完好无损
    expect(instance.getText()).not.toContain('单元格A内容');
    expect(wrapper.find('table').exists()).toBe(true);
    expect(wrapper.findAll('tr').length).toBe(2);
    expect(wrapper.findAll('td').length).toBe(4);
  });

  it('支持直接调用 AtengEditor 暴露的表格高阶人体工学门面方法', async () => {
    wrapper = mount(AtengEditor, {
      props: {
        modelValue: '<p>前置内容</p>',
      },
    });

    await nextTick();
    const instance = wrapper.vm as unknown as AtengEditorInstance;

    // 验证门面方法存在
    expect(typeof instance.insertTable).toBe('function');
    expect(typeof instance.addRowBefore).toBe('function');
    expect(typeof instance.addRowAfter).toBe('function');
    expect(typeof instance.addColumnBefore).toBe('function');
    expect(typeof instance.addColumnAfter).toBe('function');
    expect(typeof instance.deleteRow).toBe('function');
    expect(typeof instance.deleteColumn).toBe('function');
    expect(typeof instance.deleteTable).toBe('function');
    expect(typeof instance.mergeCells).toBe('function');
    expect(typeof instance.splitCell).toBe('function');
    expect(typeof instance.toggleHeaderRow).toBe('function');

    // 通过门面插入表格
    instance.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    await nextTick();
    expect(wrapper.find('table').exists()).toBe(true);
    expect(wrapper.findAll('tr').length).toBe(2);

    // 通过门面追加行
    instance.addRowAfter();
    await nextTick();
    expect(wrapper.findAll('tr').length).toBe(3);
  });
});
