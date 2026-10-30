/**
 * @atengk/editor-vue 多轨数据同步与选区光标保护工具。
 *
 * 遵循异步抗竞态与光标防丢契约，通过内容等价性检查与事务增量打补丁，
 * 杜绝外部变更导致的光标跳回首行与撤销历史冲垮。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor } from '@tiptap/vue-3';
import { createDocument } from '@tiptap/core';
import { TextSelection, Selection } from '@tiptap/pm/state';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import type { EditorOutputFormat } from '../types';

/**
 * 校验两个富文本数据内容是否语义等价。
 *
 * @param a 前序内容
 * @param b 新内容
 * @returns 是否等价
 */
export function isContentEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) {
    return b === null || b === undefined || b === '' || b === '<p></p>';
  }
  if (b === null || b === undefined) {
    return a === '' || a === '<p></p>';
  }

  // 字符串类型对比
  if (typeof a === 'string' && typeof b === 'string') {
    // 消除两端空白
    const trimmedA = a.trim();
    const trimmedB = b.trim();
    if (trimmedA === trimmedB) return true;

    // 针对空段落与空字符串等价判定
    const emptyVariants = ['', '<p></p>', '<p></p>\n'];
    if (emptyVariants.includes(trimmedA) && emptyVariants.includes(trimmedB)) {
      return true;
    }
    return false;
  }

  // 对象类型对比 (ProseMirror JSON 树)
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * 安全应用外部数据更新至 TipTap 编辑器，保全当前光标选区与撤销历史。
 *
 * 通过 ProseMirror 事务（Transaction）进行原子替换打补丁，
 * 彻底消除 setContent 粗暴重设导致的 Undo/Redo 历史栈冲垮与光标漂移。
 *
 * @param editor TipTap 原生 Editor 实例
 * @param content 新内容（支持 HTML、Markdown 或 JSON）
 * @param format 数据格式类型，支持 'html' | 'markdown' | 'json'
 * @param preserveSelection 是否保留当前选区位置，默认 true
 */
export function applyContentPreservingSelection(
  editor: Editor,
  content: string | Record<string, unknown>,
  format: EditorOutputFormat = 'html',
  preserveSelection = true,
): void {
  if (!editor || editor.isDestroyed) return;

  const { state, view } = editor;
  const { from, to } = state.selection;
  const { tr, doc } = state;

  // 1. 根据数据格式解析新文档树节点
  let newDoc: ProsemirrorNode | null = null;
  try {
    if (format === 'json' && typeof content === 'object') {
      newDoc = editor.schema.nodeFromJSON(content);
    } else {
      newDoc = createDocument(content, editor.schema, editor.options.parseOptions, {
        errorOnInvalidContent: false,
      });
    }
  } catch {
    // 解析失败兜底降级，避免崩溃
    return;
  }

  if (!newDoc) return;

  // 2. 使用 ProseMirror 事务增量替换文档内容，保全撤销/重做历史栈
  tr.replaceWith(0, doc.content.size, newDoc.content);
  tr.setMeta('preventUpdate', true);

  // 3. 边界钳制并精确恢复当前选区坐标
  if (preserveSelection) {
    const maxPos = tr.doc.content.size;
    const safeFrom = Math.min(Math.max(0, from), maxPos);
    const safeTo = Math.min(Math.max(0, to), maxPos);

    try {
      tr.setSelection(TextSelection.create(tr.doc, safeFrom, safeTo));
    } catch {
      try {
        const nearSel = Selection.near(tr.doc.resolve(safeFrom));
        tr.setSelection(nearSel);
      } catch {
        // 忽略非致命选区异常
      }
    }
  }

  // 4. 原子派发事务
  view.dispatch(tr);
}
