import { describe, it, expect } from 'vitest';
import { VERSION, vPermission, vRole, vIdempotent, vCopy, vWatermark } from '../src/index';

describe('@atengk/element-plus baseline', () => {
  it('should export correct initial version and directives', () => {
    expect(VERSION).toBe('0.1.0');
    expect(vPermission).toBeDefined();
    expect(vRole).toBeDefined();
    expect(vIdempotent).toBeDefined();
    expect(vCopy).toBeDefined();
    expect(vWatermark).toBeDefined();
  });
});
