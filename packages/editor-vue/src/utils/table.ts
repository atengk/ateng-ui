/**
 * @atengk/editor-vue 表格操作增强工具集与清空算法。
 *
 * 遵循确定性文档树变换，提供安全的表格内容清空与结构保全算法。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor as CoreEditor } from '@tiptap/core';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';

/**
 * 清空当前所在表格的所有单元格内容，保留原有行列排版结构。
 *
 * @param editor TipTap CoreEditor 实例
 * @returns 是否成功执行清空
 */
export function clearTableContent(editor: CoreEditor | null): boolean {
  if (!editor || !editor.isActive('table')) {
    return false;
  }

  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') {
      const paragraphType = state.schema.nodes.paragraph;
      if (!paragraphType) {
        return false;
      }

      const tablePos = $from.before(d);
      const emptyParagraph = paragraphType.create();

      const newRows: ProsemirrorNode[] = [];
      node.forEach(row => {
        const newCells: ProsemirrorNode[] = [];
        row.forEach(cell => {
          newCells.push(cell.type.create(cell.attrs, emptyParagraph));
        });
        newRows.push(row.type.create(row.attrs, newCells));
      });

      const newTable = node.type.create(node.attrs, newRows);
      const tr = state.tr.replaceWith(tablePos, tablePos + node.nodeSize, newTable);
      view.dispatch(tr);
      return true;
    }
  }

  return false;
}

/**
 * 为 Editor 实例生成高阶表格人体工学操作门面方法集合。
 *
 * @param getEditor 获取当前 Editor 实例的 getter 函数
 * @returns 表格操作方法对象
 */
export function createTableActions(getEditor: () => CoreEditor | null) {
  return {
    insertTable: (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }): void => {
      getEditor()?.chain().focus().insertTable(options).run();
    },
    addRowBefore: (): void => {
      getEditor()?.chain().focus().addRowBefore().run();
    },
    addRowAfter: (): void => {
      getEditor()?.chain().focus().addRowAfter().run();
    },
    addColumnBefore: (): void => {
      getEditor()?.chain().focus().addColumnBefore().run();
    },
    addColumnAfter: (): void => {
      getEditor()?.chain().focus().addColumnAfter().run();
    },
    deleteRow: (): void => {
      getEditor()?.chain().focus().deleteRow().run();
    },
    deleteColumn: (): void => {
      getEditor()?.chain().focus().deleteColumn().run();
    },
    deleteTable: (): void => {
      getEditor()?.chain().focus().deleteTable().run();
    },
    mergeCells: (): void => {
      getEditor()?.chain().focus().mergeCells().run();
    },
    splitCell: (): void => {
      getEditor()?.chain().focus().splitCell().run();
    },
    toggleHeaderRow: (): void => {
      getEditor()?.chain().focus().toggleHeaderRow().run();
    },
    clearTable: (): boolean => {
      return clearTableContent(getEditor());
    },
  };
}
