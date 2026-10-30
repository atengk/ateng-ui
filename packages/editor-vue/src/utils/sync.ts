/**
 * @atengk/editor-vue 多轨数据同步与选区光标保护工具。
 *
 * 遵循异步抗竞态与光标防丢契约，通过内容等价性检查与事务选区钳制恢复，
 * 杜绝外部变更导致的光标跳回首行与撤销历史冲垮。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor } from '@tiptap/vue-3';
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
 * @param editor TipTap 原生 Editor 实例
 * @param content 新内容（支持 HTML、Markdown 或 JSON）
 * @param format 数据格式类型
 * @param preserveSelection 是否保留当前选区位置，默认 true
 */
export function applyContentPreservingSelection(
  editor: Editor,
  content: string | Record<string, unknown>,
  _format: EditorOutputFormat = 'html',
  preserveSelection = true,
): void {
  if (!editor || editor.isDestroyed) return;

  // 1. 暂存当前光标与选区坐标
  const { from, to } = editor.state.selection;

  // 2. 执行内容重设（emitUpdate 为 false，避免逆向二次触发外部事件自循环）
  editor.commands.setContent(content, false);

  // 3. 边界钳制并恢复光标选区（若要求保留且编辑器仍存活）
  if (preserveSelection && !editor.isDestroyed) {
    const maxPos = editor.state.doc.content.size;
    const safeFrom = Math.min(Math.max(0, from), maxPos);
    const safeTo = Math.min(Math.max(0, to), maxPos);

    try {
      editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
    } catch {
      // 容错降级：若坐标点无法解析为合法 TextSelection，保持默认光标
    }
  }
}
