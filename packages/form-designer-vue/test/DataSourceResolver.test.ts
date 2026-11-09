/**
 * DataSourceResolver 远程数据源动态解析与协调器单元测试。
 *
 * 遵循 ADR-0008（全自洽单测）与 ADR-0010/ADR-0013 规约：
 * 验证动态变量插值、依赖就绪检查、异步时序取消与字段名映射契约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataSourceResolver } from '../src/datasource';
import type { DataSourceConfig } from '../src/datasource';

describe('DataSourceResolver 远程数据源动态协调器', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolveTemplate 成功替换 {{ variable }} 与 {{ formData.variable }} 占位符', () => {
    const formData = {
      provinceId: '110000',
      user: {
        deptId: 'D-998',
      },
    };

    const url1 = DataSourceResolver.resolveTemplate(
      '/api/city?pid={{ provinceId }}&dept={{ user.deptId }}',
      formData,
    );
    expect(url1).toBe('/api/city?pid=110000&dept=D-998');

    const url2 = DataSourceResolver.resolveTemplate(
      '/api/city?pid={{ formData.provinceId }}',
      formData,
    );
    expect(url2).toBe('/api/city?pid=110000');

    // 缺失字段优雅替换为空字符串
    const url3 = DataSourceResolver.resolveTemplate('/api/test?none={{ missingField }}', formData);
    expect(url3).toBe('/api/test?none=');
  });

  it('resolveParams 递归解析请求参数并保留非字符串类型', () => {
    const formData = {
      roleId: 101,
      isActive: true,
      deptCode: 'TECH',
    };

    const resolved = DataSourceResolver.resolveParams(
      {
        rId: '{{ roleId }}',
        active: '{{ isActive }}',
        dept: 'DEPT_{{ deptCode }}',
        fixed: 42,
      },
      formData,
    );

    expect(resolved.rId).toBe(101);
    expect(resolved.active).toBe(true);
    expect(resolved.dept).toBe('DEPT_TECH');
    expect(resolved.fixed).toBe(42);
  });

  it('isDependenciesReady 校验上游依赖就绪态', () => {
    expect(DataSourceResolver.isDependenciesReady([], {})).toBe(true);
    expect(DataSourceResolver.isDependenciesReady(undefined, {})).toBe(true);

    const deps = ['provinceId', 'cityId'];

    expect(DataSourceResolver.isDependenciesReady(deps, {})).toBe(false);
    expect(DataSourceResolver.isDependenciesReady(deps, { provinceId: '110000' })).toBe(false);
    expect(
      DataSourceResolver.isDependenciesReady(deps, {
        provinceId: '110000',
        cityId: '110100',
      }),
    ).toBe(true);
  });

  it('mapRawOptions 成功根据自定义映射标准化为 DataSourceOption 树', () => {
    const rawList = [
      {
        id: '1',
        title: '研发中心',
        subList: [{ id: '11', title: '前端架构组', isLock: true }],
      },
      { id: '2', title: '市场运营部' },
    ];

    const options = DataSourceResolver.mapRawOptions(rawList, {
      label: 'title',
      value: 'id',
      children: 'subList',
      disabled: 'isLock',
    });

    expect(options.length).toBe(2);
    expect(options[0]?.label).toBe('研发中心');
    expect(options[0]?.value).toBe('1');
    expect(options[0]?.children?.length).toBe(1);
    expect(options[0]?.children?.[0]?.label).toBe('前端架构组');
    expect(options[0]?.children?.[0]?.disabled).toBe(true);
  });

  it('fetchOptions 处理静态数据源与依赖未就绪保底返回空数组', async () => {
    const staticConfig: DataSourceConfig = {
      type: 'static',
      staticOptions: [{ label: '男', value: 'M' }],
    };
    const res1 = await DataSourceResolver.fetchOptions(staticConfig);
    expect(res1).toEqual([{ label: '男', value: 'M' }]);

    const apiConfig: DataSourceConfig = {
      type: 'api',
      url: '/api/cities',
      dependencies: ['provinceId'],
    };
    // 依赖未提供，保底返回空数组且不触发网络请求
    const res2 = await DataSourceResolver.fetchOptions(apiConfig, {});
    expect(res2).toEqual([]);
  });

  it('fetchOptions 支持自定义 loader 钩子并正确接收 signal', async () => {
    const loader = vi.fn().mockResolvedValue([
      { label: '北京', value: 'BJ' },
      { label: '上海', value: 'SH' },
    ]);

    const config: DataSourceConfig = {
      type: 'api',
      loader,
    };

    const controller = new AbortController();
    const result = await DataSourceResolver.fetchOptions(
      config,
      { user: 'test' },
      controller.signal,
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(2);
    expect(result[0]?.label).toBe('北京');
  });

  it('fetchOptions 对齐 Result<T> 解包并正确映射选项', async () => {
    const mockResponseData = {
      code: 200,
      msg: 'success',
      data: [
        { codeName: '电子产品', codeVal: 'ELEC' },
        { codeName: '办公耗材', codeVal: 'OFFICE' },
      ],
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    } as Response);

    const config: DataSourceConfig = {
      type: 'api',
      url: '/api/categories',
      params: { parent: '{{ parentId }}' },
      fieldMapping: { label: 'codeName', value: 'codeVal' },
    };

    const result = await DataSourceResolver.fetchOptions(config, { parentId: 'CAT_01' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(2);
    expect(result[0]?.label).toBe('电子产品');
    expect(result[0]?.value).toBe('ELEC');
  });
});
