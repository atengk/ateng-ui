/**
 * @atengk/editor-vue 无头富文本状态机 Composable。
 *
 * 遵循 Vue 3.5 响应式解耦契约，以 shallowRef 杜绝 Proxy 深度代理劫持，并在销毁钩子中确定性释放 Editor 实例。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import {
  computed,
  markRaw,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type ShallowRef,
  type ComputedRef,
} from 'vue';
import { Editor } from '@tiptap/vue-3';
import { createDefaultExtensions } from '../extensions/default-extensions';
import {
  getEditorCharacters,
  getEditorWords,
  getEditorParagraphs,
  generateFullHtml,
  type FullHtmlOptions,
} from '../utils';
import type { UseEditorOptions } from '../types';

export interface UseEditorReturn {
  /**
   * 底层受管的 TipTap Editor 原生实例（使用 shallowRef 封装）。
   */
  editor: ShallowRef<Editor | null>;

  /**
   * 编辑器是否初始化就绪。
   */
  isReady: ShallowRef<boolean>;

  /**
   * 当前编辑器内容是否为空。
   */
  isEmpty: ComputedRef<boolean>;

  /**
   * 获取当前 HTML 格式内容。
   */
  getHTML: () => string;

  /**
   * 获取完整自洽的离线 HTML 网页文档（包含 <!DOCTYPE html>、<head> 及内联排版样式）。
   */
  getFullHTML: (options?: FullHtmlOptions) => string;

  /**
   * 获取当前 ProseMirror JSON 格式内容。
   */
  getJSON: () => Record<string, unknown>;

  /**
   * 获取当前 Markdown 格式内容。
   */
  getMarkdown: () => string;

  /**
   * 获取当前纯文本内容。
   */
  getText: () => string;

  /**
   * 变更或重设编辑器内容。
   */
  setContent: (content: string | Record<string, unknown>, emitUpdate?: boolean) => void;

  /**
   * 清空编辑器全部内容。
   */
  clearContent: (emitUpdate?: boolean) => void;

  /**
   * 手动聚焦编辑器。
   */
  focus: (position?: 'start' | 'end' | 'all' | number | boolean) => void;

  /**
   * 手动失焦编辑器。
   */
  blur: () => void;

  /**
   * 手动触发图片文件上传并插入当前光标位置。
   */
  uploadImage: (file: File) => void;

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

/**
 * 组装并初始化 TipTap 编辑器无头状态机。
 *
 * @param options 编辑器配置选项
 * @returns 无头状态机实例
 */
export function useEditor(options: UseEditorOptions = {}): UseEditorReturn {
  const editor = shallowRef<Editor | null>(null);
  const isReady = shallowRef(false);

  const initialContent = toValue(options.content) ?? '';
  const initialPlaceholder = toValue(options.placeholder);
  const initialEditable = toValue(options.editable) ?? true;
  const initialAutofocus = toValue(options.autofocus) ?? false;
  const initialMaxLength = toValue(options.maxLength);
  const initialCallout = toValue(options.callout);
  const initialToggle = toValue(options.toggle);
  const initialAiStreaming = toValue(options.aiStreaming);

  const extensions = createDefaultExtensions({
    placeholder: initialPlaceholder,
    extraExtensions: options.extensions,
    uploadHandler: options.uploadHandler,
    onUploadSuccess: options.onUploadSuccess,
    onUploadError: options.onUploadError,
    maxLength: initialMaxLength,
    callout: initialCallout !== false,
    toggle: initialToggle !== false,
    aiStreaming: initialAiStreaming === true,
  });

  const instance = new Editor({
    content: initialContent,
    extensions,
    editable: initialEditable,
    autofocus: initialAutofocus,
    onCreate: () => {
      isReady.value = true;
    },
    onUpdate: ({ transaction }) => {
      if (editor.value) {
        options.onUpdate?.({ editor: editor.value, transaction });
      }
    },
    onFocus: () => {
      options.onFocus?.();
    },
    onBlur: () => {
      options.onBlur?.();
    },
    onSelectionUpdate: () => {
      options.onSelectionUpdate?.();
    },
  });

  // 响应式监听 editable 变化并自动同步底层 Editor 实例
  if (options.editable !== undefined) {
    watch(
      () => toValue(options.editable),
      newEditable => {
        if (editor.value && newEditable !== undefined) {
          editor.value.setEditable(newEditable);
        }
      },
    );
  }

  // 严格包装为 markRaw 并存入 shallowRef，彻底杜绝 Vue Proxy 递归代理
  editor.value = markRaw(instance);

  // 微任务异步调度创建就绪回调，确保外部解构赋值彻底脱离 TDZ 暂存死区
  queueMicrotask(() => {
    if (editor.value) {
      options.onCreate?.({ editor: editor.value });
    }
  });

  const isEmpty = computed(() => {
    return editor.value ? editor.value.isEmpty : true;
  });

  const getHTML = (): string => {
    return editor.value ? editor.value.getHTML() : '';
  };

  const getFullHTML = (opts?: FullHtmlOptions): string => {
    return generateFullHtml(getHTML(), opts);
  };

  const getJSON = (): Record<string, unknown> => {
    return editor.value ? (editor.value.getJSON() as Record<string, unknown>) : {};
  };

  const getMarkdown = (): string => {
    if (!editor.value) return '';
    // 通过 tiptap-markdown 扩展注册的 storage 获取 markdown
    const storage = editor.value.storage as Record<string, unknown>;
    const markdownStorage = storage.markdown as { getMarkdown?: () => string } | undefined;
    if (markdownStorage && typeof markdownStorage.getMarkdown === 'function') {
      return markdownStorage.getMarkdown();
    }
    return '';
  };

  const getText = (): string => {
    return editor.value ? editor.value.getText() : '';
  };

  const getCharacters = (): number => {
    return getEditorCharacters(editor.value);
  };

  const getWords = (): number => {
    return getEditorWords(editor.value);
  };

  const getParagraphs = (): number => {
    return getEditorParagraphs(editor.value);
  };

  const setContent = (content: string | Record<string, unknown>, emitUpdate = false): void => {
    if (!editor.value) return;
    editor.value.commands.setContent(content, emitUpdate);
  };

  const clearContent = (emitUpdate = true): void => {
    if (!editor.value) return;
    editor.value.commands.clearContent(emitUpdate);
  };

  const focus = (position: 'start' | 'end' | 'all' | number | boolean = 'end'): void => {
    if (!editor.value) return;
    editor.value.commands.focus(position);
  };

  const blur = (): void => {
    if (!editor.value) return;
    editor.value.commands.blur();
  };

  const uploadImage = (file: File): void => {
    if (!editor.value) return;
    editor.value.commands.uploadImage(file);
  };

  // 确定性生命周期清理：作用域注销时立即调用 destroy() 释放原生事件与引用
  onScopeDispose(() => {
    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
    }
  });

  return {
    editor,
    isReady,
    isEmpty,
    getHTML,
    getFullHTML,
    getJSON,
    getMarkdown,
    getText,
    setContent,
    clearContent,
    focus,
    blur,
    uploadImage,
    getCharacters,
    getWords,
    getParagraphs,
  };
}
