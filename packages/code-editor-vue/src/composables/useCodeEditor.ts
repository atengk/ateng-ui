/**
 * useCodeEditor 无头响应式状态机 Hook。
 *
 * 依据 ADR-0035：
 * 1. 实例与 TextModel 强制使用 shallowRef 与 markRaw 封装，杜绝 Vue Proxy 劫持导致的性能雪崩；
 * 2. 集中编排创建、销毁、格式化、尺寸调整与事件监听；
 * 3. 确定性生命周期治理，在 onScopeDispose 或 onUnmounted 中自动释放资源。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import {
  shallowRef,
  markRaw,
  onMounted,
  onScopeDispose,
  getCurrentInstance,
  toValue,
  type ShallowRef,
} from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import * as monaco from 'monaco-editor';
import type { UseCodeEditorOptions } from '../types';
import { setupMonacoWorkers } from '../workers';

export interface UseCodeEditorReturn {
  /** Monaco 编辑器原生实例 (shallowRef) */
  editor: ShallowRef<monaco.editor.IStandaloneCodeEditor | null>;
  /** 当前活动的 TextModel 实例 (shallowRef) */
  model: ShallowRef<monaco.editor.ITextModel | null>;
  /** 是否已初始化就绪 */
  isReady: ShallowRef<boolean>;
  /** 手动初始化 */
  init: () => void;
  /** 手动触发格式化文档 */
  format: () => Promise<void>;
  /** 重新计算并自适应布局尺寸 */
  layout: () => void;
  /** 聚焦当前编辑器 */
  focus: () => void;
  /** 获取当前代码内容 */
  getValue: () => string;
  /** 设置当前代码内容 */
  setValue: (value: string) => void;
  /** 销毁当前实例与监听 */
  dispose: () => void;
}

/**
 * 创建并管理 Monaco Editor 实例的无头状态机。
 *
 * @param containerRef 容器 DOM 元素引用
 * @param options 配置选项
 */
export function useCodeEditor(
  containerRef: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: UseCodeEditorOptions = {},
): UseCodeEditorReturn {
  const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const model = shallowRef<monaco.editor.ITextModel | null>(null);
  const isReady = shallowRef<boolean>(false);

  let contentChangeListener: monaco.IDisposable | null = null;

  // 格式化当前文档
  const format = async (): Promise<void> => {
    if (!editor.value) return;
    const action = editor.value.getAction('editor.action.formatDocument');
    if (action) {
      await action.run();
    }
  };

  // 重新计算布局
  const layout = (): void => {
    if (editor.value) {
      editor.value.layout();
    }
  };

  // 聚焦
  const focus = (): void => {
    if (editor.value) {
      editor.value.focus();
    }
  };

  // 获取文本
  const getValue = (): string => {
    return model.value ? model.value.getValue() : editor.value ? editor.value.getValue() : '';
  };

  // 设置文本
  const setValue = (val: string): void => {
    if (model.value) {
      model.value.setValue(val);
    } else if (editor.value) {
      editor.value.setValue(val);
    }
  };

  // 彻底销毁释放
  const dispose = (): void => {
    if (contentChangeListener) {
      contentChangeListener.dispose();
      contentChangeListener = null;
    }
    if (model.value) {
      model.value.dispose();
      model.value = null;
    }
    if (editor.value) {
      editor.value.dispose();
      editor.value = null;
    }
    isReady.value = false;
  };

  // 初始化编辑器实例
  const init = (): void => {
    const el = toValue(containerRef);
    if (!el || editor.value) return;

    // 确保 Worker 基础环境就绪
    setupMonacoWorkers(options.workerOptions);

    const initialLanguage = options.language ?? 'typescript';
    const initialValue = options.value ?? '';
    const initialTheme = options.theme === 'auto' ? 'vs' : (options.theme ?? 'vs');

    // 1. 创建独立 TextModel 并使用 markRaw 封装
    const createdModel = markRaw(monaco.editor.createModel(initialValue, initialLanguage));
    model.value = createdModel;

    // 2. 构造配置项
    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      model: createdModel,
      theme: initialTheme,
      readOnly: options.readOnly ?? false,
      fontSize: options.fontSize ?? 14,
      tabSize: options.tabSize ?? 2,
      wordWrap: options.wordWrap ?? 'on',
      lineNumbers: options.lineNumbers ?? 'on',
      minimap:
        typeof options.minimap === 'boolean'
          ? { enabled: options.minimap }
          : (options.minimap ?? { enabled: true }),
      automaticLayout: true,
      scrollBeyondLastLine: false,
      ...options.options,
    };

    // 3. 创建 Editor 实例并使用 markRaw 封装
    const createdEditor = markRaw(monaco.editor.create(el, editorOptions));
    editor.value = createdEditor;

    // 4. 绑定内容变更事件
    contentChangeListener = createdEditor.onDidChangeModelContent(e => {
      const currentVal = createdEditor.getValue();
      options.onChange?.(currentVal, e);
    });

    isReady.value = true;
  };

  if (getCurrentInstance()) {
    onMounted(() => {
      init();
    });
  } else if (toValue(containerRef)) {
    // 无组件上下文时（如在纯 Hook / 单元测试作用域），如果容器节点已存在则立即自举初始化
    init();
  }

  onScopeDispose(() => {
    dispose();
  });

  return {
    editor,
    model,
    isReady,
    init,
    format,
    layout,
    focus,
    getValue,
    setValue,
    dispose,
  };
}
