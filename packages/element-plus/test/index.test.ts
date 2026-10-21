/**
 * @atengk/element-plus 顶级入口导出全景测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect } from 'vitest';
import AtengElementPlus, {
  VERSION,
  install,
  installer,
  // 指令集
  vPermission,
  vRole,
  vIdempotent,
  vCopy,
  vWatermark,
  // Stage 1 & Stage 2 组件
  AtengEmpty,
  AtengDialog,
  AtengDrawer,
  AtengQueryForm,
  AtengTable,
  // Stage 3 业务组件与门面
  AtengDictSelect,
  AtengDictRadio,
  AtengDictCheckbox,
  AtengDictTag,
  DictManager,
  AtengDescriptions,
  AtengDescriptionsItem,
  AtengDateRange,
  AtengExcelFeedback,
  AtengExcelExport,
  AtengUpload,
  AtengLogViewer,
  AtengStatistic,
  AtengCodeView,
  AtengIconSelect,
  AtengCaptcha,
  // 便捷 At* 别名
  AtDialog,
  AtDrawer,
  AtEmpty,
  AtQueryForm,
  AtTable,
  AtDictSelect,
  AtDictRadio,
  AtDictCheckbox,
  AtDictTag,
  AtDescriptions,
  AtDescriptionsItem,
  AtDateRange,
  AtExcelFeedback,
  AtExcelExport,
  AtUpload,
  AtLogViewer,
  AtStatistic,
  AtCodeView,
  AtIconSelect,
  AtCaptcha,
  // 核心类型导出验证
  type DictItem,
  type AtengDictCheckboxProps,
  type AtengDictCheckboxInstance,
  type AtengExcelExportProps,
  type AtengExcelExportInstance,
  type AtengLogViewerProps,
  type AtengLogViewerInstance,
  type AtengStatisticProps,
  type AtengStatisticInstance,
  type AtengCodeViewProps,
  type AtengCodeViewInstance,
  type AtengIconSelectProps,
  type AtengIconSelectInstance,
  type AtengCaptchaProps,
  type AtengCaptchaInstance,
  type DescriptionsItemConfig,
  type DateRangeShortcut,
  type ExcelFeedbackItem,
  type UploadMergeParams,
  type AtengTableColumn,
  type AtengQueryFormField,
} from '../src/index';

describe('@atengk/element-plus 顶级具名导出全景规范测试', () => {
  it('正确导出版本、全局安装器与默认导出', () => {
    expect(VERSION).toBe('0.1.0');
    expect(typeof install).toBe('function');
    expect(installer).toBeDefined();
    expect(AtengElementPlus).toBe(installer);
  });

  it('完整导出全套 5 组企业级指令', () => {
    expect(vPermission).toBeDefined();
    expect(vRole).toBeDefined();
    expect(vIdempotent).toBeDefined();
    expect(vCopy).toBeDefined();
    expect(vWatermark).toBeDefined();
  });

  it('完整导出 Stage 1、Stage 2 与 Stage 3 全部 13 项核心组件与门面', () => {
    // Stage 1 & Stage 2
    expect(AtengEmpty).toBeDefined();
    expect(AtengDialog).toBeDefined();
    expect(AtengDrawer).toBeDefined();
    expect(AtengQueryForm).toBeDefined();
    expect(AtengTable).toBeDefined();

    // Stage 3
    expect(AtengDictSelect).toBeDefined();
    expect(AtengDictRadio).toBeDefined();
    expect(AtengDictCheckbox).toBeDefined();
    expect(AtengDictTag).toBeDefined();
    expect(DictManager).toBeDefined();
    expect(AtengDescriptions).toBeDefined();
    expect(AtengDescriptionsItem).toBeDefined();
    expect(AtengDateRange).toBeDefined();
    expect(AtengExcelFeedback).toBeDefined();
    expect(AtengExcelExport).toBeDefined();
    expect(AtengUpload).toBeDefined();
    expect(AtengLogViewer).toBeDefined();
    expect(AtengStatistic).toBeDefined();
    expect(AtengCodeView).toBeDefined();
    expect(AtengIconSelect).toBeDefined();
    expect(AtengCaptcha).toBeDefined();
  });

  it('完整导出全部 15 项组件的 At 规范别名', () => {
    expect(AtDialog).toBe(AtengDialog);
    expect(AtDrawer).toBe(AtengDrawer);
    expect(AtEmpty).toBe(AtengEmpty);
    expect(AtQueryForm).toBe(AtengQueryForm);
    expect(AtTable).toBe(AtengTable);
    expect(AtDictSelect).toBe(AtengDictSelect);
    expect(AtDictRadio).toBe(AtengDictRadio);
    expect(AtDictCheckbox).toBe(AtengDictCheckbox);
    expect(AtDictTag).toBe(AtengDictTag);
    expect(AtDescriptions).toBe(AtengDescriptions);
    expect(AtDescriptionsItem).toBe(AtengDescriptionsItem);
    expect(AtDateRange).toBe(AtengDateRange);
    expect(AtExcelFeedback).toBe(AtengExcelFeedback);
    expect(AtExcelExport).toBe(AtengExcelExport);
    expect(AtUpload).toBe(AtengUpload);
    expect(AtLogViewer).toBe(AtengLogViewer);
    expect(AtStatistic).toBe(AtengStatistic);
    expect(AtCodeView).toBe(AtengCodeView);
    expect(AtIconSelect).toBe(AtengIconSelect);
    expect(AtCaptcha).toBe(AtengCaptcha);
  });

  it('核心 TypeScript 类型契约编译闭环', () => {
    // 静态类型断言验证，保障下游开发者 import type 时 100% 存在且有效
    const mockDictItem: DictItem = { label: '启用', value: 1 };
    expect(mockDictItem.label).toBe('启用');

    const mockCheckboxProps: AtengDictCheckboxProps = { dictCode: 'test', button: true };
    expect(mockCheckboxProps.dictCode).toBe('test');

    const mockCheckboxInstance: Partial<AtengDictCheckboxInstance> = {
      refresh: vi.fn(),
    };
    expect(mockCheckboxInstance.refresh).toBeDefined();

    const mockExportProps: AtengExcelExportProps = { mode: 'dropdown', text: '导出' };
    expect(mockExportProps.mode).toBe('dropdown');

    const mockExportInstance: Partial<AtengExcelExportInstance> = {
      triggerExport: vi.fn(),
    };
    expect(mockExportInstance.triggerExport).toBeDefined();

    const mockLogProps: AtengLogViewerProps = { theme: 'dark', maxLines: 500 };
    expect(mockLogProps.maxLines).toBe(500);

    const mockLogInstance: Partial<AtengLogViewerInstance> = {
      clear: vi.fn(),
      scrollToBottom: vi.fn(),
    };
    expect(mockLogInstance.clear).toBeDefined();

    const mockStatisticProps: AtengStatisticProps = { value: 999, thousands: true };
    expect(mockStatisticProps.thousands).toBe(true);

    const mockStatisticInstance: Partial<AtengStatisticInstance> = {
      restart: vi.fn(),
    };
    expect(mockStatisticInstance.restart).toBeDefined();

    const mockCodeViewProps: AtengCodeViewProps = { code: 'const a = 1;', language: 'javascript' };
    expect(mockCodeViewProps.language).toBe('javascript');

    const mockCodeViewInstance: Partial<AtengCodeViewInstance> = {
      foldAll: vi.fn(),
      unfoldAll: vi.fn(),
    };
    expect(mockCodeViewInstance.foldAll).toBeDefined();

    const mockIconSelectProps: AtengIconSelectProps = { placeholder: '请选择', mode: 'dialog' };
    expect(mockIconSelectProps.mode).toBe('dialog');

    const mockIconSelectInstance: Partial<AtengIconSelectInstance> = {
      clear: vi.fn(),
      copyIconCode: vi.fn(),
    };
    expect(mockIconSelectInstance.clear).toBeDefined();

    const mockCaptchaProps: AtengCaptchaProps = { seconds: 60, storageKey: 'test_code' };
    expect(mockCaptchaProps.seconds).toBe(60);

    const mockCaptchaInstance: Partial<AtengCaptchaInstance> = {
      start: vi.fn(),
      reset: vi.fn(),
      refreshImage: vi.fn(),
    };
    expect(mockCaptchaInstance.start).toBeDefined();

    const mockDescConfig: DescriptionsItemConfig = { prop: 'username', label: '用户名' };
    expect(mockDescConfig.prop).toBe('username');

    const mockShortcut: DateRangeShortcut = { text: '今天', value: [new Date(), new Date()] };
    expect(mockShortcut.text).toBe('今天');

    const mockFeedback: ExcelFeedbackItem = { rowNum: 2, errorMessage: '错误' };
    expect(mockFeedback.rowNum).toBe(2);

    const mockMergeParams: UploadMergeParams = {
      file: new File([], 'test.bin'),
      chunks: [],
      totalChunks: 0,
    };
    expect(mockMergeParams.totalChunks).toBe(0);

    const mockColumn: AtengTableColumn = { prop: 'id', label: 'ID' };
    expect(mockColumn.prop).toBe('id');

    const mockField: AtengQueryFormField = { prop: 'keyword', label: '关键词' };
    expect(mockField.prop).toBe('keyword');
  });
});
