/**
 * CalloutBlock 与 ToggleList 自研块级扩展独立单元测试。
 *
 * 遵循全自洽单测 3 项铁律：
 * 1. DOM 现场严格还原，afterEach 清理 DOM 与 effectScope；
 * 2. 状态零污染；
 * 3. 100% 离线自洽，验证节点渲染、HTML 序列化、反序列化与 ProseMirror 事务。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { describe, it, expect, afterEach } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { useEditor } from '../src';

describe('CalloutBlock 与 ToggleList 原生物料扩展', () => {
  let scope: EffectScope | null = null;

  afterEach(() => {
    if (scope) {
      scope.stop();
      scope = null;
    }
    document.body.innerHTML = '';
  });

  describe('CalloutBlock 重点高亮强调卡片', () => {
    it('正确解析包含 data-callout-type 的 HTML 并在 DOM 渲染 4 态样式', () => {
      scope = effectScope();
      scope.run(() => {
        const { editor, getHTML } = useEditor({
          content:
            '<div class="at-editor-callout at-editor-callout--warning" data-callout-type="warning" data-callout-icon="⚠️"><div class="at-editor-callout__content"><p>注意生产发布安全</p></div></div>',
        });

        expect(editor.value).not.toBeNull();
        const html = getHTML();
        expect(html).toContain('at-editor-callout--warning');
        expect(html).toContain('data-callout-type="warning"');
        expect(html).toContain('注意生产发布安全');
      });
    });

    it('通过 setCalloutBlock 与 toggleCalloutBlock 包装与解包选区', () => {
      scope = effectScope();
      scope.run(() => {
        const { editor, getHTML } = useEditor({
          content: '<p>需要重点突出的核心系统架构</p>',
        });

        const ed = editor.value!;
        expect(ed).not.toBeNull();

        // 选中全部文本
        ed.commands.selectAll();

        // 包装为 success 类型的 Callout
        ed.chain().focus().setCalloutBlock({ type: 'success', icon: '✅' }).run();

        let html = getHTML();
        expect(html).toContain('at-editor-callout--success');
        expect(html).toContain('data-callout-type="success"');
        expect(html).toContain('data-callout-icon="✅"');

        // 再次 toggleCalloutBlock 应该解包回普通块
        ed.commands.selectAll();
        ed.chain().focus().toggleCalloutBlock().run();

        html = getHTML();
        expect(html).not.toContain('at-editor-callout');
        expect(html).toContain('需要重点突出的核心系统架构');
      });
    });
  });

  describe('ToggleList 交互式折叠列表', () => {
    it('正确解析并渲染折叠列表结构，包含 caret 触发按钮与内容容器', () => {
      scope = effectScope();
      scope.run(() => {
        const { editor, getHTML } = useEditor({
          content:
            '<div class="at-editor-toggle is-open" data-open="true"><div class="at-editor-toggle__content"><p>折叠列表主标题</p><p>折叠隐藏的下属二级内容</p></div></div>',
        });

        expect(editor.value).not.toBeNull();
        const html = getHTML();
        expect(html).toContain('at-editor-toggle');
        expect(html).toContain('data-open="true"');
        expect(html).toContain('折叠列表主标题');
        expect(html).toContain('折叠隐藏的下属二级内容');
      });
    });

    it('支持 setToggleList 与 toggleToggleList 包装与解包', () => {
      scope = effectScope();
      scope.run(() => {
        const { editor, getHTML } = useEditor({
          content: '<p>第一行折叠标题</p><p>第二行折叠内容</p>',
        });

        const ed = editor.value!;
        ed.commands.selectAll();

        // 包装为折叠列表
        ed.chain().focus().setToggleList({ open: true }).run();

        let html = getHTML();
        expect(html).toContain('at-editor-toggle');
        expect(html).toContain('data-open="true"');

        // 再次 toggleToggleList 应该解包
        ed.commands.selectAll();
        ed.chain().focus().toggleToggleList().run();

        html = getHTML();
        expect(html).not.toContain('at-editor-toggle');
        expect(html).toContain('第一行折叠标题');
      });
    });

    it('点击折叠三角 caret 按钮触发 ProseMirror 事务原地翻转 open 状态', () => {
      scope = effectScope();
      scope.run(() => {
        const { editor } = useEditor({
          content:
            '<div class="at-editor-toggle is-open" data-open="true"><div class="at-editor-toggle__content"><p>标题</p><p>子内容</p></div></div>',
        });

        const ed = editor.value!;
        const view = ed.view;
        const dom = view.dom;

        const caretBtn = dom.querySelector('.at-editor-toggle__caret') as HTMLButtonElement | null;
        expect(caretBtn).not.toBeNull();

        // 模拟点击折叠三角
        caretBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        // 验证节点 open 状态翻转为 false
        const node = ed.state.doc.firstChild;
        expect(node?.type.name).toBe('toggleList');
        expect(node?.attrs.open).toBe(false);
      });
    });
  });
});
