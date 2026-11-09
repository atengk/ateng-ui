/**
 * PrintException 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { PrintException, PrintErrorCode } from '../src/errors/PrintException';

describe('PrintException', () => {
  it('正确构造携带错误码与上下文的异常实体', () => {
    const originalError = new Error('Original network failure');
    const exception = new PrintException(
      '打印目标未找到',
      PrintErrorCode.INVALID_TARGET,
      { driverName: 'browser', target: '#none' },
      originalError,
    );

    expect(exception.name).toBe('PrintException');
    expect(exception.message).toBe('打印目标未找到');
    expect(exception.code).toBe(PrintErrorCode.INVALID_TARGET);
    expect(exception.context?.driverName).toBe('browser');
    expect(exception.context?.target).toBe('#none');
    expect(exception.cause).toBe(originalError);
  });
});
