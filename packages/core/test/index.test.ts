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
});
