import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('@atengk/core baseline', () => {
  it('should export correct initial version', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('should export routing engine items from root index', async () => {
    const core = await import('../src/index');
    expect(core.GatewayRouter).toBeDefined();
    expect(core.createGatewayRouter).toBeDefined();
    expect(core.resolveGatewayRoute).toBeDefined();
  });

  it('should export data masking suite from root index', async () => {
    const core = await import('../src/index');
    expect(core.formatMask).toBeDefined();
    expect(core.formatMaskPhone).toBeDefined();
    expect(core.formatMaskIdCard).toBeDefined();
    expect(core.formatMaskEmail).toBeDefined();
    expect(core.formatMaskName).toBeDefined();
  });

  it('should export auth manager and storage from root index', async () => {
    const core = await import('../src/index');
    expect(core.AuthManager).toBeDefined();
    expect(core.createAuthManager).toBeDefined();
    expect(core.authManager).toBeDefined();
    expect(core.MemoryAuthStorage).toBeDefined();
    expect(core.LocalStorageAuthStorage).toBeDefined();
    expect(core.createDefaultAuthStorage).toBeDefined();
  });

  it('should export abort coordinator items from root index', async () => {
    const core = await import('../src/index');
    expect(core.AbortCoordinator).toBeDefined();
    expect(core.createAbortCoordinator).toBeDefined();
    expect(core.generateRequestKey).toBeDefined();
    expect(core.isAbortError).toBeDefined();
  });

  it('should export file handling utilities from root index', async () => {
    const core = await import('../src/index');
    expect(core.parseContentDispositionFilename).toBeDefined();
    expect(core.checkBlobForJsonError).toBeDefined();
    expect(core.saveBlobAsFile).toBeDefined();
  });

  it('should export http client items from root index', async () => {
    const core = await import('../src/index');
    expect(core.DefaultHttpClient).toBeDefined();
    expect(core.createHttpClient).toBeDefined();
    expect(core.http).toBeDefined();
    expect(core.setupInterceptors).toBeDefined();
    expect(core.getBlobDisposition).toBeDefined();
  });

  it('should export currency utilities from root index', async () => {
    const core = await import('../src/index');
    expect(core.toCents).toBeDefined();
    expect(core.toYuan).toBeDefined();
    expect(core.formatCurrency).toBeDefined();
  });

  it('should export assertion utilities from root index', async () => {
    const core = await import('../src/index');
    expect(core.assert).toBeDefined();
    expect(core.assertNonNull).toBeDefined();
    expect(core.isEmpty).toBeDefined();
    expect(core.isNotEmpty).toBeDefined();
  });

  it('should export tenant manager and storage from root index', async () => {
    const core = await import('../src/index');
    expect(core.TenantManager).toBeDefined();
    expect(core.createTenantManager).toBeDefined();
    expect(core.tenantManager).toBeDefined();
    expect(core.MemoryTenantStorage).toBeDefined();
    expect(core.LocalStorageTenantStorage).toBeDefined();
    expect(core.createDefaultTenantStorage).toBeDefined();
  });

  it('should export cache storage and driver from root index', async () => {
    const core = await import('../src/index');
    expect(core.CacheStorage).toBeDefined();
    expect(core.createCacheStorage).toBeDefined();
    expect(core.cacheStorage).toBeDefined();
    expect(core.MemoryCacheDriver).toBeDefined();
    expect(core.LocalStorageCacheDriver).toBeDefined();
    expect(core.createDefaultCacheDriver).toBeDefined();
  });
});
