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
import type { AiStreamHandler, AiPromptAction } from './ai';
import type {
  PageOrientation,
  PageMarginPreset,
  PageMarginConfig,
  DocxHeaderFooterAlign,
} from './docx';
import type { FullHtmlOptions } from '../utils/export';

/**
 * 企业级富文本预设统一基线契约接口。
 */
export interface EditorBaseProps {
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
   * 纯文本字符数硬限制上限。达到上限时通过 ProseMirror 事务拦截物理键盘输入与外部粘贴。
   */
  maxLength?: number;

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
 * 编辑器高阶场景预设模式枚举契约。
 */
export type EditorPresetMode = 'default' | 'simple' | 'notion' | 'agent' | 'docx';

/**
 * <AtengEditor /> 表现容器对外 Props 声明接口。
 */
export interface AtengEditorProps extends EditorBaseProps {
  /**
   * 编辑器高阶场景预设模式。
   * - 'default': 标准通用富文本编辑器（包含顶部完整工具栏、状态栏、浮动菜单与斜杠命令）；
   * - 'simple': 经典轻量自适应编辑器，标配响应式单行折叠微工具栏与紧凑模式，彻底隔离斜杠与浮层干扰；
   * - 'notion': 现代沉浸式无界白板，标配左侧六点拖拽手柄、斜杠面板、Callout 重点高亮与 Toggle 折叠列表物料；
   * - 'agent': 智能体辅助创作编辑器（Phase 2，支持行内 AI 流式审阅与对比状态机）；
   * - 'docx': A4 物理分页排版与公文公文书编辑器（Phase 3，仿真纸张与 OpenXML 导出）。
   * @default 'default'
   */
  mode?: EditorPresetMode;

  /**
   * 声明式定制 Simple 工具栏工具集合（仅在 mode='simple' 时生效，缺省展示全套工具）。
   */
  tools?: SimpleToolbarItem[];

  /**
   * 是否启用 Simple 紧凑模式（内外边距更小，仅在 mode='simple' 时生效）。
   */
  dense?: boolean;

  /**
   * 预设画布最大宽度（主要用于 Notion 知识库流式居中排版，如 '860px'）。
   */
  maxWidth?: string;

  /**
   * 纸张方向（仅在 mode='docx' 时生效）。
   * @default 'portrait'
   */
  orientation?: PageOrientation;

  /**
   * 页面边距预设或自定义（仅在 mode='docx' 时生效）。
   * @default 'standard'
   */
  pageMargin?: PageMarginPreset | PageMarginConfig;

  /**
   * 是否展示顶部毫米标尺（仅在 mode='docx' 时生效）。
   * @default true
   */
  showRuler?: boolean;

  /**
   * 页眉文本内容（仅在 mode='docx' 时生效）。
   */
  header?: string;

  /**
   * 页脚文本内容（仅在 mode='docx' 时生效）。
   */
  footer?: string;

  /**
   * 是否展示动态页码（仅在 mode='docx' 时生效）。
   * @default true
   */
  showPageNumber?: boolean;

  /**
   * 页眉对齐方式（仅在 mode='docx' 时生效）。
   * @default 'center'
   */
  headerAlign?: DocxHeaderFooterAlign;

  /**
   * 页脚对齐方式（仅在 mode='docx' 时生效）。
   * @default 'center'
   */
  footerAlign?: DocxHeaderFooterAlign;

  /**
   * 是否展示原生轻量微工具栏，默认根据 mode 自适应（default/simple 为 true，notion 为 false）。
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
   * 是否启用左侧块级六点悬浮拖拽手柄，默认 false。
   */
  showDragHandle?: boolean;

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
  (e: 'update:header', header: string): void;
  (e: 'update:footer', footer: string): void;
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

/**
 * Simple Editor 工具栏可用功能项声明。
 */
export type SimpleToolbarItem =
  | 'undo'
  | 'redo'
  | 'heading'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'align'
  | 'list'
  | 'taskList'
  | 'blockquote'
  | 'code'
  | 'codeBlock'
  | 'link'
  | 'image'
  | 'table'
  | 'clear'
  | 'fullscreen';

/**
 * <AtengSimpleEditor /> 预设组件 Props 契约声明。
 */
export interface SimpleEditorProps extends AtengEditorProps {
  /**
   * 自定义声明的工具栏项集合。缺省时展示全套预设工具。
   */
  tools?: SimpleToolbarItem[];

  /**
   * 紧凑模式。开启后工具栏按钮更小、内外边距更紧凑。
   */
  dense?: boolean;
}

/**
 * <AtengSimpleToolbar /> 组件入参 Props 接口。
 */
export interface AtengSimpleToolbarProps {
  /**
   * TipTap 原生 Editor 实例。
   */
  editor: Editor | null;

  /**
   * 声明式挑选的工具栏项。
   */
  tools?: SimpleToolbarItem[];

  /**
   * 是否启用紧凑模式。
   */
  dense?: boolean;

  /**
   * 是否禁用操作。
   */
  disabled?: boolean;

  /**
   * 当前是否处于全屏模式。
   */
  isFullscreen?: boolean;
}

/**
 * 块级上下文菜单操作项动作集合。
 */
export interface DragHandleBlockActions {
  /**
   * 复制当前块并在下方插入。
   */
  duplicate: () => void;
  /**
   * 删除当前块。
   */
  delete: () => void;
  /**
   * 清空当前块内容。
   */
  clear: () => void;
  /**
   * 将当前块转换为指定类型。
   */
  transformTo: (
    type:
      | 'paragraph'
      | 'h1'
      | 'h2'
      | 'h3'
      | 'bulletList'
      | 'orderedList'
      | 'taskList'
      | 'blockquote'
      | 'codeBlock',
  ) => void;
}

/**
 * <AtengDragHandle /> 悬浮拖拽手柄入参 Props 接口。
 */
export interface AtengDragHandleProps {
  /**
   * TipTap 原生 Editor 实例。
   */
  editor: Editor | null;

  /**
   * 是否禁用手柄与菜单。
   */
  disabled?: boolean;

  /**
   * 手柄相对于块左侧的水平偏移量（像素），默认 -28。
   */
  offsetX?: number;
}

/**
 * Notion-like 现代沉浸式无界白板预设配置。
 */
export interface NotionEditorProps extends EditorBaseProps {
  /**
   * 是否启用六点悬浮拖拽手柄。
   * @default true
   */
  dragHandle?: boolean;

  /**
   * 是否启用斜杠快速命令。
   * @default true
   */
  slashCommand?: boolean;

  /**
   * 是否启用重点高亮卡片扩展 (CalloutBlock)。
   * @default true
   */
  callout?: boolean;

  /**
   * 是否启用折叠列表扩展 (ToggleList)。
   * @default true
   */
  toggle?: boolean;

  /**
   * 是否启用划词浮动气泡菜单。
   * @default true
   */
  bubbleMenu?: boolean;

  /**
   * 是否启用表格浮动气泡菜单。
   * @default true
   */
  tableMenu?: boolean;

  /**
   * 是否展示底部状态栏。
   * @default false
   */
  showStatusBar?: boolean;

  /**
   * 预设画布最大宽度，用于知识库流式排版（如 '860px'）。
   * @default '860px'
   */
  maxWidth?: string;

  /**
   * 编辑容器最小高度。
   * @default '400px'
   */
  minHeight?: string;

  /**
   * 编辑容器最大高度。
   */
  maxHeight?: string;
}

/**
 * Agent AI 智能辅助创作预设配置。
 */
export interface AgentEditorProps extends EditorBaseProps {
  /**
   * AI 流式通信 SPI 处理函数。缺省时使用框架内置打字机延迟仿真器 defaultMockAiStreamHandler。
   */
  aiStreamHandler?: AiStreamHandler;

  /**
   * 是否启用划选选区 AI 气泡菜单。
   * @default true
   */
  aiBubbleMenu?: boolean;

  /**
   * 是否启用空白行沉浸式 AI 输入条。
   * @default true
   */
  aiPromptBar?: boolean;

  /**
   * 生成完毕后是否展示行内 Diff 审阅对比卡片。
   * @default true
   */
  showDiff?: boolean;

  /**
   * 自定义快捷 AI 意图动作集合。
   */
  aiActions?: AiPromptAction[];

  /**
   * 是否展示原生轻量工具栏。
   * @default true
   */
  showToolbar?: boolean;

  /**
   * 是否展示底部状态栏。
   * @default true
   */
  showStatusBar?: boolean;
}

/**
 * <AtengAiBubbleMenu /> 选区 AI 快捷气泡组件入参 Props 接口。
 */
export interface AtengAiBubbleMenuProps {
  editor: Editor | null;
  disabled?: boolean;
  actions?: AiPromptAction[];
}

/**
 * <AtengAiPromptBar /> 空白行沉浸式 AI 输入条组件入参 Props 接口。
 */
export interface AtengAiPromptBarProps {
  editor: Editor | null;
  disabled?: boolean;
  isStreaming?: boolean;
}

export type { FullHtmlOptions };
export type * from './docx';
