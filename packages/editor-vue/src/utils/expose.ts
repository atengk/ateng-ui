/**
 * @atengk/editor-vue 编辑器门面代理与 Expose 组装工具。
 *
 * 遵循无状态与单一职责，为预设包装组件（如 Simple、Notion-like、Agent）
 * 提供针对底层 AtengEditor 实例的受管门面委托代理，消除逐行单纯转发的 Middle Man 坏味道。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed, type Ref, type ShallowRef, type ComputedRef } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { AtengEditorExpose, FullHtmlOptions } from '../types';

/**
 * 底层编辑器实例的目标类型契约（兼顾 Vue 组件 Ref 解包后与原生 Expose 两种形态）。
 */
export type EditorExposeTarget = object;

export interface CreateEditorExposeOptions {
  /**
   * 底层受管的 Editor 实例引用（可选，缺省时自动通过 target.editor 动态计算）。
   */
  editor?: ShallowRef<Editor | null> | ComputedRef<Editor | null>;

  /**
   * 是否为空的计算属性（可选，缺省时自动通过 target.isEmpty 动态计算）。
   */
  isEmpty?: ComputedRef<boolean>;

  /**
   * 是否全屏的响应式引用（可选，缺省时自动通过 target.isFullscreen 动态计算）。
   */
  isFullscreen?: ShallowRef<boolean> | ComputedRef<boolean>;

  /**
   * 允许自定义重写或扩展的门面属性或方法。
   */
  overrides?: Partial<AtengEditorExpose>;
}

/**
 * 组装并返回符合 AtengEditorExpose 强类型契约的代理门面对象。
 *
 * @param getTarget 获取底层 AtengEditor Expose 实例的引用或 getter 函数
 * @param options 可选的核心响应式状态及扩展重写项
 * @returns 完整的 AtengEditorExpose 契约对象
 */
export function createEditorExpose(
  getTarget: Ref<EditorExposeTarget | null> | (() => EditorExposeTarget | null | undefined),
  options: CreateEditorExposeOptions = {},
): AtengEditorExpose {
  const resolveTarget = (): Record<string, unknown> | null => {
    const raw = typeof getTarget === 'function' ? getTarget() : getTarget.value;
    return (raw as Record<string, unknown>) ?? null;
  };

  const dynamicEditor =
    options.editor ??
    computed<Editor | null>(() => {
      const target = resolveTarget();
      if (!target) return null;
      const ed = target['editor'];
      if (ed && typeof ed === 'object' && 'value' in ed) {
        return (ed as { value: Editor | null }).value;
      }
      return (ed as Editor | null) ?? null;
    });

  const dynamicIsEmpty =
    options.isEmpty ??
    computed<boolean>(() => {
      const target = resolveTarget();
      if (!target) return true;
      const val = target['isEmpty'];
      if (val && typeof val === 'object' && 'value' in val) {
        return Boolean((val as { value: boolean }).value);
      }
      return typeof val === 'boolean' ? val : true;
    });

  const dynamicIsFullscreen =
    options.isFullscreen ??
    computed<boolean>(() => {
      const target = resolveTarget();
      if (!target) return false;
      const val = target['isFullscreen'];
      if (val && typeof val === 'object' && 'value' in val) {
        return Boolean((val as { value: boolean }).value);
      }
      return typeof val === 'boolean' ? val : false;
    });

  const callMethod = <T>(method: string, defaultReturn: T, ...args: unknown[]): T => {
    const target = resolveTarget();
    const fn = target?.[method];
    if (typeof fn === 'function') {
      return (fn as (...a: unknown[]) => T)(...args);
    }
    return defaultReturn;
  };

  const exposeObject: AtengEditorExpose = {
    editor: dynamicEditor,
    isEmpty: dynamicIsEmpty,
    isFullscreen: dynamicIsFullscreen,
    focus: (...args) => callMethod('focus', undefined, ...args),
    blur: () => callMethod('blur', undefined),
    clearContent: (...args) => callMethod('clearContent', undefined, ...args),
    setContent: (...args) => callMethod('setContent', undefined, ...args),
    uploadImage: (...args) => callMethod('uploadImage', undefined, ...args),
    getHTML: () => callMethod('getHTML', ''),
    getFullHTML: (opts?: FullHtmlOptions) => callMethod('getFullHTML', '', opts),
    getJSON: () => callMethod('getJSON', {}),
    getMarkdown: () => callMethod('getMarkdown', ''),
    getText: () => callMethod('getText', ''),
    toggleFullscreen: () => callMethod('toggleFullscreen', undefined),
    getCharacters: () => callMethod('getCharacters', 0),
    getWords: () => callMethod('getWords', 0),
    getParagraphs: () => callMethod('getParagraphs', 0),
    insertTable: (...args) => callMethod('insertTable', undefined, ...args),
    addColumnBefore: () => callMethod('addColumnBefore', undefined),
    addColumnAfter: () => callMethod('addColumnAfter', undefined),
    deleteColumn: () => callMethod('deleteColumn', undefined),
    addRowBefore: () => callMethod('addRowBefore', undefined),
    addRowAfter: () => callMethod('addRowAfter', undefined),
    deleteRow: () => callMethod('deleteRow', undefined),
    mergeCells: () => callMethod('mergeCells', undefined),
    splitCell: () => callMethod('splitCell', undefined),
    toggleHeaderRow: () => callMethod('toggleHeaderRow', undefined),
    deleteTable: () => callMethod('deleteTable', undefined),
    clearTable: () => callMethod('clearTable', false),
    exportDocx: (...args) => callMethod('exportDocx', Promise.resolve(new Blob()), ...args),
    ...(options.overrides ?? {}),
  };

  return exposeObject;
}
