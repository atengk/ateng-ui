/**
 * @atengk/editor-vue 超链接操作与安全校验工具。
 *
 * 遵循确定性文档变换不变量，在设置与取消链接时自动前置扩选整段链接范围，
 * 彻底消除光标折叠未划选时 unsetLink 无法剥除链接标签的缺陷。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor } from '@tiptap/vue-3';

/**
 * 弹出输入框并为当前选区或光标所在节点安全设置超链接。
 *
 * @param editor TipTap Editor 实例
 */
export function promptAndSetLink(editor: Editor | null): void {
  if (!editor || !editor.isEditable) return;

  const previousUrl = editor.getAttributes('link').href as string | undefined;
  const href = window.prompt('请输入超链接地址 (URL):', previousUrl || 'https://');
  if (href === null) return;

  const trimmed = href.trim();
  if (trimmed === '' || trimmed === 'https://' || trimmed === 'http://') {
    unsetLinkSafe(editor);
  } else {
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  }
}

/**
 * 安全解除超链接，自动前置扩选整段链接文本范围。
 *
 * @param editor TipTap Editor 实例
 */
export function unsetLinkSafe(editor: Editor | null): void {
  if (!editor || !editor.isEditable) return;
  editor.chain().focus().extendMarkRange('link').unsetLink().run();
}
