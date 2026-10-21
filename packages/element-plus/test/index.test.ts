import { describe, it, expect } from 'vitest';
import {
  VERSION,
  vPermission,
  vRole,
  vIdempotent,
  vCopy,
  vWatermark,
  AtengEmpty,
  AtengDialog,
  AtengDrawer,
  AtengQueryForm,
  AtengTable,
} from '../src/index';

describe('@atengk/element-plus baseline', () => {
  it('should export correct initial version, directives, and components', () => {
    expect(VERSION).toBe('0.1.0');
    expect(vPermission).toBeDefined();
    expect(vRole).toBeDefined();
    expect(vIdempotent).toBeDefined();
    expect(vCopy).toBeDefined();
    expect(vWatermark).toBeDefined();
    expect(AtengEmpty).toBeDefined();
    expect(AtengDialog).toBeDefined();
    expect(AtengDrawer).toBeDefined();
    expect(AtengQueryForm).toBeDefined();
    expect(AtengTable).toBeDefined();
  });
});
