/**
 * @atengk/editor-vue 组件 Props、Emits 与 Expose 强类型契约。
 *
 * 遵循单一职责与强类型闭环防线，显式规范所有 SFC 组件的对外通信接口。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { ComputedRef, ShallowRef } from 'vue';
import type { AnyExtension, Editor as CoreEditor } from '@tiptap/core';
import type { Editor } from '@tiptap/vue-3';
import type { EditorView } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import type {
  EditorOutputFormat,
  UploadHandler,
  UploadSuccessPayload,
  SlashCommandItem,
} from './editor';
import type { FullHtmlOptions } from '../utils/export';

/**
 * <AtengEditor /> 表现容器对外 Props 声明接口。
 */
export interface AtengEditorProps {
  /**
   * 默认双向绑定：标准 HTML 内容字符串。
   */
  modelValue?: string;

  /**
   * Markdown 文本双向绑定。
   */
  markdown?: string;

  /**
   * ProseMirror 结构化 JSON 树双向绑定。
   */
  json?: Record<string, unknown>;

  /**
   * 默认主双向绑定 (modelValue) 输出的数据格式，默认 'html'。
   */
  outputFormat?: EditorOutputFormat;

  /**
   * 编辑器空内容占位文案，默认“请输入正文内容...”。
   */
  placeholder?: string;

  /**
   * 是否可编辑，默认 true。
   */
  editable?: boolean;

  /**
   * 表单禁用状态，锁定输入并呈现置灰边框。
   */
  disabled?: boolean;

  /**
   * 纯净文章阅读模式，隐藏所有工具栏、浮层与边框，以优雅排版呈现阅读态。
   */
  readOnly?: boolean;

  /**
   * 是否在初始化时自动获取焦点，默认 false。
   */
  autofocus?: boolean | 'start' | 'end' | 'all' | number;

  /**
   * 自定义 TipTap 扩展集合。
   */
  extensions?: AnyExtension[];

  /**
   * 是否展示原生轻量微工具栏，默认 true。
   */
  showToolbar?: boolean;

  /**
   * 工具栏是否开启吸顶悬浮效果 (Sticky)，默认 false。
   */
  stickyToolbar?: boolean;

  /**
   * 是否启用表格动态上下文微浮层菜单，默认 true。
   */
  showTableMenu?: boolean;

  /**
   * 是否启用超链接动态上下文微浮层菜单，默认 true。
   */
  showLinkMenu?: boolean;

  /**
   * 是否启用图片动态上下文微浮层菜单，默认 true。
   */
  showImageMenu?: boolean;

  /**
   * 是否启用划选文本高频排版微浮层菜单，默认 true。
   */
  showBubbleMenu?: boolean;

  /**
   * 是否启用中文块级斜杠命令面板，默认 true。
   */
  showSlashCommand?: boolean;

  /**
   * 纯文本字符数硬限制上限。达到上限时通过 ProseMirror 事务拦截物理键盘输入与外部粘贴。
   */
  maxLength?: number;

  /**
   * 是否展示吸底状态栏，默认 true。
   */
  showStatusBar?: boolean;

  /**
   * 是否在状态栏中展示词数统计，默认 true。
   */
  showWordCount?: boolean;

  /**
   * 是否在状态栏中展示段落数统计，默认 true。
   */
  showParagraphCount?: boolean;

  /**
   * 媒体资产上传拦截器 SPI 处理函数。
   */
  uploadHandler?: UploadHandler;

  /**
   * 编辑器固定高度，支持数字（像素）或 CSS 长度字符串。
   */
  height?: number | string;

  /**
   * 编辑器最小高度。
   */
  minHeight?: number | string;

  /**
   * 编辑器最大高度。
   */
  maxHeight?: number | string;
}

/**
 * <AtengEditor /> 事件发射器 Emits 契约定义。
 */
export interface AtengEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'update:markdown', value: string): void;
  (e: 'update:json', value: Record<string, unknown>): void;
  (e: 'change', html: string): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
  (e: 'uploadSuccess', payload: UploadSuccessPayload): void;
  (e: 'uploadError', error: Error, file: File): void;
  (e: 'update:fullscreen', isFullscreen: boolean): void;
  (e: 'themeChange', isDark: boolean): void;
}

/**
 * <AtengEditor /> 表现容器对外 Expose 暴露的方法与状态实例契约。
 */
export interface AtengEditorExpose {
  /**
   * 底层受管的 TipTap Editor 原生实例引用。
   */
  editor: ShallowRef<Editor | null>;

  /**
   * 手动聚焦编辑器。
   */
  focus: (position?: 'start' | 'end' | 'all' | number | boolean) => void;

  /**
   * 手动失焦编辑器。
   */
  blur: () => void;

  /**
   * 清空编辑器全部内容。
   */
  clearContent: (emitUpdate?: boolean) => void;

  /**
   * 重设或替换编辑器内容。
   */
  setContent: (content: string | Record<string, unknown>, emitUpdate?: boolean) => void;

  /**
   * 手动触发图片文件上传并插入当前光标位置。
   */
  uploadImage: (file: File) => void;

  /**
   * 获取当前净化后的 HTML 内容。
   */
  getHTML: () => string;

  /**
   * 获取完整自洽的离线 HTML 网页文档（包含 <!DOCTYPE html>、<head> 及内联排版样式）。
   */
  getFullHTML: (options?: FullHtmlOptions) => string;

  /**
   * 获取当前 ProseMirror JSON 内容。
   */
  getJSON: () => Record<string, unknown>;

  /**
   * 获取当前 Markdown 格式内容。
   */
  getMarkdown: () => string;

  /**
   * 获取当前纯文本文本内容。
   */
  getText: () => string;

  /**
   * 当前编辑器内容是否为空。
   */
  isEmpty: ComputedRef<boolean>;

  /**
   * 当前是否处于脱壳全屏状态。
   */
  isFullscreen: ShallowRef<boolean> | ComputedRef<boolean>;

  /**
   * 切换全屏沉浸模式与普通模式。
   */
  toggleFullscreen: () => void;

  /**
   * 获取当前纯文本字符数统计。
   */
  getCharacters: () => number;

  /**
   * 获取当前词数统计。
   */
  getWords: () => number;

  /**
   * 获取当前段落与标题块数统计。
   */
  getParagraphs: () => number;

  /**
   * 插入标准网格表格。
   */
  insertTable: (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }) => void;

  /**
   * 在当前表格上方插入新行。
   */
  addRowBefore: () => void;

  /**
   * 在当前表格下方插入新行。
   */
  addRowAfter: () => void;

  /**
   * 在当前表格左侧插入新列。
   */
  addColumnBefore: () => void;

  /**
   * 在当前表格右侧插入新列。
   */
  addColumnAfter: () => void;

  /**
   * 删除当前所在行。
   */
  deleteRow: () => void;

  /**
   * 删除当前所在列。
   */
  deleteColumn: () => void;

  /**
   * 删除当前整张表格。
   */
  deleteTable: () => void;

  /**
   * 合并选中的单元格。
   */
  mergeCells: () => void;

  /**
   * 拆分当前单元格。
   */
  splitCell: () => void;

  /**
   * 切换表格表头行。
   */
  toggleHeaderRow: () => void;

  /**
   * 清空表格所有单元格内容。
   */
  clearTable: () => boolean;
}

/**
 * <AtengEditorToolbar /> 原生微工具栏组件入参 Props 接口。
 */
export interface AtengEditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  isFullscreen?: boolean;
}

/**
 * <AtengTableBubbleMenu /> 表格动态上下文气泡浮层组件入参 Props 接口。
 */
export interface AtengTableBubbleMenuProps {
  editor: Editor | null;
  disabled?: boolean;
  tippyOptions?: Record<string, unknown>;
  shouldShow?: (props: {
    editor: CoreEditor;
    element: HTMLElement;
    view: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
  }) => boolean;
}

/**
 * <AtengImageBubbleMenu /> 图片动态上下文气泡浮层组件入参 Props 接口。
 */
export interface AtengImageBubbleMenuProps {
  editor: Editor | null;
  disabled?: boolean;
  tippyOptions?: Record<string, unknown>;
  shouldShow?: (props: {
    editor: CoreEditor;
    element: HTMLElement;
    view: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
  }) => boolean;
}

/**
 * <AtengLinkBubbleMenu /> 超链接动态上下文气泡浮层组件入参 Props 接口。
 */
export interface AtengLinkBubbleMenuProps {
  editor: Editor | null;
  disabled?: boolean;
  tippyOptions?: Record<string, unknown>;
  shouldShow?: (props: {
    editor: CoreEditor;
    element: HTMLElement;
    view: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
  }) => boolean;
}

/**
 * <AtengBubbleMenu /> 选区文本排版微浮层组件入参 Props 接口。
 */
export interface AtengBubbleMenuProps {
  editor: Editor | null;
  disabled?: boolean;
  tippyOptions?: Record<string, unknown>;
  shouldShow?: (props: {
    editor: CoreEditor;
    element: HTMLElement;
    view: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
  }) => boolean;
}

/**
 * <AtengSlashCommand /> 块级斜杠命令面板组件入参 Props 接口。
 */
export interface AtengSlashCommandProps {
  editor: Editor | null;
  disabled?: boolean;
  triggerOnEmpty?: boolean;
  items?: SlashCommandItem[];
  tippyOptions?: Record<string, unknown>;
  shouldShow?: (props: {
    editor: CoreEditor;
    element: HTMLElement;
    view: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
  }) => boolean;
}

/**
 * <AtengStatusBar /> 吸底状态栏组件入参 Props 接口。
 */
export interface AtengStatusBarProps {
  editor: Editor | null;
  maxLength?: number;
  showWordCount?: boolean;
  showParagraphCount?: boolean;
}

export type { FullHtmlOptions };
