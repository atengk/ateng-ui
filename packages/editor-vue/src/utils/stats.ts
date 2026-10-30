/**
 * @atengk/editor-vue 统计指标（字符、词数、段落）安全提取工具。
 *
 * 封装对 TipTap Storage 与 ProseMirror AST 的安全类型守卫，杜绝特性依恋与空文档段落误判。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor } from '@tiptap/vue-3';

/**
 * 安全获取编辑器纯文本字符数。
 *
 * @param editor TipTap Editor 实例
 * @returns 字符数统计
 */
export function getEditorCharacters(editor: Editor | null): number {
  if (!editor || editor.isEmpty) return 0;
  const storage = editor.storage as Record<string, unknown> | undefined;
  const charStorage = storage?.characterCount as { characters?: () => number } | undefined;
  if (typeof charStorage?.characters === 'function') {
    return charStorage.characters();
  }
  return editor.getText().length;
}

/**
 * 安全获取编辑器词数统计。
 *
 * @param editor TipTap Editor 实例
 * @returns 词数统计
 */
export function getEditorWords(editor: Editor | null): number {
  if (!editor || editor.isEmpty) return 0;
  const storage = editor.storage as Record<string, unknown> | undefined;
  const charStorage = storage?.characterCount as { words?: () => number } | undefined;
  if (typeof charStorage?.words === 'function') {
    return charStorage.words();
  }
  return 0;
}

/**
 * 安全获取编辑器段落与标题块数统计（空文档保底归零）。
 *
 * @param editor TipTap Editor 实例
 * @returns 段落与标题块数
 */
export function getEditorParagraphs(editor: Editor | null): number {
  if (!editor || editor.isEmpty) return 0;
  let count = 0;
  editor.state.doc.descendants(node => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      count++;
    }
  });
  return count;
}
