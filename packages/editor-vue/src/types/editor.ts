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
}
