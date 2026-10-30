/**
 * @atengk/editor-vue 核心强类型契约定义。
 *
 * 遵循零裸 any 与强类型闭环防线，规范表现容器 Props、Emits 与无头 Hook Options。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { ComputedRef, ShallowRef } from 'vue';
import type { AnyExtension, Editor as CoreEditor } from '@tiptap/core';
import type { Editor } from '@tiptap/vue-3';
import type { EditorView } from '@tiptap/pm/view';
import type { EditorState, Transaction } from '@tiptap/pm/state';

/**
 * 富文本编辑器双向同步输出格式。
 */
export type EditorOutputFormat = 'html' | 'markdown' | 'json';

/**
 * 媒体资产上传拦截器返回结果类型。
 */
export type UploadHandlerResult = string | { url: string; alt?: string };

/**
 * 媒体资产上传拦截器 SPI 契约。
 */
export type UploadHandler = (file: File) => Promise<UploadHandlerResult>;

/**
 * 图片资产上传成功载荷。
 */
export interface UploadSuccessPayload {
  url: string;
  alt?: string;
  file: File;
}

/**
 * useEditor 无头状态机入参选项配置。
 */
export interface UseEditorOptions {
  /**
   * 初始内容（支持 HTML 字符串、Markdown 文本或 ProseMirror JSON 树）。
   */
  content?: string | Record<string, unknown>;

  /**
   * 空状态占位提示文案，默认“请输入正文内容...”。
   */
  placeholder?: string;

  /**
   * 是否允许编辑，默认 true。
   */
  editable?: boolean;

  /**
   * 是否自动获取焦点。
   */
  autofocus?: boolean | 'start' | 'end' | 'all' | number;

  /**
   * 额外追加的第三方或自定义 TipTap 扩展集合。
   */
  extensions?: AnyExtension[];

  /**
   * 纯文本字符数硬限制上限。达到上限时通过 ProseMirror 事务拦截输入与粘贴。
   */
  maxLength?: number;

  /**
   * 媒体资产上传拦截器 SPI 处理函数。
   */
  uploadHandler?: UploadHandler;

  /**
   * 媒体资产上传成功回调。
   */
  onUploadSuccess?: (payload: UploadSuccessPayload) => void;

  /**
   * 媒体资产上传失败异常回调。
   */
  onUploadError?: (error: Error, file: File) => void;

  /**
   * 内容更新钩子回调。
   */
  onUpdate?: (props: { editor: Editor; transaction: Transaction }) => void;

  /**
   * 编辑器获得焦点事件回调。
   */
  onFocus?: () => void;

  /**
   * 编辑器失去焦点事件回调。
   */
  onBlur?: () => void;

  /**
   * 选区或光标变更事件回调。
   */
  onSelectionUpdate?: () => void;
}

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
   * 是否自动获得焦点。
   */
  autofocus?: boolean | 'start' | 'end' | 'all' | number;

  /**
   * 自定义扩展集合注入。
   */
  extensions?: AnyExtension[];

  /**
   * 是否展示原生操作工具栏，默认 true。
   */
  showToolbar?: boolean;

  /**
   * 工具栏是否吸顶粘性停靠，默认 false。
   */
  stickyToolbar?: boolean;

  /**
   * 是否展示表格操作动态上下文气泡浮层，默认 true。
   */
  showTableMenu?: boolean;

  /**
   * 是否展示超链接操作动态上下文气泡浮层，默认 true。
   */
  showLinkMenu?: boolean;

  /**
   * 是否展示图片对齐与删除动态上下文气泡浮层，默认 true。
   */
  showImageMenu?: boolean;

  /**
   * 是否展示划选文本高频排版气泡浮层，默认 true。
   */
  showBubbleMenu?: boolean;

  /**
   * 是否展示块级斜杠命令快速唤起面板，默认 true。
   */
  showSlashCommand?: boolean;

  /**
   * 纯文本字符数硬限制上限。达到上限时通过 ProseMirror 事务拦截输入与粘贴。
   */
  maxLength?: number;

  /**
   * 是否展示吸底状态栏，默认 true。
   */
  showStatusBar?: boolean;

  /**
   * 是否展示状态栏词数统计，默认 true。
   */
  showWordCount?: boolean;

  /**
   * 是否展示状态栏段落数统计，默认 true。
   */
  showParagraphCount?: boolean;

  /**
   * 媒体资产上传拦截器 SPI 处理函数。
   * 若未提供，默认自动降级为安全 Base64 Data URL 内联。
   */
  uploadHandler?: UploadHandler;

  /**
   * 容器固定高度（支持数字 px 或 CSS 字符串如 '500px'）。
   */
  height?: string | number;

  /**
   * 容器最小高度。
   */
  minHeight?: string | number;

  /**
   * 容器最大高度。
   */
  maxHeight?: string | number;
}

/**
 * <AtengEditor /> 表现容器对外 Emits 事件声明接口。
 */
export interface AtengEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'update:markdown', value: string): void;
  (e: 'update:json', value: Record<string, unknown>): void;
  (e: 'change', value: string): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
  (e: 'uploadSuccess', payload: UploadSuccessPayload): void;
  (e: 'uploadError', error: Error, file: File): void;
  (e: 'update:fullscreen', isFullscreen: boolean): void;
  (e: 'themeChange', isDark: boolean): void;
}

/**
 * <AtengStatusBar /> 吸底状态栏组件入参 Props 接口。
 */
export interface AtengStatusBarProps {
  /**
   * TipTap Editor 实例。
   */
  editor: Editor | null;

  /**
   * 纯文本字符数上限限制。
   */
  maxLength?: number;

  /**
   * 是否展示词数统计，默认 true。
   */
  showWordCount?: boolean;

  /**
   * 是否展示段落数统计，默认 true。
   */
  showParagraphCount?: boolean;
}

/**
 * <AtengTableBubbleMenu /> 表格动态气泡菜单组件入参 Props 接口。
 */
export interface AtengTableBubbleMenuProps {
  /**
   * TipTap Editor 实例。
   */
  editor: Editor | null;

  /**
   * 是否禁用操作。
   */
  disabled?: boolean;

  /**
   * 自定义 Tippy.js 配置选项。
   */
  tippyOptions?: Record<string, unknown>;

  /**
   * 自定义浮层显示判定函数。
   */
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
 * <AtengImageBubbleMenu /> 图片动态气泡菜单组件入参 Props 接口。
 */
export interface AtengImageBubbleMenuProps {
  /**
   * TipTap Editor 实例。
   */
  editor: Editor | null;

  /**
   * 是否禁用操作。
   */
  disabled?: boolean;

  /**
   * 自定义 Tippy.js 配置选项。
   */
  tippyOptions?: Record<string, unknown>;

  /**
   * 自定义浮层显示判定函数。
   */
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
 * <AtengLinkBubbleMenu /> 超链接动态气泡菜单组件入参 Props 接口。
 */
export interface AtengLinkBubbleMenuProps {
  /**
   * TipTap Editor 实例。
   */
  editor: Editor | null;

  /**
   * 是否禁用操作。
   */
  disabled?: boolean;

  /**
   * 自定义 Tippy.js 配置选项。
   */
  tippyOptions?: Record<string, unknown>;

  /**
   * 自定义浮层显示判定函数。
   */
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
 * 块级斜杠命令面板物料项定义。
 */
export interface SlashCommandItem {
  /**
   * 物料唯一标识。
   */
  id: string;

  /**
   * 物料中文标题。
   */
  title: string;

  /**
   * 物料用途中文简述。
   */
  description: string;

  /**
   * 物料所属逻辑分组（如“基础块”、“列表”、“高级”等）。
   */
  group?: string;

  /**
   * 预留图标名称或 SVG 路径。
   */
  icon?: string;

  /**
   * 点击或回车选定该物料时执行的编辑器指令。
   */
  action: (editor: CoreEditor) => void;
}

/**
 * <AtengBubbleMenu /> 划选文本高频排版气泡菜单组件入参 Props 接口。
 */
export interface AtengBubbleMenuProps {
  /**
   * TipTap Editor 实例。
   */
  editor: Editor | null;

  /**
   * 是否禁用操作。
   */
  disabled?: boolean;

  /**
   * 自定义 Tippy.js 配置选项。
   */
  tippyOptions?: Record<string, unknown>;

  /**
   * 自定义浮层显示判定函数。
   */
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
  /**
   * TipTap Editor 实例。
   */
  editor: Editor | null;

  /**
   * 是否禁用操作。
   */
  disabled?: boolean;

  /**
   * 是否在空行时光标闪烁直接呼出，默认 true。若为 false 则仅在输入 '/' 时呼出。
   */
  triggerOnEmpty?: boolean;

  /**
   * 自定义物料清单列表。若未提供则使用内置标准全套物料。
   */
  items?: SlashCommandItem[];

  /**
   * 自定义 Tippy.js 配置选项。
   */
  tippyOptions?: Record<string, unknown>;

  /**
   * 自定义浮层显示判定函数。
   */
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
}
