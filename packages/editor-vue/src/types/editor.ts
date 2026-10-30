/**
 * @atengk/editor-vue 核心引擎与扩展契约定义。
 *
 * 遵循四层洋葱拓扑与零裸 any 契约，规范输出格式、无头 Hook 选项与上传 SPI 契约。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { MaybeRefOrGetter } from 'vue';
import type { AnyExtension } from '@tiptap/core';
import type { Editor } from '@tiptap/vue-3';
import type { Transaction } from '@tiptap/pm/state';

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
  content?: MaybeRefOrGetter<string | Record<string, unknown> | undefined>;

  /**
   * 空状态占位提示文案，默认“请输入正文内容...”。
   */
  placeholder?: MaybeRefOrGetter<string | undefined>;

  /**
   * 是否允许编辑，默认 true。
   */
  editable?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否自动获取焦点。
   */
  autofocus?: MaybeRefOrGetter<boolean | 'start' | 'end' | 'all' | number | undefined>;

  /**
   * 额外追加的第三方或自定义 TipTap 扩展集合。
   */
  extensions?: AnyExtension[];

  /**
   * 纯文本字符数硬限制上限。达到上限时通过 ProseMirror 事务拦截输入与粘贴。
   */
  maxLength?: MaybeRefOrGetter<number | undefined>;

  /**
   * 是否启用重点高亮卡片扩展 (CalloutBlock)，默认 true。
   */
  callout?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否启用折叠列表扩展 (ToggleList)，默认 true。
   */
  toggle?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否启用 AI 流式生成状态机与装饰器扩展 (AiStreamingExtension)，默认 false。
   */
  aiStreaming?: MaybeRefOrGetter<boolean | undefined>;

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
   * 编辑器初始化完成就绪钩子回调。
   */
  onCreate?: (props: { editor: Editor }) => void;

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
 * 块级斜杠命令物料项契约。
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
   * 搜索关键字集合。
   */
  keywords?: string[];

  /**
   * 物料分类（基础排版、列表、媒体、表格等）。
   */
  group?: string;

  /**
   * 执行动作函数。
   */
  action: (editor: Editor) => void;
}

// 级联重导出组件层强类型契约，保持向后兼容性
export * from './components';
