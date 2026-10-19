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
});
