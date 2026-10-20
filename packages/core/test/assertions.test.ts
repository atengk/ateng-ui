/**
 * 强类型业务断言与防御性判空工具单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it } from 'vitest';
import { assert, assertNonNull, isEmpty, isNotEmpty } from '../src/assertions';
import { BusinessException } from '../src/contracts';

describe('Assertions (业务条件断言与防御性判空)', () => {
  describe('1. assert (前置条件断言)', () => {
    it('条件为真时不应抛出异常', () => {
      expect(() => assert(true, '应当通过')).not.toThrow();
      expect(() => assert(1 > 0, '大于0')).not.toThrow();
      expect(() => assert('hello', '非空串')).not.toThrow();
      expect(() => assert({}, '对象存在')).not.toThrow();
    });

    it('条件为假时应抛出 BusinessException 且携带指定状态码与错误信息', () => {
      expect(() => assert(false, '条件不满足')).toThrow(BusinessException);

      try {
        assert(false, '用户未激活', 40001);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        const bizErr = error as BusinessException;
        expect(bizErr.code).toBe(40001);
        expect(bizErr.msg).toBe('用户未激活');
      }
    });

    it('未指定状态码时应默认使用 400', () => {
      try {
        assert(0, '数值不能为零');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        const bizErr = error as BusinessException;
        expect(bizErr.code).toBe(400);
        expect(bizErr.msg).toBe('数值不能为零');
      }
    });
  });

  describe('2. assertNonNull (非空断言与类型收窄)', () => {
    it('非空值时不应抛出异常且支持类型收窄', () => {
      const name: string | null = 'Ateng';
      assertNonNull(name, '用户名不能为空');
      // 类型已收窄为 string
      expect(name.toUpperCase()).toBe('ATENG');

      const count: number | undefined = 0;
      assertNonNull(count, '计数不能为空');
      expect(count + 1).toBe(1);

      const flag: boolean | null = false;
      assertNonNull(flag, '布尔值不能为空');
      expect(flag).toBe(false);
    });

    it('传入 null 或 undefined 时应抛出 BusinessException', () => {
      expect(() => assertNonNull(null, '不能为 null')).toThrow(BusinessException);
      expect(() => assertNonNull(undefined, '不能为 undefined', 40002)).toThrow(BusinessException);

      try {
        assertNonNull(null, '数据不存在', 404);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        const bizErr = error as BusinessException;
        expect(bizErr.code).toBe(404);
        expect(bizErr.msg).toBe('数据不存在');
      }
    });
  });

  describe('3. isEmpty & isNotEmpty (多类型防御性判空)', () => {
    it('null 和 undefined 应识别为空', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
    });

    it('字符串空值或纯空格应识别为空', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('hello')).toBe(false);
      expect(isNotEmpty('hello')).toBe(true);
    });

    it('数组空与非空判定', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty([1])).toBe(false);
      expect(isNotEmpty([])).toBe(false);
      expect(isNotEmpty(['item'])).toBe(true);
    });

    it('纯对象空与非空判定', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty({ id: 1 })).toBe(false);
      expect(isNotEmpty({})).toBe(false);
      expect(isNotEmpty({ key: 'val' })).toBe(true);
    });

    it('Set 与 Map 集合判定', () => {
      expect(isEmpty(new Set())).toBe(true);
      expect(isEmpty(new Set([1]))).toBe(false);
      expect(isEmpty(new Map())).toBe(true);
      expect(isEmpty(new Map([['k', 'v']]))).toBe(false);
    });

    it('数值、布尔值与函数不应误判为空', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(123)).toBe(false);
      expect(isEmpty(false)).toBe(false);
      expect(isEmpty(true)).toBe(false);
      expect(isEmpty(() => {})).toBe(false);
      expect(isNotEmpty(0)).toBe(true);
      expect(isNotEmpty(false)).toBe(true);
    });
  });
});
