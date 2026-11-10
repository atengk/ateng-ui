/**
 * 纯无状态电子表格无头状态机 (useSpreadsheet)。
 *
 * 遵循 ADR-0002、ADR-0013、ADR-0035 与 ADR-0049 规范，以非响应式/浅引用持有 Univer 底层实例，
 * 100% 杜绝 Vue 深度 Proxy 代理导致性能崩溃，暴露完备对称命令式 API 与只读状态度量。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import {
  ref,
  readonly,
  onMounted,
  onBeforeUnmount,
  getCurrentScope,
  onScopeDispose,
  getCurrentInstance,
  type Ref,
} from 'vue';
import {
  createUniver,
  LocaleType,
  mergeLocales,
  defaultTheme,
  darkBlueTheme,
  type Univer,
  type FUniver,
  type IWorkbookData,
} from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import type {
  UseSpreadsheetOptions,
  UseSpreadsheetReturn,
  SpreadsheetSnapshot,
  SpreadsheetRecord,
  SpreadsheetColumn,
  SpreadsheetRange,
  SpreadsheetLocale,
} from '../types';
import { SpreadsheetResizeGuard } from '../guards/spreadsheet-resize-guard';

type FWorkbook = ReturnType<FUniver['createWorkbook']>;

export function useSpreadsheet(options: UseSpreadsheetOptions = {}): UseSpreadsheetReturn {
  const containerRef = ref<HTMLElement | null>(options.container ?? null);
  const ready = ref(false);
  const loading = ref(false);
  const activeSheetId = ref<string | null>(null);
  const sheetList = ref<Array<{ id: string; name: string }>>([]);
  const selection = ref<SpreadsheetRange | null>(null);
  const isDirty = ref(false);

  // 原始闭包实例持有，严禁包装入 Vue ref / reactive
  let univerInstance: Univer | null = null;
  let univerAPIInstance: FUniver | null = null;
  let activeWorkbook: FWorkbook | null = null;
  let resizeGuard: SpreadsheetResizeGuard | null = null;
  let currentReadOnly = options.readOnly ?? options.mode === 'readonly';

  /**
   * 映射为 Univer 原生 LocaleType 枚举。
   */
  const resolveLocaleType = (locale?: SpreadsheetLocale): LocaleType => {
    if (locale === 'en-US') return LocaleType.EN_US;
    return LocaleType.ZH_CN;
  };

  /**
   * 初始化 Univer 实例与工作簿。
   */
  const init = (targetEl?: HTMLElement | null): void => {
    const el = targetEl ?? containerRef.value;
    if (!el || univerInstance) return;

    try {
      loading.value = true;
      const localeType = resolveLocaleType(options.locale);

      const { univer, univerAPI } = createUniver({
        locale: localeType,
        locales: {
          [LocaleType.ZH_CN]: mergeLocales(UniverPresetSheetsCoreZhCN),
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
        },
        presets: [
          UniverSheetsCorePreset({
            container: el,
            workerURL: typeof options.worker === 'string' ? options.worker : undefined,
          }),
        ],
      });

      univerInstance = univer;
      univerAPIInstance = univerAPI;

      // 初始化工作簿实例
      activeWorkbook = univerAPI.createWorkbook(
        (options.snapshot as unknown as Partial<IWorkbookData>) ?? {},
      );

      // 提取工作表列表与当前激活表
      syncSheetInfo();

      // 挂载尺寸自愈守卫
      resizeGuard = new SpreadsheetResizeGuard(el, () => {
        resize();
      });

      ready.value = true;
    } catch (err) {
      console.error('Failed to initialize Univer spreadsheet instance:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 同步工作簿的工作表列表与当前激活表。
   */
  const syncSheetInfo = (): void => {
    if (!activeWorkbook) return;

    try {
      const activeSheet = activeWorkbook.getActiveSheet();
      if (activeSheet) {
        activeSheetId.value = activeSheet.getSheetId() ?? null;
      }

      const rawSheets = activeWorkbook.getSheets() ?? [];
      sheetList.value = rawSheets.map(sheet => ({
        id: sheet.getSheetId() ?? '',
        name: sheet.getSheetName() ?? '',
      }));
    } catch {
      // 容错兜底
    }
  };

  /**
   * 获取当前工作簿完整 JSON 快照。
   */
  const getSnapshot = (): SpreadsheetSnapshot | null => {
    if (!activeWorkbook) return null;
    try {
      return activeWorkbook.save() as unknown as SpreadsheetSnapshot;
    } catch {
      return null;
    }
  };

  /**
   * 设置/重载工作簿快照。
   */
  const setSnapshot = (snapshot: SpreadsheetSnapshot): void => {
    if (!univerAPIInstance) return;
    try {
      activeWorkbook = univerAPIInstance.createWorkbook(
        snapshot as unknown as Partial<IWorkbookData>,
      );
      syncSheetInfo();
      isDirty.value = false;
    } catch (err) {
      console.error('Failed to load snapshot:', err);
    }
  };

  /**
   * 获取当前工作表的扁平行记录数组（Ticket 3 深度扩展）。
   */
  const getData = (): SpreadsheetRecord[] => {
    return [];
  };

  /**
   * 设置当前工作表的扁平行记录数组（Ticket 3 深度扩展）。
   */
  const setData = (_records: SpreadsheetRecord[], _columns?: SpreadsheetColumn[]): void => {
    isDirty.value = true;
  };

  /**
   * 导出当前表格为 CSV 文本并触发下载（Ticket 4 深度扩展）。
   */
  const exportCsv = (_filename?: string): void => {
    // 后续由 Ticket 4 实现
  };

  /**
   * 导出当前工作簿快照为 JSON 文件并下载（Ticket 4 深度扩展）。
   */
  const exportJson = (filename = 'spreadsheet.json'): void => {
    const snapshot = getSnapshot();
    if (!snapshot) return;

    try {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export JSON snapshot:', err);
    }
  };

  /**
   * 新增工作表。
   */
  const addSheet = (name?: string): string | null => {
    if (!activeWorkbook) return null;
    try {
      const sheetName = name ?? `Sheet${sheetList.value.length + 1}`;
      const newSheet = activeWorkbook.create?.(sheetName, 100, 26);
      syncSheetInfo();
      return newSheet?.getSheetId?.() ?? null;
    } catch {
      return null;
    }
  };

  /**
   * 删除指定工作表。
   */
  const removeSheet = (sheetId: string): void => {
    if (!activeWorkbook) return;
    try {
      const sheet = activeWorkbook.getSheetBySheetId?.(sheetId);
      if (sheet) {
        activeWorkbook.deleteSheet?.(sheet);
        syncSheetInfo();
      }
    } catch {
      // 容错
    }
  };

  /**
   * 激活指定工作表。
   */
  const activateSheet = (sheetId: string): void => {
    if (!activeWorkbook) return;
    try {
      const sheet = activeWorkbook.getSheetBySheetId?.(sheetId);
      if (sheet) {
        activeWorkbook.setActiveSheet?.(sheet);
        activeSheetId.value = sheetId;
      }
    } catch {
      // 容错
    }
  };

  /**
   * 切换只读状态。
   */
  const setReadOnly = (readOnly: boolean): void => {
    currentReadOnly = readOnly;
  };

  /**
   * 切换主题模式。
   */
  const setTheme = (theme: 'light' | 'dark'): void => {
    if (!univerAPIInstance) return;
    try {
      const themeConfig = theme === 'dark' ? darkBlueTheme : defaultTheme;
      univerAPIInstance.setTheme(themeConfig);
    } catch {
      // 容错
    }
  };

  /**
   * 撤销。
   */
  const undo = (): void => {
    if (currentReadOnly) return;
    try {
      univerAPIInstance?.undo?.();
    } catch {
      // 容错
    }
  };

  /**
   * 重做。
   */
  const redo = (): void => {
    if (currentReadOnly) return;
    try {
      univerAPIInstance?.redo?.();
    } catch {
      // 容错
    }
  };

  /**
   * 清空表格内容。
   */
  const clear = (): void => {
    if (currentReadOnly) return;
    try {
      const activeSheet = activeWorkbook?.getActiveSheet?.();
      (activeSheet as unknown as { clear?: () => void })?.clear?.();
      isDirty.value = false;
    } catch {
      // 容错
    }
  };

  /**
   * 视口几何自愈。
   */
  const resize = (): void => {
    try {
      window.dispatchEvent(new Event('resize'));
    } catch {
      // 容错
    }
  };

  /**
   * 确定性生命周期销毁。
   */
  const destroy = (): void => {
    if (resizeGuard) {
      resizeGuard.disconnect();
      resizeGuard = null;
    }

    if (univerInstance) {
      try {
        univerInstance.dispose();
      } catch (err) {
        console.warn('Error during univer.dispose():', err);
      }
      univerInstance = null;
      univerAPIInstance = null;
      activeWorkbook = null;
    }

    ready.value = false;
    loading.value = false;
    activeSheetId.value = null;
    sheetList.value = [];
    selection.value = null;
    isDirty.value = false;
  };

  // 挂载逻辑
  if (getCurrentInstance()) {
    onMounted(() => {
      if (containerRef.value) {
        init(containerRef.value);
      }
    });

    // 卸载与清理守卫
    onBeforeUnmount(() => {
      destroy();
    });
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      destroy();
    });
  }

  return {
    containerRef,
    ready: readonly(ready) as Readonly<Ref<boolean>>,
    loading: readonly(loading) as Readonly<Ref<boolean>>,
    activeSheetId: readonly(activeSheetId) as Readonly<Ref<string | null>>,
    sheetList: readonly(sheetList) as Readonly<Ref<Array<{ id: string; name: string }>>>,
    selection: readonly(selection) as Readonly<Ref<SpreadsheetRange | null>>,
    isDirty: readonly(isDirty) as Readonly<Ref<boolean>>,
    getSnapshot,
    setSnapshot,
    getData,
    setData,
    exportCsv,
    exportJson,
    addSheet,
    removeSheet,
    activateSheet,
    setReadOnly,
    setTheme,
    undo,
    redo,
    clear,
    resize,
    destroy,
    getUniverAPI: () => univerAPIInstance,
    getUniver: () => univerInstance,
  };
}
