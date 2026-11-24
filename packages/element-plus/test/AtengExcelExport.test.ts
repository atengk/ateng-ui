/**
 * AtengExcelExport 流式导出按钮组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createHttpClient } from '@atengk/core';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AtengExcelExport } from '../src/components/excel-export';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../src/components/shared/context';

describe('AtengExcelExport 流式导出按钮组件交互与契约测试', () => {
  const originalCreateObjectURL = globalThis.URL.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
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
      getQueryParams: () => ({ current: 1, size: 10, keyword: 'test' }),
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

  it('ADR-0004 双态异常防御：action 返回 application/json 伪装 Blob 时识别业务错误，绝不下载', async () => {
    const errorJson = JSON.stringify({ code: 500, msg: '权限不足，无法导出全量敏感资产' });
    const mockJsonBlob = new Blob([errorJson], { type: 'application/json;charset=utf-8' });
    const mockAction = vi.fn().mockResolvedValue(mockJsonBlob);

    const createObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;

    const wrapper = mount(AtengExcelExport, {
      props: {
        action: mockAction,
      },
    });

    await wrapper.find('.el-button').trigger('click');
    await vi.waitFor(() => {
      expect(wrapper.emitted('export-error')).toBeTruthy();
    });

    const emittedErrors = wrapper.emitted('export-error')![0] as [Error];
    expect(emittedErrors[0].message).toBe('权限不足，无法导出全量敏感资产');
    // 关键校验：绝不能调用 URL.createObjectURL 触发假下载！
    expect(createObjectURLMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('ADR-0004 双态异常防御：action 返回 application/problem+json 伪装 Blob 时提取错误信息并拦截', async () => {
    const errorJson = JSON.stringify({
      code: 40301,
      message: '数据安全合规管控：禁止跨租户全量导出',
    });
    const mockJsonBlob = new Blob([errorJson], { type: 'application/problem+json;charset=utf-8' });
    const mockAction = vi.fn().mockResolvedValue(mockJsonBlob);

    const createObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;

    const wrapper = mount(AtengExcelExport, {
      props: {
        action: mockAction,
      },
    });

    await wrapper.find('.el-button').trigger('click');
    await vi.waitFor(() => {
      expect(wrapper.emitted('export-error')).toBeTruthy();
    });

    const emittedErrors = wrapper.emitted('export-error')![0] as [Error];
    expect(emittedErrors[0].message).toBe('数据安全合规管控：禁止跨租户全量导出');
    expect(createObjectURLMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('多模下拉菜单模式：mode="dropdown" 渲染 el-dropdown 并能正确通过 handleCommand 触发', async () => {
    const mockAction = vi.fn().mockResolvedValue(true);
    const wrapper = mount(AtengExcelExport, {
      props: {
        mode: 'dropdown',
        action: mockAction,
        selectedIds: [101, 102],
      },
    });

    expect(wrapper.findComponent({ name: 'ElDropdown' }).exists()).toBe(true);

    // 调用暴露的 triggerExport 模拟 command 派发
    await wrapper.vm.triggerExport('selected');

    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({
        ids: [101, 102],
      }),
    );
    expect(wrapper.emitted('export-start')![0]).toEqual(['selected']);

    wrapper.unmount();
  });

  it('文件名解析优先级：显式 props.filename 优先于 Blob 关联的 Content-Disposition', async () => {
    const client = createHttpClient();
    const mockBlob = new Blob(['excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    client.instance.defaults.adapter = async (
      cfg: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => ({
      data: mockBlob,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-disposition':
          "attachment; filename*=UTF-8''%E6%9C%8D%E5%8A%A1%E7%AB%AF%E6%96%87%E4%BB%B6.xlsx",
      },
      config: cfg,
    });

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/priority');
    globalThis.URL.revokeObjectURL = vi.fn();
    let capturedAnchor: HTMLAnchorElement | null = null;
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        capturedAnchor = el as HTMLAnchorElement;
      }
      return el;
    });

    const wrapper = mount(AtengExcelExport, {
      props: {
        action: () => client.request<Blob>({ url: '/export', responseType: 'blob' }),
        filename: '  显式导出报表.xlsx  ',
      },
    });

    await wrapper.find('.el-button').trigger('click');
    await vi.waitFor(() => {
      expect(wrapper.emitted('export-success')).toBeTruthy();
    });

    expect(capturedAnchor?.download).toBe('显式导出报表.xlsx');
    wrapper.unmount();
  });

  it('文件名自动提取：未传 filename（或纯空白）时优先解析 Content-Disposition 服务端文件名', async () => {
    const client = createHttpClient();
    const mockBlob = new Blob(['excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    client.instance.defaults.adapter = async (
      cfg: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => ({
      data: mockBlob,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-disposition':
          "attachment; filename*=UTF-8''%E7%94%A8%E6%88%B7%E5%AF%BC%E5%87%BA%E6%B8%85%E5%8D%95.xlsx",
      },
      config: cfg,
    });

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/server-name');
    globalThis.URL.revokeObjectURL = vi.fn();
    let capturedAnchor: HTMLAnchorElement | null = null;
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        capturedAnchor = el as HTMLAnchorElement;
      }
      return el;
    });

    const wrapper = mount(AtengExcelExport, {
      props: {
        action: () => client.request<Blob>({ url: '/export', responseType: 'blob' }),
        filename: '   ',
      },
    });

    await wrapper.find('.el-button').trigger('click');
    await vi.waitFor(() => {
      expect(wrapper.emitted('export-success')).toBeTruthy();
    });

    expect(capturedAnchor?.download).toBe('用户导出清单.xlsx');
    wrapper.unmount();
  });

  it('文件名兜底回退：既无 props.filename 也无有效 Content-Disposition 时回退为 export_<ts>.xlsx', async () => {
    const mockBlob = new Blob(['excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fallback');
    globalThis.URL.revokeObjectURL = vi.fn();
    let capturedAnchor: HTMLAnchorElement | null = null;
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        capturedAnchor = el as HTMLAnchorElement;
      }
      return el;
    });

    // 场景 A：直传普通 Blob（无 Content-Disposition）
    const wrapperA = mount(AtengExcelExport, {
      props: {
        action: vi.fn().mockResolvedValue(mockBlob),
      },
    });
    await wrapperA.find('.el-button').trigger('click');
    await vi.waitFor(() => {
      expect(wrapperA.emitted('export-success')).toBeTruthy();
    });
    expect(capturedAnchor?.download).toMatch(/^export_\d+\.xlsx$/);
    wrapperA.unmount();

    // 场景 B：Content-Disposition 为非法值时也不得回退为 'download'，仍应回退为 export_<ts>.xlsx
    capturedAnchor = null;
    const client = createHttpClient();
    const invalidHeaderBlob = new Blob(['excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    client.instance.defaults.adapter = async (
      cfg: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => ({
      data: invalidHeaderBlob,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-disposition': 'invalid-header',
      },
      config: cfg,
    });

    const wrapperB = mount(AtengExcelExport, {
      props: {
        action: () => client.request<Blob>({ url: '/export', responseType: 'blob' }),
      },
    });
    await wrapperB.find('.el-button').trigger('click');
    await vi.waitFor(() => {
      expect(wrapperB.emitted('export-success')).toBeTruthy();
    });
    expect(capturedAnchor?.download).toMatch(/^export_\d+\.xlsx$/);
    wrapperB.unmount();
  });
});
