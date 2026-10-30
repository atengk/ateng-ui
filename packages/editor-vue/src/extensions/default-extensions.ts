/**
 * @atengk/editor-vue 企业核心扩展预设装配器。
 *
 * 内置排名前 90% 的高频排版、代码高亮、表格、列表、对齐与占位扩展集合。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import { createLowlight, common } from 'lowlight';
import { FileUploadExtension } from './upload';
import type { UploadHandler, UploadSuccessPayload } from '../types';

const lowlight = createLowlight(common);

export interface CreateDefaultExtensionsOptions {
  /**
   * 空状态占位提示文案。
   */
  placeholder?: string;
  /**
   * 自定义追加的扩展。
   */
  extraExtensions?: AnyExtension[];
  /**
   * 媒体资产上传拦截器 SPI。
   */
  uploadHandler?: UploadHandler;
  /**
   * 媒体资产上传成功回调。
   */
  onUploadSuccess?: (payload: UploadSuccessPayload) => void;
  /**
   * 媒体资产上传失败回调。
   */
  onUploadError?: (error: Error, file: File) => void;
  /**
   * 纯文本字符数硬限制上限。
   */
  maxLength?: number;
}

/**
 * 组装并返回标准企业级默认 TipTap 扩展集合。
 *
 * @param options 配置参数
 * @returns 扩展数组
 */
export function createDefaultExtensions(
  options: CreateDefaultExtensionsOptions = {},
): AnyExtension[] {
  const baseExtensions: AnyExtension[] = [
    StarterKit.configure({
      codeBlock: false,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Highlight.configure({
      multicolor: true,
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Placeholder.configure({
      placeholder: options.placeholder ?? '请输入正文内容...',
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
      },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    FileUploadExtension.configure({
      uploadHandler: options.uploadHandler,
      onUploadSuccess: options.onUploadSuccess,
      onUploadError: options.onUploadError,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount.configure({
      limit: options.maxLength ?? null,
    }),
    Markdown.configure({
      html: true,
      tightLists: true,
    }),
  ];

  if (options.extraExtensions && options.extraExtensions.length > 0) {
    baseExtensions.push(...options.extraExtensions);
  }

  return baseExtensions;
}
