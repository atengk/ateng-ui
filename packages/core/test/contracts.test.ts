import { describe, it, expect } from 'vitest';
import {
  BusinessException,
  createPageResult,
  isResult,
  type Result,
  type PageResult,
  type PageQuery,
  type SortItem,
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
    it('should guarantee empty array [] when records is null or undefined', () => {
      // 模拟后端返回 null 或 undefined 的脏分页数据
      const resultFromNull = createPageResult(null as unknown as string[], 0);
      const resultFromUndefined = createPageResult(undefined, 0);

      expect(resultFromNull.records).toEqual([]);
      expect(resultFromNull.total).toBe(0);
      expect(resultFromUndefined.records).toEqual([]);
      expect(resultFromUndefined.total).toBe(0);
    });

    it('should preserve provided records items, total count and optional metadata correctly', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const result: PageResult<{ id: string; name: string }> = createPageResult(items, 100, {
        current: 1,
        size: 10,
        pages: 10,
      });

      expect(result.records).toHaveLength(2);
      expect(result.records).toBe(items);
      expect(result.total).toBe(100);
      expect(result.current).toBe(1);
      expect(result.size).toBe(10);
      expect(result.pages).toBe(10);
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
      if (isResult<{ name: string }>(validResult)) {
        expect(validResult.data.name).toBe('ateng');
      }
    });

    it('should reject non-Result objects or null/undefined', () => {
      expect(isResult(null)).toBe(false);
      expect(isResult(undefined)).toBe(false);
      expect(isResult({ code: '200', data: {} })).toBe(false);
      expect(isResult({ data: {} })).toBe(false);
    });
  });

  describe('PageQuery Contract', () => {
    it('should conform to PageQuery structure aligned with ateng-boot-core', () => {
      const sorts: SortItem[] = [
        { property: 'createTime', direction: 'DESC' },
        { property: 'id', direction: 'ASC' },
      ];
      const query: PageQuery = {
        current: 1,
        size: 20,
        sorts,
      };

      expect(query.current).toBe(1);
      expect(query.size).toBe(20);
      expect(query.sorts).toEqual(sorts);
    });
  });
});
