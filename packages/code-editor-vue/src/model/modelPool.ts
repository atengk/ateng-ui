/**
 * ModelPoolManager 受管 Monaco TextModel 模型池与视图状态管理器。
 *
 * 依据 ADR-0035 与工单 #183：
 * 1. 纳管同一底座 Canvas 下的多文件 TextModel 实例；
 * 2. 独立维护各文件视图状态（滚动条位置与多光标选区）；
 * 3. 确定性生命周期治理，在编辑器卸载或销毁时彻底释放池内全部 TextModel，杜绝幽灵内存驻留。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { markRaw } from 'vue';
import * as monaco from 'monaco-editor';
import type { CodeLanguage } from '../types';

export interface ModelPoolManager {
  /** 创建并向模型池注册新的 TextModel */
  createModel: (
    value: string,
    language?: CodeLanguage,
    uri?: string | monaco.Uri,
  ) => monaco.editor.ITextModel;
  /** 根据 TextModel 实例或 URI 字符串解析模型 */
  resolveModel: (modelOrUri: monaco.editor.ITextModel | string) => monaco.editor.ITextModel | null;
  /** 注册活动模型至模型池 */
  registerModel: (model: monaco.editor.ITextModel) => void;
  /** 保存指定模型或当前活动模型的视图状态（光标与滚动位置） */
  saveViewState: (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri?: monaco.editor.ITextModel | string,
  ) => monaco.editor.ICodeEditorViewState | null;
  /** 恢复指定模型的视图状态 */
  restoreViewState: (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri: monaco.editor.ITextModel | string,
    state?: monaco.editor.ICodeEditorViewState | null,
  ) => void;
  /** 切换模型，平滑持久化旧模型状态并还原新模型独立状态 */
  switchModel: (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri: monaco.editor.ITextModel | string,
  ) => monaco.editor.ITextModel | null;
  /** 销毁指定模型 */
  disposeModel: (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri: monaco.editor.ITextModel | string,
  ) => boolean;
  /** 获取模型池中所有活跃模型 */
  getModels: () => monaco.editor.ITextModel[];
  /** 彻底销毁模型池中所有模型并清空状态缓存 */
  disposeAll: () => void;
}

/**
 * 创建受管的 Monaco TextModel 模型池管理器。
 *
 * @param defaultLanguageGetter 获取默认编程语言的 Getter
 */
export function createModelPoolManager(
  defaultLanguageGetter: () => CodeLanguage,
): ModelPoolManager {
  const modelPool = new Map<string, monaco.editor.ITextModel>();
  const viewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>();
  const selectionStates = new Map<string, monaco.Selection[] | null>();

  const resolveModel = (
    modelOrUri: monaco.editor.ITextModel | string,
  ): monaco.editor.ITextModel | null => {
    if (typeof modelOrUri === 'string') {
      const parsedUri = monaco.Uri.parse(modelOrUri);
      const parsedStr = parsedUri.toString();
      const existing = modelPool.get(parsedStr) ?? monaco.editor.getModel(parsedUri);
      if (existing) {
        return existing;
      }
      for (const [key, m] of modelPool.entries()) {
        if (key === modelOrUri || m.uri.path === modelOrUri) {
          return m;
        }
      }
      return null;
    }
    return modelOrUri;
  };

  const registerModel = (model: monaco.editor.ITextModel): void => {
    modelPool.set(model.uri.toString(), model);
  };

  const createModel = (
    value: string,
    language?: CodeLanguage,
    uri?: string | monaco.Uri,
  ): monaco.editor.ITextModel => {
    const lang = language ?? defaultLanguageGetter();
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

  const saveViewState = (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri?: monaco.editor.ITextModel | string,
  ): monaco.editor.ICodeEditorViewState | null => {
    if (!editor) return null;
    if (
      !modelOrUri ||
      (activeModel && (modelOrUri === activeModel || modelOrUri === activeModel.uri.toString()))
    ) {
      const currentState = editor.saveViewState();
      const currentSelections = editor.getSelections();
      if (activeModel) {
        const uriStr = activeModel.uri.toString();
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

  const restoreViewState = (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri: monaco.editor.ITextModel | string,
    state?: monaco.editor.ICodeEditorViewState | null,
  ): void => {
    const target = resolveModel(modelOrUri);
    if (!target) return;
    const targetUri = target.uri.toString();
    if (state !== undefined) {
      viewStates.set(targetUri, state);
    }
    if (editor && activeModel && activeModel.uri.toString() === targetUri) {
      const resolvedState = state ?? viewStates.get(targetUri);
      if (resolvedState) {
        editor.restoreViewState(resolvedState);
      }
      const savedSelections = selectionStates.get(targetUri);
      if (savedSelections && savedSelections.length > 0) {
        editor.setSelections(savedSelections);
      }
    }
  };

  const switchModel = (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri: monaco.editor.ITextModel | string,
  ): monaco.editor.ITextModel | null => {
    const target = resolveModel(modelOrUri);
    if (!target) return null;
    if (activeModel && activeModel.uri.toString() === target.uri.toString()) {
      return target;
    }

    // 1. 保存前序模型的视图状态 (光标与滚动位置)
    if (editor && activeModel) {
      const currentState = editor.saveViewState();
      const currentSelections = editor.getSelections();
      const prevUri = activeModel.uri.toString();
      viewStates.set(prevUri, currentState);
      selectionStates.set(prevUri, currentSelections);
    }

    // 2. 确保新模型纳管在模型池中
    modelPool.set(target.uri.toString(), target);

    // 3. 切换底层 Editor 绑定的 TextModel
    if (editor) {
      editor.setModel(target);
    }

    // 4. 恢复新模型的独立视图状态与光标选区
    const targetUri = target.uri.toString();
    const savedState = viewStates.get(targetUri);
    const savedSelections = selectionStates.get(targetUri);
    if (editor) {
      if (savedState) {
        editor.restoreViewState(savedState);
      }
      if (savedSelections && savedSelections.length > 0) {
        editor.setSelections(savedSelections);
      }
    }

    return target;
  };

  const disposeModel = (
    editor: monaco.editor.IStandaloneCodeEditor | null,
    activeModel: monaco.editor.ITextModel | null,
    modelOrUri: monaco.editor.ITextModel | string,
  ): boolean => {
    const target = resolveModel(modelOrUri);
    if (!target) return false;
    const uriStr = target.uri.toString();

    // 如果销毁的是当前活动模型，先解绑
    if (activeModel && activeModel.uri.toString() === uriStr) {
      editor?.setModel(null);
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

  const getModels = (): monaco.editor.ITextModel[] => {
    return Array.from(modelPool.values());
  };

  const disposeAll = (): void => {
    modelPool.forEach(m => {
      try {
        m.dispose();
      } catch {
        // 容错处理
      }
    });
    modelPool.clear();
    viewStates.clear();
    selectionStates.clear();
  };

  return {
    createModel,
    resolveModel,
    registerModel,
    saveViewState,
    restoreViewState,
    switchModel,
    disposeModel,
    getModels,
    disposeAll,
  };
}
