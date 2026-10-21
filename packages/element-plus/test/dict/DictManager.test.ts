/**
 * DictManager 全局单例去重与内存缓存门面单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DictManager, DictManagerClass } from '../../src/components/dict/DictManager';
import type { DictItem } from '../../src/components/dict/types';

describe('DictManager 架构契约与并发控制测试', () => {
  beforeEach(() => {
    DictManager.clearCache();
    DictManager.setProvider(async () => []);
  });

  afterEach(() => {
    DictManager.clearCache();
    vi.restoreAllMocks();
  });

  it('门面完整性：提供单例实例与独立 Class 实例化能力', () => {
    expect(DictManager).toBeInstanceOf(DictManagerClass);
    const isolated = new DictManagerClass();
    expect(isolated).toBeInstanceOf(DictManagerClass);
  });

  it('全局 Provider 注册与获取', () => {
    const mockProvider = vi.fn().mockResolvedValue([]);
    DictManager.setProvider(mockProvider);
    expect(DictManager.getProvider()).toBe(mockProvider);
  });

  it('基础加载与纯内存常驻缓存', async () => {
    const mockData: DictItem[] = [
      { label: '男', value: '1', tagType: 'primary' },
      { label: '女', value: '2', tagType: 'danger' },
    ];
    const mockProvider = vi.fn().mockResolvedValue(mockData);
    DictManager.setProvider(mockProvider);

    // 首次加载：触发提供者调用
    const res1 = await DictManager.loadDict('sys_gender');
    expect(res1).toEqual(mockData);
    expect(mockProvider).toHaveBeenCalledTimes(1);
    expect(DictManager.hasCache('sys_gender')).toBe(true);
    expect(DictManager.getCache('sys_gender')).toEqual(mockData);

    // 第二次加载：直接命中内存缓存，Provider 不被再次调用
    const res2 = await DictManager.loadDict('sys_gender');
    expect(res2).toEqual(mockData);
    expect(mockProvider).toHaveBeenCalledTimes(1);
  });

  it('并发合并去重：同一代码毫秒级并发请求合并为单一物理调用，杜绝网络风暴', async () => {
    const mockData: DictItem[] = [{ label: '启用', value: 1, tagType: 'success' }];
    let resolver: (data: DictItem[]) => void = () => {};
    const pendingPromise = new Promise<DictItem[]>(resolve => {
      resolver = resolve;
    });
    const mockProvider = vi.fn().mockImplementation(() => pendingPromise);
    DictManager.setProvider(mockProvider);

    // 并发触发 5 次 loadDict
    const p1 = DictManager.loadDict('sys_status');
    const p2 = DictManager.loadDict('sys_status');
    const p3 = DictManager.loadDict('sys_status');
    const p4 = DictManager.loadDict('sys_status');
    const p5 = DictManager.loadDict('sys_status');

    // 尚未 resolve 时，Provider 仅被调用 1 次
    expect(mockProvider).toHaveBeenCalledTimes(1);

    // 完成异步请求
    resolver(mockData);
    const [r1, r2, r3, r4, r5] = await Promise.all([p1, p2, p3, p4, p5]);

    expect(r1).toEqual(mockData);
    expect(r2).toEqual(mockData);
    expect(r3).toEqual(mockData);
    expect(r4).toEqual(mockData);
    expect(r5).toEqual(mockData);
    expect(mockProvider).toHaveBeenCalledTimes(1);
  });

  it('强制穿透刷新：forceRefresh=true 跳过内存缓存重新拉取', async () => {
    const initialData: DictItem[] = [{ label: 'V1', value: '1' }];
    const updatedData: DictItem[] = [{ label: 'V2', value: '2' }];
    const mockProvider = vi
      .fn()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(updatedData);
    DictManager.setProvider(mockProvider);

    const first = await DictManager.loadDict('app_version');
    expect(first).toEqual(initialData);
    expect(mockProvider).toHaveBeenCalledTimes(1);

    // 强制刷新
    const second = await DictManager.loadDict('app_version', undefined, true);
    expect(second).toEqual(updatedData);
    expect(mockProvider).toHaveBeenCalledTimes(2);
    expect(DictManager.getCache('app_version')).toEqual(updatedData);
  });

  it('缓存清理：支持清除指定单个字典与清除全部缓存', async () => {
    DictManager.setProvider(async code => [{ label: code, value: code }]);
    await DictManager.loadDict('dict_a');
    await DictManager.loadDict('dict_b');

    expect(DictManager.hasCache('dict_a')).toBe(true);
    expect(DictManager.hasCache('dict_b')).toBe(true);

    // 单个清除
    DictManager.clearCache('dict_a');
    expect(DictManager.hasCache('dict_a')).toBe(false);
    expect(DictManager.hasCache('dict_b')).toBe(true);

    // 全部清除
    DictManager.clearCache();
    expect(DictManager.hasCache('dict_b')).toBe(false);
  });

  it('三级回退优先级：组件局部 loader 优先于全局 provider', async () => {
    const globalData: DictItem[] = [{ label: '全局', value: 'global' }];
    const localData: DictItem[] = [{ label: '局部', value: 'local' }];

    const globalProvider = vi.fn().mockResolvedValue(globalData);
    const localLoader = vi.fn().mockResolvedValue(localData);
    DictManager.setProvider(globalProvider);

    const res = await DictManager.loadDict('custom_code', localLoader);
    expect(res).toEqual(localData);
    expect(localLoader).toHaveBeenCalledTimes(1);
    expect(globalProvider).not.toHaveBeenCalled();
  });

  it('防御性容错：无 provider、入参为空或抛错时保底返回空数组 []，绝不返回 null 或崩溃', async () => {
    const isolated = new DictManagerClass();

    // 1. 无 provider 且无 loader
    const res1 = await isolated.loadDict('no_provider');
    expect(res1).toEqual([]);

    // 2. 空 code
    const res2 = await isolated.loadDict('');
    expect(res2).toEqual([]);

    // 3. Provider 抛出异常
    isolated.setProvider(async () => {
      throw new Error('网络断开');
    });
    const res3 = await isolated.loadDict('error_code');
    expect(res3).toEqual([]);
  });
});
