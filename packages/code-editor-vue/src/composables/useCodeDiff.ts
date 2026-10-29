/**
 * useCodeDiff 无头代码差异对比状态机 Hook。
 *
 * 依据 ADR-0035 与工单 #182：
 * 1. 原生 DiffEditor 与双 Model 强制使用 shallowRef 与 markRaw 封装，杜绝响应式 Proxy 劫持；
 * 2. 支持双栏并排 (split) 与单栏行内 (inline) 双模无损热切换；
 * 3. 内置差异导航器（goToPreviousDiff / goToNextDiff）与增删行数统计 (+N / -M)；
 * 4. 0x0 视口几何挂起与可见时自动触发 layout 自愈机制；
 * 5. 确定性生命周期治理，在 onScopeDispose 或 onUnmounted 中自动释放全部资源与观察器。
 *
 * @author Ateng
 * @since 2026-10-30
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
import type { UseCodeDiffOptions, DiffMode, DiffStats } from '../types';
import { setupMonacoWorkers } from '../workers';
import { computeDiffStats } from '../diff/stats';

export interface UseCodeDiffReturn {
  /** Monaco DiffEditor 原生实例 (shallowRef) */
  diffEditor: ShallowRef<monaco.editor.IStandaloneDiffEditor | null>;
  /** 原始侧 TextModel 实例 (shallowRef) */
  originalModel: ShallowRef<monaco.editor.ITextModel | null>;
  /** 修改侧 TextModel 实例 (shallowRef) */
  modifiedModel: ShallowRef<monaco.editor.ITextModel | null>;
  /** 当前 Diff 差异统计数据 (shallowRef) */
  diffStats: ShallowRef<DiffStats>;
  /** 当前对比视图模式 (shallowRef) */
  diffMode: ShallowRef<DiffMode>;
  /** 是否已初始化就绪 */
  isReady: ShallowRef<boolean>;
  /** 当前视口是否处于 0x0 几何挂起状态 */
  isSuspended: ShallowRef<boolean>;
  /** 手动初始化 */
  init: () => void;
  /** 重新计算并自适应布局尺寸 */
  layout: () => void;
  /** 手动触发视口自愈布局（从 0x0 恢复可见时安全重算） */
  healLayout: () => void;
  /** 聚焦当前编辑器 */
  focus: () => void;
  /** 获取原始侧代码内容 */
  getOriginalValue: () => string;
  /** 设置原始侧代码内容 */
  setOriginalValue: (value: string) => void;
  /** 获取修改侧代码内容 */
  getModifiedValue: () => string;
  /** 设置修改侧代码内容 */
  setModifiedValue: (value: string) => void;
  /** 动态切换对比视图模式 ('split' | 'inline') */
  setDiffMode: (mode: DiffMode) => void;
  /** 跳转至上一处差异 */
  goToPreviousDiff: () => void;
  /** 跳转至下一处差异 */
  goToNextDiff: () => void;
  /** 销毁当前实例与监听 */
  dispose: () => void;
}

/**
 * 创建并管理 Monaco DiffEditor 实例的无头状态机。
 *
 * @param containerRef 容器 DOM 元素引用
 * @param options 配置选项
 */
export function useCodeDiff(
  containerRef: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: UseCodeDiffOptions = {},
): UseCodeDiffReturn {
  const diffEditor = shallowRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const originalModel = shallowRef<monaco.editor.ITextModel | null>(null);
  const modifiedModel = shallowRef<monaco.editor.ITextModel | null>(null);
  const diffStats = shallowRef<DiffStats>({ additions: 0, deletions: 0, changesCount: 0 });
  const diffMode = shallowRef<DiffMode>(options.diffMode ?? 'split');
  const isReady = shallowRef<boolean>(false);
  const isSuspended = shallowRef<boolean>(false);

  const autoLayoutHealing = options.autoLayoutHealing ?? true;

  let diffUpdateListener: monaco.IDisposable | null = null;
  let originalChangeListener: monaco.IDisposable | null = null;
  let modifiedChangeListener: monaco.IDisposable | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let layoutHealingTimer: ReturnType<typeof setTimeout> | null = null;

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

  // 重新计算布局
  const layout = (): void => {
    if (!diffEditor.value) return;
    const suspended = checkViewportSuspension();
    if (!suspended) {
      diffEditor.value.layout();
    }
  };

  // 视口自愈布局
  const healLayout = (): void => {
    if (!diffEditor.value) return;
    const suspended = checkViewportSuspension();
    if (suspended) {
      return;
    }
    if (layoutHealingTimer) {
      clearTimeout(layoutHealingTimer);
    }
    layoutHealingTimer = setTimeout(() => {
      if (diffEditor.value && !isSuspended.value) {
        diffEditor.value.layout();
      }
    }, 16);
  };

  // 聚焦修改侧编辑器
  const focus = (): void => {
    if (diffEditor.value) {
      diffEditor.value.getModifiedEditor()?.focus();
    }
  };

  // 获取原始侧文本
  const getOriginalValue = (): string => {
    return originalModel.value ? originalModel.value.getValue() : '';
  };

  // 设置原始侧文本
  const setOriginalValue = (value: string): void => {
    if (originalModel.value) {
      originalModel.value.setValue(value);
    }
  };

  // 获取修改侧文本
  const getModifiedValue = (): string => {
    return modifiedModel.value ? modifiedModel.value.getValue() : '';
  };

  // 设置修改侧文本
  const setModifiedValue = (value: string): void => {
    if (modifiedModel.value) {
      modifiedModel.value.setValue(value);
    }
  };

  // 切换对比模式
  const setDiffMode = (mode: DiffMode): void => {
    diffMode.value = mode;
    if (diffEditor.value) {
      diffEditor.value.updateOptions({
        renderSideBySide: mode === 'split',
      });
    }
  };

  // 跳转至上一处差异
  const goToPreviousDiff = (): void => {
    if (!diffEditor.value) return;
    try {
      diffEditor.value.goToDiff('previous');
    } catch {
      // 容错保护
    }
  };

  // 跳转至下一处差异
  const goToNextDiff = (): void => {
    if (!diffEditor.value) return;
    try {
      diffEditor.value.goToDiff('next');
    } catch {
      // 容错保护
    }
  };

  // 刷新计算 Diff 差异统计
  const updateDiffStats = (): void => {
    if (!diffEditor.value) return;
    const lineChanges = diffEditor.value.getLineChanges();
    const stats = computeDiffStats(lineChanges);
    diffStats.value = stats;
    options.onDiffUpdated?.(stats);
  };

  // 彻底销毁释放
  const dispose = (): void => {
    if (layoutHealingTimer) {
      clearTimeout(layoutHealingTimer);
      layoutHealingTimer = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (diffUpdateListener) {
      diffUpdateListener.dispose();
      diffUpdateListener = null;
    }
    if (originalChangeListener) {
      originalChangeListener.dispose();
      originalChangeListener = null;
    }
    if (modifiedChangeListener) {
      modifiedChangeListener.dispose();
      modifiedChangeListener = null;
    }
    if (diffEditor.value) {
      try {
        diffEditor.value.setModel(null);
      } catch {
        // safe fallback
      }
      diffEditor.value.dispose();
      diffEditor.value = null;
    }
    if (originalModel.value) {
      originalModel.value.dispose();
      originalModel.value = null;
    }
    if (modifiedModel.value) {
      modifiedModel.value.dispose();
      modifiedModel.value = null;
    }
    isReady.value = false;
    isSuspended.value = false;
  };

  // 初始化 Diff 编辑器实例
  const init = (): void => {
    const el = toValue(containerRef);
    if (!el || diffEditor.value) return;

    // 确保 Worker 基础环境就绪
    setupMonacoWorkers(options.workerOptions);

    const initialLanguage = options.language ?? 'typescript';
    const initialOriginal = options.original ?? '';
    const initialModified = options.modified ?? '';
    const initialTheme = options.theme === 'auto' ? 'vs' : (options.theme ?? 'vs');

    // 探测初始视口状态
    checkViewportSuspension();

    // 1. 创建独立 TextModel 并使用 markRaw 封装
    const origModel = markRaw(monaco.editor.createModel(initialOriginal, initialLanguage));
    const modModel = markRaw(monaco.editor.createModel(initialModified, initialLanguage));
    if (options.tabSize) {
      origModel.updateOptions({ tabSize: options.tabSize });
      modModel.updateOptions({ tabSize: options.tabSize });
    }
    originalModel.value = origModel;
    modifiedModel.value = modModel;

    // 2. 构造 Diff 配置选项
    const editorOptions: monaco.editor.IStandaloneDiffEditorConstructionOptions = {
      renderSideBySide: diffMode.value === 'split',
      readOnly: options.readOnly ?? false,
      originalEditable: !(options.originalReadOnly ?? true),
      fontSize: options.fontSize ?? 14,
      wordWrap: options.wordWrap ?? 'on',
      lineNumbers: options.lineNumbers ?? 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      theme: initialTheme,
      ...options.options,
    };

    // 3. 创建 DiffEditor 实例并使用 markRaw 封装
    const createdDiffEditor = markRaw(monaco.editor.createDiffEditor(el, editorOptions));
    createdDiffEditor.setModel({
      original: origModel,
      modified: modModel,
    });
    diffEditor.value = createdDiffEditor;

    // 4. 监听 Diff 计算更新事件
    diffUpdateListener = createdDiffEditor.onDidUpdateDiff(() => {
      updateDiffStats();
    });

    // 初始触发一次计算
    updateDiffStats();

    // 5. 监听双轨内容变更
    originalChangeListener = origModel.onDidChangeContent(e => {
      const val = origModel.getValue();
      options.onOriginalChange?.(val, e);
    });

    modifiedChangeListener = modModel.onDidChangeContent(e => {
      const val = modModel.getValue();
      options.onModifiedChange?.(val, e);
    });

    // 6. 注册 ResizeObserver 视口自愈监听
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
    init();
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      dispose();
    });
  }

  return {
    diffEditor,
    originalModel,
    modifiedModel,
    diffStats,
    diffMode,
    isReady,
    isSuspended,
    init,
    layout,
    healLayout,
    focus,
    getOriginalValue,
    setOriginalValue,
    getModifiedValue,
    setModifiedValue,
    setDiffMode,
    goToPreviousDiff,
    goToNextDiff,
    dispose,
  };
}

/**
 * useCodeDiff 的语义别名。
 */
export const useCodeDiffEditor = useCodeDiff;
