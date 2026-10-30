/**
 * @atengk/editor-vue 块级斜杠命令标准预设物料定义。
 *
 * 遵循 L2 零 UI 依赖规范，内置标题、列表、待办、引用、代码块、表格与分割线标准物料。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor as CoreEditor } from '@tiptap/core';
import type { SlashCommandItem } from '../types';

/**
 * 内置标准中文块级物料预设集合。
 */
export const defaultSlashCommandItems: SlashCommandItem[] = [
  {
    id: 'heading-1',
    title: '一级标题',
    description: '最高层级大标题 (H1)',
    group: '基础块',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: 'heading-2',
    title: '二级标题',
    description: '常规章节中标题 (H2)',
    group: '基础块',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: 'heading-3',
    title: '三级标题',
    description: '子章节小标题 (H3)',
    group: '基础块',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: 'paragraph',
    title: '正文文本',
    description: '普通文本段落',
    group: '基础块',
    action: (editor: CoreEditor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: 'bullet-list',
    title: '无序列表',
    description: '项目符号清单',
    group: '列表',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: 'ordered-list',
    title: '有序列表',
    description: '数字编号清单',
    group: '列表',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    id: 'task-list',
    title: '任务待办',
    description: '可交互打勾的待办清单',
    group: '列表',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    id: 'toggle-list',
    title: '折叠列表',
    description: '可交互折叠展开的嵌套列表',
    group: '列表',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleToggleList().run();
    },
  },
  {
    id: 'callout',
    title: '高亮提示',
    description: '重点醒目提示卡片 (Callout)',
    group: '排版',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleCalloutBlock({ type: 'info' }).run();
    },
  },
  {
    id: 'blockquote',
    title: '引用',
    description: '醒目的段落引用说明',
    group: '排版',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: 'code-block',
    title: '代码块',
    description: '语法高亮代码片段',
    group: '高级',
    action: (editor: CoreEditor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: 'table',
    title: '表格',
    description: '插入 3x3 标准数据表格',
    group: '高级',
    action: (editor: CoreEditor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: 'horizontal-rule',
    title: '分割线',
    description: '水平视觉区分线',
    group: '排版',
    action: (editor: CoreEditor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
];
