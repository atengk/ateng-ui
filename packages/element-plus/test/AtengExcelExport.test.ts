/**
 * AtengExcelExport 流式导出按钮组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengExcelExport } from '../src/components/excel-export';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../src/components/shared/context';

describe('AtengExcelExport 流式导出按钮组件交互与契约测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('基础渲染：默认渲染主要按钮，呈现文案与导出图标', () => {
    const wrapper = mount(AtengExcelExport, {
      props: {
        text: '导出清单',
      },
    });

    expect(wrapper.classes()).toContain('at-excel-export');
    expect(wrapper.find('.el-button').text()).toContain('导出清单');
    expect(wrapper.find('svg').exists()).toBe(true);

    wrapper.unmount();
  });

  it('独立调用导出动作：点击后触发 action，派发 export-start 与 export-success', async () => {
    const mockAction = vi.fn().mockResolvedValue({ total: 100 });
    const wrapper = mount(AtengExcelExport, {
      props: {
        action: mockAction,
        params: { status: 1 },
      },
    });

    await wrapper.find('.el-button').trigger('click');

    expect(mockAction).toHaveBeenCalledWith({ status: 1 });
    expect(wrapper.emitted('export-start')).toBeTruthy();
    expect(wrapper.emitted('export-start')![0]).toEqual(['all']);
    expect(wrapper.emitted('export-success')).toBeTruthy();
    expect(wrapper.emitted('export-success')![0]).toEqual([{ total: 100 }]);

    wrapper.unmount();
  });

  it('表格上下文感知与智能分支：有勾选时优先导出选中项，无勾选时全量导出', async () => {
    const mockAction = vi.fn().mockResolvedValue(true);
    const mockTableContext: AtengTableContext = {
      search: vi.fn(),
      reset: vi.fn(),
      getSelectedRows: () => [{ id: 'row_1' }, { id: 'row_2' }],
      getQueryParams: () => ({ pageNum: 1, pageSize: 10, keyword: 'test' }),
    };

    const wrapper = mount(AtengExcelExport, {
      props: {
        action: mockAction,
      },
      global: {
        provide: {
          [ATENG_TABLE_CONTEXT_KEY as symbol]: mockTableContext,
        },
      },
    });

    // 选中 2 项，徽标呈现 (2)
    expect(wrapper.find('.at-excel-export__badge').text()).toBe('(2)');

    // 点击导出，自动触发 selected 模式
    await wrapper.find('.el-button').trigger('click');

    expect(wrapper.emitted('export-start')![0]).toEqual(['selected']);
    expect(mockAction).toHaveBeenCalledWith({
      ids: ['row_1', 'row_2'],
      selectedRows: [{ id: 'row_1' }, { id: 'row_2' }],
    });

    wrapper.unmount();
  });

  it('Blob 客户端流转下载：action 返回 Blob 时触发下载并释放 URL 对象', async () => {
    const mockBlob = new Blob(['mock content'], { type: 'application/vnd.ms-excel' });
    const mockAction = vi.fn().mockResolvedValue(mockBlob);

    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    const wrapper = mount(AtengExcelExport, {
      props: {
        action: mockAction,
        filename: '自定义导出表.xlsx',
      },
    });

    await wrapper.find('.el-button').trigger('click');

    expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/test');
    expect(wrapper.emitted('export-success')).toBeTruthy();

    wrapper.unmount();
  });

  it('异常安全拦截：action 抛错时捕获并派发 export-error，不产生崩溃', async () => {
    const mockAction = vi.fn().mockRejectedValue(new Error('导出失败，服务器熔断'));
    const wrapper = mount(AtengExcelExport, {
      props: {
        action: mockAction,
      },
    });

    await wrapper.find('.el-button').trigger('click');

    expect(wrapper.emitted('export-error')).toBeTruthy();
    expect(wrapper.vm.isLoading).toBe(false);

    wrapper.unmount();
  });
});
