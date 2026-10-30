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
  type ShallowRef,
  type ComputedRef,
} from 'vue';
import { Editor } from '@tiptap/vue-3';
import { createDefaultExtensions } from '../extensions/default-extensions';
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

  const extensions = createDefaultExtensions({
    placeholder: options.placeholder,
    extraExtensions: options.extensions,
    uploadHandler: options.uploadHandler,
    onUploadSuccess: options.onUploadSuccess,
    onUploadError: options.onUploadError,
    maxLength: options.maxLength,
  });

  const instance = new Editor({
    content: options.content ?? '',
    extensions,
    editable: options.editable ?? true,
    autofocus: options.autofocus ?? false,
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

  // 严格包装为 markRaw 并存入 shallowRef，彻底杜绝 Vue Proxy 递归代理
  editor.value = markRaw(instance);

  const isEmpty = computed(() => {
    return editor.value ? editor.value.isEmpty : true;
  });

  const getHTML = (): string => {
    return editor.value ? editor.value.getHTML() : '';
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
    if (!editor.value) return 0;
    const storage = editor.value.storage as Record<string, unknown>;
    const charStorage = storage.characterCount as { characters?: () => number } | undefined;
    if (charStorage && typeof charStorage.characters === 'function') {
      return charStorage.characters();
    }
    return editor.value.getText().length;
  };

  const getWords = (): number => {
    if (!editor.value) return 0;
    const storage = editor.value.storage as Record<string, unknown>;
    const charStorage = storage.characterCount as { words?: () => number } | undefined;
    if (charStorage && typeof charStorage.words === 'function') {
      return charStorage.words();
    }
    return 0;
  };

  const getParagraphs = (): number => {
    if (!editor.value) return 0;
    let count = 0;
    editor.value.state.doc.descendants(node => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        count++;
      }
    });
    return count;
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
