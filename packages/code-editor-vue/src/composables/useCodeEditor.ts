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
import { registerCompletionProvider } from '../completion/registry';

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
  /** 在模型池中创建受管 TextModel */
  createModel: (
    value: string,
    language?: import('../types').CodeLanguage,
    uri?: string | monaco.Uri,
  ) => monaco.editor.ITextModel;
  /** 切换当前编辑器绑定的活动 TextModel 并平滑保持视口与光标状态 */
  setModel: (modelOrUri: monaco.editor.ITextModel | string) => void;
  /** 销毁模型池中的指定 TextModel */
  disposeModel: (modelOrUri: monaco.editor.ITextModel | string) => boolean;
  /** 获取当前活动的 TextModel */
  getActiveModel: () => monaco.editor.ITextModel | null;
  /** 获取模型池中所有受管的 TextModel 列表 */
  getModels: () => monaco.editor.ITextModel[];
  /** 保存指定模型或当前活动的视图状态 (光标与滚动位置) */
  saveViewState: (
    modelOrUri?: monaco.editor.ITextModel | string,
  ) => monaco.editor.ICodeEditorViewState | null;
  /** 恢复指定模型的视图状态 */
  restoreViewState: (
    modelOrUri: monaco.editor.ITextModel | string,
    state?: monaco.editor.ICodeEditorViewState | null,
  ) => void;
  /** 销毁当前实例与监听，并彻底注销池内所有 Model */
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

  // 受管模型池与视图状态缓存
  const modelPool = new Map<string, monaco.editor.ITextModel>();
  const viewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>();
  const selectionStates = new Map<string, monaco.Selection[] | null>();

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
      const activeTextModel = model.value;
      if (preserveCursor && prevSelections && prevSelections.length > 0 && activeTextModel) {
        const lineCount = activeTextModel.getLineCount();
        const adjustedSelections = prevSelections.map(sel => {
          const startLine = Math.min(sel.startLineNumber, lineCount);
          const startCol = Math.min(sel.startColumn, activeTextModel.getLineMaxColumn(startLine));
          const endLine = Math.min(sel.endLineNumber, lineCount);
          const endCol = Math.min(sel.endColumn, activeTextModel.getLineMaxColumn(endLine));
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

  // 解析模型引用辅助函数
  const resolveModel = (
    modelOrUri: monaco.editor.ITextModel | string,
  ): monaco.editor.ITextModel | null => {
    if (typeof modelOrUri === 'string') {
      const found = modelPool.get(modelOrUri);
      if (found) return found;
      try {
        const parsedUri = monaco.Uri.parse(modelOrUri);
        return monaco.editor.getModel(parsedUri);
      } catch {
        return null;
      }
    }
    return modelOrUri;
  };

  // 在模型池中创建新的受管 TextModel
  const createModel = (
    value: string,
    language?: import('../types').CodeLanguage,
    uri?: string | monaco.Uri,
  ): monaco.editor.ITextModel => {
    const lang = language ?? options.language ?? 'typescript';
    let targetUri: monaco.Uri | undefined = undefined;
    if (uri) {
      targetUri = typeof uri === 'string' ? monaco.Uri.parse(uri) : uri;
      const existing = monaco.editor.getModel(targetUri);
      if (existing) {
        modelPool.set(existing.uri.toString(), existing);
        return existing;
      }
    }
    const newModel = markRaw(monaco.editor.createModel(value, lang, targetUri));
    modelPool.set(newModel.uri.toString(), newModel);
    return newModel;
  };

  // 保存视图状态
  const saveViewState = (
    modelOrUri?: monaco.editor.ITextModel | string,
  ): monaco.editor.ICodeEditorViewState | null => {
    if (!editor.value) return null;
    if (
      !modelOrUri ||
      (model.value && (modelOrUri === model.value || modelOrUri === model.value.uri.toString()))
    ) {
      const currentState = editor.value.saveViewState();
      const currentSelections = editor.value.getSelections();
      if (model.value) {
        const uriStr = model.value.uri.toString();
        viewStates.set(uriStr, currentState);
        selectionStates.set(uriStr, currentSelections);
      }
      return currentState;
    }
    const target = resolveModel(modelOrUri);
    if (target) {
      return viewStates.get(target.uri.toString()) ?? null;
    }
    return null;
  };

  // 恢复视图状态
  const restoreViewState = (
    modelOrUri: monaco.editor.ITextModel | string,
    state?: monaco.editor.ICodeEditorViewState | null,
  ): void => {
    const target = resolveModel(modelOrUri);
    if (!target) return;
    const targetUri = target.uri.toString();
    if (state !== undefined) {
      viewStates.set(targetUri, state);
    }
    if (editor.value && model.value && model.value.uri.toString() === targetUri) {
      const resolvedState = state ?? viewStates.get(targetUri);
      if (resolvedState) {
        editor.value.restoreViewState(resolvedState);
      }
      const savedSelections = selectionStates.get(targetUri);
      if (savedSelections && savedSelections.length > 0) {
        editor.value.setSelections(savedSelections);
      }
    }
  };

  // 切换活动 TextModel 并保存与恢复视图状态
  const setModel = (modelOrUri: monaco.editor.ITextModel | string): void => {
    const target = resolveModel(modelOrUri);
    if (!target) return;
    if (model.value && model.value.uri.toString() === target.uri.toString()) {
      return;
    }

    // 1. 保存前序模型的视图状态 (光标与滚动位置)
    if (editor.value && model.value) {
      const currentState = editor.value.saveViewState();
      const currentSelections = editor.value.getSelections();
      const prevUri = model.value.uri.toString();
      viewStates.set(prevUri, currentState);
      selectionStates.set(prevUri, currentSelections);
    }

    // 2. 确保新模型纳管在模型池中
    modelPool.set(target.uri.toString(), target);

    // 3. 切换底层 Editor 绑定的 TextModel
    if (editor.value) {
      editor.value.setModel(target);
    }
    model.value = target;

    // 4. 恢复新模型的独立视图状态与光标选区
    const targetUri = target.uri.toString();
    const savedState = viewStates.get(targetUri);
    const savedSelections = selectionStates.get(targetUri);
    if (editor.value) {
      if (savedState) {
        editor.value.restoreViewState(savedState);
      }
      if (savedSelections && savedSelections.length > 0) {
        editor.value.setSelections(savedSelections);
      }
    }

    // 5. 触发大文件阈值安全校验
    checkLargeFile(target.getValue());
  };

  // 销毁模型池中的指定 TextModel
  const disposeModel = (modelOrUri: monaco.editor.ITextModel | string): boolean => {
    const target = resolveModel(modelOrUri);
    if (!target) return false;
    const uriStr = target.uri.toString();

    // 如果销毁的是当前活动模型，先解绑
    if (model.value && model.value.uri.toString() === uriStr) {
      editor.value?.setModel(null);
      model.value = null;
    }

    viewStates.delete(uriStr);
    selectionStates.delete(uriStr);
    modelPool.delete(uriStr);
    try {
      target.dispose();
    } catch {
      // 容错处理
    }
    return true;
  };

  // 获取当前活动模型
  const getActiveModel = (): monaco.editor.ITextModel | null => {
    return model.value;
  };

  // 获取池中所有模型
  const getModels = (): monaco.editor.ITextModel[] => {
    return Array.from(modelPool.values());
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
    // 确定性清理全局 JSON Schema 诊断配置，杜绝跨页全局污染
    if (options.jsonSchema) {
      interface MonacoJsonModule {
        jsonDefaults?: {
          setDiagnosticsOptions: (opts: { validate?: boolean; schemas?: unknown[] }) => void;
        };
      }
      const jsonLang = (monaco.languages as unknown as { json?: MonacoJsonModule }).json;
      if (jsonLang?.jsonDefaults) {
        jsonLang.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          schemas: [],
        });
      }
    }
    viewStates.clear();
    selectionStates.clear();
    modelPool.forEach(m => {
      try {
        m.dispose();
      } catch {
        // 容错处理
      }
    });
    modelPool.clear();
    if (editor.value) {
      try {
        editor.value.setModel(null);
      } catch {
        // 容错处理
      }
      editor.value.dispose();
      editor.value = null;
    }
    model.value = null;
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
    modelPool.set(createdModel.uri.toString(), createdModel);

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
    const providerFn = options.completionProvider;
    if (providerFn) {
      const lang = initialLanguage;
      const disposable = registerCompletionProvider(lang, providerFn);
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
    createModel,
    setModel,
    disposeModel,
    getActiveModel,
    getModels,
    saveViewState,
    restoreViewState,
    dispose,
  };
}
