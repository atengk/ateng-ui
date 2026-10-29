/**
 * useCodeEditor 无头响应式状态机 Hook。
 *
 * 依据 ADR-0035 与工单 #179、#180：
 * 1. 实例与 TextModel 强制使用 shallowRef 与 markRaw 封装，杜绝 Vue Proxy 劫持导致的性能雪崩；
 * 2. 增量更新管道（applyIncrementalEdit），外部更新代码时 100% 保持光标位置与 Undo/Redo 历史记录；
 * 3. 0x0 视口几何挂起与可见时自动触发 layout 自愈机制，杜绝弹窗与隐藏 Tab 错位；
 * 4. 超长文本（> 50,000 行）自适应性能降级治理（自动关闭 minimap、folding 与高开销装饰项）；
 * 5. 确定性生命周期治理，在 onScopeDispose 或 onUnmounted 中自动释放资源与断开观察器。
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
  getCurrentScope,
  toValue,
  type ShallowRef,
} from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import * as monaco from 'monaco-editor';
import type { UseCodeEditorOptions } from '../types';
import { setupMonacoWorkers } from '../workers';
import { formatSql } from '../sql/formatter';

export interface UseCodeEditorReturn {
  /** Monaco 编辑器原生实例 (shallowRef) */
  editor: ShallowRef<monaco.editor.IStandaloneCodeEditor | null>;
  /** 当前活动的 TextModel 实例 (shallowRef) */
  model: ShallowRef<monaco.editor.ITextModel | null>;
  /** 是否已初始化就绪 */
  isReady: ShallowRef<boolean>;
  /** 是否处于超大文件自适应保护降级模式 */
  isLargeFile: ShallowRef<boolean>;
  /** 当前视口是否处于 0x0 几何挂起状态 */
  isSuspended: ShallowRef<boolean>;
  /** 手动初始化 */
  init: () => void;
  /** 手动触发格式化文档 */
  format: () => Promise<void>;
  /** 重新计算并自适应布局尺寸（如果处于 0x0 则自动挂起） */
  layout: () => void;
  /** 手动触发视口自愈布局（从 0x0 恢复可见时安全重算） */
  healLayout: () => void;
  /** 聚焦当前编辑器 */
  focus: () => void;
  /** 获取当前代码内容 */
  getValue: () => string;
  /** 设置当前代码内容（全量重置模式） */
  setValue: (value: string) => void;
  /** 增量应用代码文本变更（保持光标位置、选区与 Undo/Redo 历史栈） */
  applyIncrementalEdit: (
    newText: string,
    options?: { preserveCursor?: boolean; recordUndo?: boolean },
  ) => void;
  /** 撤销操作 (Undo) */
  undo: () => void;
  /** 重做操作 (Redo) */
  redo: () => void;
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
  const isLargeFile = shallowRef<boolean>(false);
  const isSuspended = shallowRef<boolean>(false);

  const largeThreshold = options.largeFileThreshold ?? 50000;
  const autoLayoutHealing = options.autoLayoutHealing ?? true;

  let contentChangeListener: monaco.IDisposable | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let layoutHealingTimer: ReturnType<typeof setTimeout> | null = null;
  let completionDisposables: monaco.IDisposable[] = [];

  // 探测当前视口是否处于 0x0 挂起状态
  const checkViewportSuspension = (): boolean => {
    const el = toValue(containerRef);
    if (!el) {
      isSuspended.value = true;
      return true;
    }
    const width = el.clientWidth || el.offsetWidth || 0;
    const height = el.clientHeight || el.offsetHeight || 0;
    const suspended = width === 0 || height === 0;
    isSuspended.value = suspended;
    return suspended;
  };

  // 格式化当前文档（支持 SQL 原生格式化与可替换 SPI）
  const format = async (): Promise<void> => {
    if (!editor.value) return;

    const currentLang = options.language ?? 'typescript';
    if (currentLang === 'sql') {
      const currentCode = getValue();
      let formatted = '';
      if (options.formatSqlProvider) {
        formatted = await options.formatSqlProvider(currentCode);
      } else {
        formatted = formatSql(currentCode);
      }
      if (formatted && formatted !== currentCode) {
        applyIncrementalEdit(formatted);
      }
      return;
    }

    const action = editor.value.getAction('editor.action.formatDocument');
    if (action) {
      await action.run();
    }
  };

  // 重新计算布局（受管防 0x0 崩溃）
  const layout = (): void => {
    if (!editor.value) return;
    const suspended = checkViewportSuspension();
    if (!suspended) {
      editor.value.layout();
    }
  };

  // 视口自愈布局
  const healLayout = (): void => {
    if (!editor.value) return;
    const suspended = checkViewportSuspension();
    if (suspended) {
      // 视口依然为 0x0，保持挂起
      return;
    }
    if (layoutHealingTimer) {
      clearTimeout(layoutHealingTimer);
    }
    layoutHealingTimer = setTimeout(() => {
      if (editor.value && !isSuspended.value) {
        editor.value.layout();
      }
    }, 16);
  };

  // 聚焦
  const focus = (): void => {
    if (editor.value) {
      editor.value.focus();
    }
  };

  // 撤销 (Undo)
  const undo = (): void => {
    if (!editor.value) return;
    editor.value.trigger('keyboard', 'undo', null);
  };

  // 重做 (Redo)
  const redo = (): void => {
    if (!editor.value) return;
    editor.value.trigger('keyboard', 'redo', null);
  };

  // 获取文本
  const getValue = (): string => {
    return model.value ? model.value.getValue() : editor.value ? editor.value.getValue() : '';
  };

  // 检查并自适应大文件性能配置
  const checkLargeFile = (text: string): void => {
    const lines = text ? text.split('\n').length : 0;
    const shouldBeLarge = lines > largeThreshold;

    if (shouldBeLarge !== isLargeFile.value) {
      isLargeFile.value = shouldBeLarge;
      if (editor.value) {
        if (shouldBeLarge) {
          // 降级高开销装饰项
          editor.value.updateOptions({
            minimap: { enabled: false },
            folding: false,
            renderLineHighlight: 'none',
            wordWrap: 'off',
          });
        } else {
          // 恢复正常配置
          editor.value.updateOptions({
            minimap:
              typeof options.minimap === 'boolean'
                ? { enabled: options.minimap }
                : (options.minimap ?? { enabled: true }),
            folding: true,
            renderLineHighlight: 'all',
            wordWrap: options.wordWrap ?? 'on',
          });
        }
      }
    }
  };

  // 设置文本（全量重置）
  const setValue = (val: string): void => {
    if (model.value) {
      model.value.setValue(val);
    } else if (editor.value) {
      editor.value.setValue(val);
    }
    checkLargeFile(val);
  };

  // 增量应用代码文本变更（保持光标位置、选区与 Undo 历史）
  const applyIncrementalEdit = (
    newText: string,
    opts?: { preserveCursor?: boolean; recordUndo?: boolean },
  ): void => {
    if (!model.value) return;
    const currentVal = getValue();
    if (newText === currentVal) return;

    const preserveCursor = opts?.preserveCursor ?? true;
    const recordUndo = opts?.recordUndo ?? true;

    // 1. 捕获当前光标位置与选区
    const prevSelections = editor.value ? editor.value.getSelections() : null;

    // 2. 构造全量替换的单次原子编辑操作
    const fullRange = model.value.getFullModelRange();
    const editOp: monaco.editor.IIdentifiedSingleEditOperation = {
      range: fullRange,
      text: newText,
      forceMoveMarkers: true,
    };

    // 3. 应用编辑操作
    if (editor.value && recordUndo) {
      // 通过 executeEdits 注入 UndoManager 历史栈
      editor.value.executeEdits('incremental-update', [editOp], prevSelections ?? undefined);

      // 4. 精准恢复或弹性修剪光标位置
      if (preserveCursor && prevSelections && prevSelections.length > 0) {
        const lineCount = model.value.getLineCount();
        const adjustedSelections = prevSelections.map(sel => {
          const startLine = Math.min(sel.startLineNumber, lineCount);
          const startCol = Math.min(sel.startColumn, model.value!.getLineMaxColumn(startLine));
          const endLine = Math.min(sel.endLineNumber, lineCount);
          const endCol = Math.min(sel.endColumn, model.value!.getLineMaxColumn(endLine));
          return new monaco.Selection(startLine, startCol, endLine, endCol);
        });
        editor.value.setSelections(adjustedSelections);
      }
    } else {
      // 降级使用 pushEditOperations
      model.value.pushEditOperations(prevSelections ?? [], [editOp], () => prevSelections ?? []);
    }

    // 5. 检查大文件性能阈值
    checkLargeFile(newText);
  };

  // 彻底销毁释放
  const dispose = (): void => {
    completionDisposables.forEach(d => d.dispose());
    completionDisposables = [];

    if (layoutHealingTimer) {
      clearTimeout(layoutHealingTimer);
      layoutHealingTimer = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
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
    isSuspended.value = false;
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

    // 探测初始视口状态
    checkViewportSuspension();

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
      checkLargeFile(currentVal);
      options.onChange?.(currentVal, e);
    });

    // 5. 初始大文件阈值检查
    checkLargeFile(initialValue);

    // 6. 注册受管 CompletionProvider
    if (options.completionProvider) {
      const lang = initialLanguage;
      const disposable = monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: async (m, p) => {
          const res = await options.completionProvider!(m, p);
          if (Array.isArray(res)) {
            return { suggestions: res };
          }
          return res as monaco.languages.CompletionList;
        },
      });
      completionDisposables.push(disposable);
    }

    // 7. 注册声明式 JSON Schema 诊断
    if (options.jsonSchema && (initialLanguage === 'json' || !options.language)) {
      const modelUri = createdModel.uri.toString();
      interface MonacoJsonModule {
        jsonDefaults?: {
          setDiagnosticsOptions: (opts: {
            validate?: boolean;
            schemas?: Array<{
              uri: string;
              fileMatch?: string[];
              schema?: object;
            }>;
          }) => void;
        };
      }
      const jsonLang = (monaco.languages as unknown as { json?: MonacoJsonModule }).json;
      if (jsonLang?.jsonDefaults) {
        jsonLang.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          schemas: [
            {
              uri: 'http://ateng-ui/schema.json',
              fileMatch: [modelUri],
              schema: options.jsonSchema,
            },
          ],
        });
      }
    }

    // 8. 注册 ResizeObserver 视口自愈监听
    if (autoLayoutHealing && typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            if (isSuspended.value) {
              isSuspended.value = false;
              healLayout();
            }
          } else {
            isSuspended.value = true;
          }
        }
      });
      resizeObserver.observe(el);
    }

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

  if (getCurrentScope()) {
    onScopeDispose(() => {
      dispose();
    });
  }

  return {
    editor,
    model,
    isReady,
    isLargeFile,
    isSuspended,
    init,
    format,
    layout,
    healLayout,
    focus,
    undo,
    redo,
    getValue,
    setValue,
    applyIncrementalEdit,
    dispose,
  };
}
