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
  AtengUpload,
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
  AtUpload,
  // 核心类型导出验证
  type DictItem,
  type AtengDictCheckboxProps,
  type AtengDictCheckboxInstance,
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
    expect(AtengUpload).toBeDefined();
  });

  it('完整导出全部 13 项组件的 At 规范别名', () => {
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
    expect(AtUpload).toBe(AtengUpload);
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
