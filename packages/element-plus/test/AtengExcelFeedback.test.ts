/**
 * AtengExcelFeedback 导入错误明细与 Fesod 批注回写弹窗组件规范与交互测试。
 *
 * 核心验证维度：
 * 1. 基础渲染与结构化明细表格；
 * 2. 空安全保底与防御性渲染（columnName 缺失渲染 '-'，空数组不崩溃）；
 * 3. 分页机制（超过 pageSize 时正确切片）；
 * 4. 一键复制错误明细（格式化文本与事件派发）；
 * 5. 标红批注文件双模下载（downloadAction 与 fileUrl）及无批注文件自适应隐藏；
 * 6. 下载异常捕获与 download-error 派发；
 * 7. defineExpose 暴露能力与弹窗开关关闭交互。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { ElTable, ElPagination, ElButton, ElAlert } from 'element-plus';
import { AtengExcelFeedback, type ExcelFeedbackItem } from '../src/components/excel-feedback';

describe('AtengExcelFeedback 导入错误明细弹窗交互测试', () => {
  let wrapper: VueWrapper | null = null;

  const mockErrors: ExcelFeedbackItem[] = [
    { rowNum: 2, columnName: '用户姓名', errorMessage: '姓名不能为空' },
    { rowNum: 3, columnName: '手机号码', errorMessage: '手机号码格式不合法' },
    { rowNum: 4, columnName: '年龄', errorMessage: '年龄超出合理区间 [1-120]' },
    { rowNum: 5, errorMessage: '该行缺少必填关键数据' }, // 测试 columnName 缺省
  ];

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('基础渲染：正确呈现弹窗容器、警示提示条与结构化错误表格', async () => {
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        appendToBody: false,
      },
    });
    await nextTick();

    // 1. 验证顶部统计警示条
    const alert = wrapper.findComponent(ElAlert);
    expect(alert.exists()).toBe(true);
    expect(alert.props('title')).toContain('4');

    // 2. 验证表格存在并绑定切片数据
    const table = wrapper.findComponent(ElTable);
    expect(table.exists()).toBe(true);
    expect(table.props('data')).toHaveLength(4);
  });

  it('空安全防御：无数据或非法 errors 入参时安全保底，不产生崩溃', async () => {
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: undefined,
        appendToBody: false,
      },
    });
    await nextTick();

    const alert = wrapper.findComponent(ElAlert);
    expect(alert.props('title')).toContain('0');

    const table = wrapper.findComponent(ElTable);
    expect(table.props('data')).toEqual([]);
  });

  it('分页机制：超过 pageSize 时正确展示分页器并响应翻页切片', async () => {
    const manyErrors: ExcelFeedbackItem[] = Array.from({ length: 15 }, (_, i) => ({
      rowNum: i + 1,
      columnName: `列${i + 1}`,
      errorMessage: `错误信息 ${i + 1}`,
    }));

    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: manyErrors,
        pageSize: 5,
        appendToBody: false,
      },
    });
    await nextTick();

    // 1. 初始第 1 页，表格仅包含 5 条数据
    const table = wrapper.findComponent(ElTable);
    expect(table.props('data')).toHaveLength(5);
    expect((table.props('data') as ExcelFeedbackItem[])[0].rowNum).toBe(1);

    // 2. 分页器已挂载
    const pagination = wrapper.findComponent(ElPagination);
    expect(pagination.exists()).toBe(true);
    expect(pagination.props('total')).toBe(15);

    // 3. 模拟翻页至第 2 页
    pagination.vm.$emit('update:current-page', 2);
    await wrapper.vm.$nextTick();

    expect((table.props('data') as ExcelFeedbackItem[])[0].rowNum).toBe(6);
  });

  it('一键复制：点击复制错误信息按钮，正确拼接文本并派发 copy 事件', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        appendToBody: false,
      },
    });
    await nextTick();

    // 找到复制按钮
    const buttons = wrapper.findAllComponents(ElButton);
    const copyBtn = buttons.find(b => b.text().includes('复制错误信息'));
    expect(copyBtn).toBeDefined();

    await copyBtn!.trigger('click');
    await nextTick();

    // 验证剪贴板写入与事件派发
    expect(writeTextMock).toHaveBeenCalled();
    const writtenText = writeTextMock.mock.calls[0][0];
    expect(writtenText).toContain('第 2 行 [用户姓名] 姓名不能为空');
    expect(writtenText).toContain('第 5 行 该行缺少必填关键数据');

    expect(wrapper.emitted('copy')).toBeTruthy();
    expect(wrapper.emitted('copy')![0][0]).toBe(writtenText);
  });

  it('下载批注 Excel：支持 downloadAction 异步拉取并派发 download-success', async () => {
    const fakeBlob = new Blob(['mock excel binary'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadActionMock = vi.fn().mockResolvedValue(fakeBlob);

    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        downloadAction: downloadActionMock,
        fileName: '测试导入批注.xlsx',
        appendToBody: false,
      },
    });
    await nextTick();

    const buttons = wrapper.findAllComponents(ElButton);
    const downloadBtn = buttons.find(b => b.text().includes('下载标红批注 Excel'));
    expect(downloadBtn).toBeDefined();

    await downloadBtn!.trigger('click');
    await nextTick();

    expect(downloadActionMock).toHaveBeenCalled();
    expect(wrapper.emitted('download-success')).toBeTruthy();
  });

  it('自适应隐藏：未配置 fileUrl 且未配置 downloadAction 时，下载批注按钮自动隐藏', async () => {
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        appendToBody: false,
      },
    });
    await nextTick();

    const buttons = wrapper.findAllComponents(ElButton);
    const downloadBtn = buttons.find(b => b.text().includes('下载标红批注 Excel'));
    expect(downloadBtn).toBeUndefined();
  });

  it('本地 CSV 降级导出：无后端批注文件时默认渲染导出 CSV 按钮，且 allowCsvFallback=false 时隐藏', async () => {
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        appendToBody: false,
      },
    });
    await nextTick();

    // 默认 allowCsvFallback=true，应渲染导出 CSV 按钮
    let buttons = wrapper.findAllComponents(ElButton);
    let csvBtn = buttons.find(b => b.text().includes('导出错误清单 (CSV)'));
    expect(csvBtn).toBeDefined();

    wrapper.unmount();

    // 当显式配置 allowCsvFallback=false 时，CSV 导出按钮不渲染
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        allowCsvFallback: false,
        appendToBody: false,
      },
    });
    await nextTick();

    buttons = wrapper.findAllComponents(ElButton);
    csvBtn = buttons.find(b => b.text().includes('导出错误清单 (CSV)'));
    expect(csvBtn).toBeUndefined();
  });

  it('UTF-8 BOM 防乱码导出：点击导出 CSV 生成带 \\uFEFF BOM 头的二进制流，确保 Windows Excel 不乱码且确定性回收内存', async () => {
    let capturedBlob: Blob | null = null;
    const createObjectURLMock = vi.fn().mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-csv-url';
    });
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        csvFileName: '自定义错误清单.csv',
        downloadCsvText: '立即下载错误清单',
        appendToBody: false,
      },
    });
    await nextTick();

    const buttons = wrapper.findAllComponents(ElButton);
    const csvBtn = buttons.find(b => b.text().includes('立即下载错误清单'));
    expect(csvBtn).toBeDefined();

    await csvBtn!.trigger('click');
    await nextTick();

    // 1. 验证创建了 ObjectURL 并捕获了 Blob
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(capturedBlob).not.toBeNull();

    // 2. 验证关键不变量：必须前置注入 \uFEFF (UTF-8 BOM 头)，彻底根除 Windows Excel 乱码
    const csvContent = await (capturedBlob as unknown as Blob).text();
    expect(csvContent.startsWith('\uFEFF')).toBe(true);

    // 3. 验证 CSV 结构化内容与表头
    expect(csvContent).toContain('"行号","列名/字段","错误原因","提交原始值"');
    expect(csvContent).toContain('"2","用户姓名","姓名不能为空"');
    expect(csvContent).toContain('"5","-","该行缺少必填关键数据"');

    // 4. 验证派发 download-success 事件与正确的文件名
    expect(wrapper.emitted('download-success')).toBeTruthy();
    expect(wrapper.emitted('download-success')![0]).toEqual(['自定义错误清单.csv']);

    // 5. 验证确定性生命周期回收：URL.revokeObjectURL 必须被调用
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-csv-url');
  });

  it('RFC 4180 特殊字符转义：当错误原因或列名包含双引号、逗号、换行符时，严格转义', async () => {
    let capturedBlob: Blob | null = null;
    const createObjectURLMock = vi.fn().mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-escaped-csv';
    });
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    const trickyErrors: ExcelFeedbackItem[] = [
      {
        rowNum: 99,
        columnName: '公司,部门"核心"',
        errorMessage: '包含换行\n和"内部双引号"的错误信息',
        rawValue: '100,200',
      },
    ];

    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: trickyErrors,
        appendToBody: false,
      },
    });
    await nextTick();

    // 调用暴露的 exportErrorsAsCsv 方法
    const exposed = wrapper.vm as unknown as { exportErrorsAsCsv: () => Promise<boolean> };
    const success = await exposed.exportErrorsAsCsv();
    expect(success).toBe(true);

    const csvContent = await (capturedBlob as unknown as Blob).text();
    // 内部双引号应被替换为两个双引号：""
    expect(csvContent).toContain('"公司,部门""核心"""');
    expect(csvContent).toContain('"包含换行\n和""内部双引号""的错误信息"');
    expect(csvContent).toContain('"100,200"');
  });

  it('下载异常防御：downloadAction 抛错时捕获异常并派发 download-error', async () => {
    const downloadActionMock = vi.fn().mockRejectedValue(new Error('Network Export Timeout'));

    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        downloadAction: downloadActionMock,
        appendToBody: false,
      },
    });
    await nextTick();

    const buttons = wrapper.findAllComponents(ElButton);
    const downloadBtn = buttons.find(b => b.text().includes('下载标红批注 Excel'));
    expect(downloadBtn).toBeDefined();

    await downloadBtn!.trigger('click');
    await nextTick();

    expect(wrapper.emitted('download-error')).toBeTruthy();
    expect(wrapper.emitted('download-error')![0][0]).toBeInstanceOf(Error);
  });

  it('弹窗关闭交互：点击关闭按钮派发 update:modelValue(false) 与 close 事件', async () => {
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        appendToBody: false,
      },
    });
    await nextTick();

    const buttons = wrapper.findAllComponents(ElButton);
    const closeBtn = buttons.find(b => b.text() === '关闭');
    expect(closeBtn).toBeDefined();

    await closeBtn!.trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('对外暴露能力：defineExpose 正确对外提供 copyErrors、downloadAnnotatedExcel 等句柄', () => {
    wrapper = mount(AtengExcelFeedback, {
      props: {
        modelValue: true,
        errors: mockErrors,
        appendToBody: false,
      },
    });

    const exposed = wrapper.vm as unknown as {
      copyErrors: () => Promise<boolean>;
      downloadAnnotatedExcel: () => Promise<boolean>;
      exportErrorsAsCsv: () => Promise<boolean>;
      downloadLoading: unknown;
      dialogRef: unknown;
    };

    expect(typeof exposed.copyErrors).toBe('function');
    expect(typeof exposed.downloadAnnotatedExcel).toBe('function');
    expect(typeof exposed.exportErrorsAsCsv).toBe('function');
    expect(exposed.downloadLoading).toBeDefined();
    expect(exposed.dialogRef).toBeDefined();
  });
});
