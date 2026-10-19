import { describe, it, expect } from 'vitest';
import {
  BusinessException,
  createPageResult,
  isResult,
  type Result,
  type PageResult,
  type PageQuery,
} from '../src/index';

describe('Contracts & BusinessException (Issue #2)', () => {
  describe('BusinessException', () => {
    it('should create an instance of BusinessException and Error with code and message', () => {
      const error = new BusinessException(500, '内部服务器错误');

      expect(error).toBeInstanceOf(BusinessException);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('BusinessException');
      expect(error.code).toBe(500);
      expect(error.msg).toBe('内部服务器错误');
      expect(error.message).toBe('内部服务器错误');
      expect(error.traceId).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should store traceId and retain causal exception chain via cause', () => {
      const originalError = new TypeError('底层的网络或数据类型解析失败');
      const error = new BusinessException(
        400,
        '参数校验不通过',
        'trace-test-123456',
        originalError,
      );

      expect(error.code).toBe(400);
      expect(error.msg).toBe('参数校验不通过');
      expect(error.traceId).toBe('trace-test-123456');
      expect(error.cause).toBe(originalError);
      expect(error.stack).toBeDefined();
    });
  });

  describe('PageResult & Null Safety Guard', () => {
    it('should guarantee empty array [] when list is null or undefined', () => {
      // 模拟后端返回 null 或 undefined 的脏分页数据
      const resultFromNull = createPageResult(null as unknown as string[], 0);
      const resultFromUndefined = createPageResult(undefined, 0);

      expect(resultFromNull.list).toEqual([]);
      expect(resultFromNull.total).toBe(0);
      expect(resultFromUndefined.list).toEqual([]);
      expect(resultFromUndefined.total).toBe(0);
    });

    it('should preserve provided list items and total count correctly', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const result: PageResult<{ id: string; name: string }> = createPageResult(items, 100);

      expect(result.list).toHaveLength(2);
      expect(result.list).toBe(items);
      expect(result.total).toBe(100);
    });
  });

  describe('Result Type Guard', () => {
    it('should identify valid Result envelope objects', () => {
      const validResult: Result<{ name: string }> = {
        code: 200,
        data: { name: 'ateng' },
        msg: '操作成功',
        traceId: 'tr-001',
      };

      expect(isResult(validResult)).toBe(true);
    });

    it('should reject non-Result objects or null/undefined', () => {
      expect(isResult(null)).toBe(false);
      expect(isResult(undefined)).toBe(false);
      expect(isResult({ code: '200', data: {} })).toBe(false);
      expect(isResult({ data: {} })).toBe(false);
    });
  });

  describe('PageQuery Contract', () => {
    it('should conform to PageQuery structure', () => {
      const query: PageQuery = {
        pageNum: 1,
        pageSize: 20,
        sortField: 'createTime',
        sortAsc: false,
      };

      expect(query.pageNum).toBe(1);
      expect(query.pageSize).toBe(20);
      expect(query.sortField).toBe('createTime');
      expect(query.sortAsc).toBe(false);
    });
  });
});
