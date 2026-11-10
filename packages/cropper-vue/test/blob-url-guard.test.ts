/**
 * BlobUrlGuard 临时对象 URL 内存守卫单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi } from 'vitest';
import { BlobUrlGuard } from '../src/guards/blob-url-guard';
import { revokedUrls, createdUrls } from './setup';

describe('BlobUrlGuard', () => {
  it('应能够接管并创建受管跟踪的 Object URL', () => {
    const guard = new BlobUrlGuard();
    const blob = new Blob(['test-data'], { type: 'image/png' });

    const url = guard.create(blob);

    expect(url).toMatch(/^blob:http:\/\/localhost\/mock-uuid-\d+/);
    expect(guard.isManaged(url)).toBe(true);
    expect(createdUrls).toContain(url);
    expect(revokedUrls).not.toContain(url);
  });

  it('释放特定受管 URL 时应确定性调用 URL.revokeObjectURL 并移出集合', () => {
    const guard = new BlobUrlGuard();
    const blob1 = new Blob(['data1']);
    const blob2 = new Blob(['data2']);

    const url1 = guard.create(blob1);
    const url2 = guard.create(blob2);

    expect(guard.isManaged(url1)).toBe(true);
    expect(guard.isManaged(url2)).toBe(true);

    guard.revoke(url1);

    expect(revokedUrls).toContain(url1);
    expect(guard.isManaged(url1)).toBe(false);
    expect(guard.isManaged(url2)).toBe(true);
    expect(revokedUrls).not.toContain(url2);
  });

  it('释放外部未受管 URL 时不应调用 URL.revokeObjectURL 杜绝 Double Free', () => {
    const guard = new BlobUrlGuard();
    const externalUrl = 'blob:http://localhost/external-blob-uuid';

    expect(guard.isManaged(externalUrl)).toBe(false);

    guard.revoke(externalUrl);

    expect(revokedUrls).not.toContain(externalUrl);
    expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalledWith(externalUrl);
  });

  it('revokeAll 应确定性释放所有当前管理的 Object URL', () => {
    const guard = new BlobUrlGuard();
    const url1 = guard.create(new Blob(['1']));
    const url2 = guard.create(new Blob(['2']));
    const url3 = guard.create(new Blob(['3']));

    expect(guard.managedCount).toBe(3);

    guard.revokeAll();

    expect(guard.managedCount).toBe(0);
    expect(revokedUrls).toContain(url1);
    expect(revokedUrls).toContain(url2);
    expect(revokedUrls).toContain(url3);
    expect(guard.isManaged(url1)).toBe(false);
  });

  it('重复释放或对空守卫释放应具备幂等安全性', () => {
    const guard = new BlobUrlGuard();
    const url = guard.create(new Blob(['idempotent']));

    guard.revoke(url);
    const firstCallCount = vi.mocked(globalThis.URL.revokeObjectURL).mock.calls.length;

    // 二次释放
    guard.revoke(url);
    expect(vi.mocked(globalThis.URL.revokeObjectURL).mock.calls.length).toBe(firstCallCount);

    // 空集合执行 revokeAll
    guard.revokeAll();
    expect(guard.managedCount).toBe(0);
  });
});
