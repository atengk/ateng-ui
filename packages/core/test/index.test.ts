import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('@atengk/core baseline', () => {
  it('should export correct initial version', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
