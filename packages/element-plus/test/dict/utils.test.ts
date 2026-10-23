/**
 * 字典项解析、字段自适应映射与类型弱比对工具函数单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDictItem,
  normalizeDictItems,
  isDictValueMatched,
  coerceToMatchedValue,
} from '../../src/components/dict/utils';
import type { DictItem } from '../../src/components/dict/types';

describe('字典工具函数 (dict/utils) 单元测试', () => {
  describe('normalizeDictItem 规范化解析', () => {
    it('标准对象直接返回原对象，无冗余克隆开销', () => {
      const standard: DictItem = { label: '启用', value: 1 };
      const res = normalizeDictItem(standard);
      expect(res).toBe(standard);
    });

    it('非对象或空值保底返回安全格式', () => {
      expect(normalizeDictItem(null)).toEqual({ label: '', value: '' });
      expect(normalizeDictItem(undefined)).toEqual({ label: '', value: '' });
      expect(normalizeDictItem('文本值')).toEqual({ label: '文本值', value: '文本值' });
      expect(normalizeDictItem(123)).toEqual({ label: '123', value: 123 });
    });

    it('支持 fieldNames 完整字段映射', () => {
      const raw = {
        deptTitle: '研发部',
        deptCode: 'D01',
        tagColor: 'success',
        isForbidden: true,
        customClass: 'custom-dept',
      };
      const res = normalizeDictItem(raw, {
        fieldNames: {
          label: 'deptTitle',
          value: 'deptCode',
          tagType: 'tagColor',
          disabled: 'isForbidden',
          cssClass: 'customClass',
        },
      });

      expect(res.label).toBe('研发部');
      expect(res.value).toBe('D01');
      expect(res.tagType).toBe('success');
      expect(res.disabled).toBe(true);
      expect(res.cssClass).toBe('custom-dept');
      expect(res.raw).toBe(raw);
    });

    it('快捷属性（labelField / valueField）优先级高于 fieldNames', () => {
      const raw = {
        nameA: '名称A',
        nameB: '名称B',
        idA: 1,
        idB: 2,
      };
      const res = normalizeDictItem(raw, {
        fieldNames: { label: 'nameA', value: 'idA' },
        labelField: 'nameB',
        valueField: 'idB',
      });

      expect(res.label).toBe('名称B');
      expect(res.value).toBe(2);
    });

    it('安全回退链：映射字段未命中时回退标准 label 与 value', () => {
      const raw = {
        label: '标准回退',
        value: 'std_val',
      };
      const res = normalizeDictItem(raw, {
        fieldNames: { label: 'notExistField', value: 'notExistValue' },
      });

      expect(res.label).toBe('标准回退');
      expect(res.value).toBe('std_val');
    });

    it('normalizeDictItems 批量处理与空安全', () => {
      expect(normalizeDictItems(null as unknown as unknown[])).toEqual([]);
      expect(normalizeDictItems([])).toEqual([]);

      const rawList = [
        { codeName: 'A', codeValue: 1 },
        { codeName: 'B', codeValue: 2 },
      ];
      const res = normalizeDictItems(rawList, { labelField: 'codeName', valueField: 'codeValue' });
      expect(res.length).toBe(2);
      expect(res[0].label).toBe('A');
      expect(res[1].value).toBe(2);
    });
  });

  describe('isDictValueMatched 弱比对与强比对策略', () => {
    it('auto 模式：字符串与数字跨类型安全弱比对', () => {
      expect(isDictValueMatched(1, '1', 'auto')).toBe(true);
      expect(isDictValueMatched('2', 2, 'auto')).toBe(true);
      expect(isDictValueMatched(0, '0', 'auto')).toBe(true);
      expect(isDictValueMatched('0', false, 'auto')).toBe(false); // String('0') === '0', String(false) === 'false'
      expect(isDictValueMatched(true, 'true', 'auto')).toBe(true);
      expect(isDictValueMatched(1, '2', 'auto')).toBe(false);
    });

    it('string 模式：统一转换为字符串比对', () => {
      expect(isDictValueMatched(100, '100', 'string')).toBe(true);
      expect(isDictValueMatched(100, '200', 'string')).toBe(false);
    });

    it('number 模式：统一转换为数值比对', () => {
      expect(isDictValueMatched('123', 123, 'number')).toBe(true);
      expect(isDictValueMatched('123.45', 123.45, 'number')).toBe(true);
      expect(isDictValueMatched('123', 456, 'number')).toBe(false);
    });

    it('空值与未定义安全处理', () => {
      expect(isDictValueMatched(null, null, 'auto')).toBe(true);
      expect(isDictValueMatched(undefined, undefined, 'auto')).toBe(true);
      expect(isDictValueMatched(null, undefined, 'auto')).toBe(false);
      expect(isDictValueMatched(1, null, 'auto')).toBe(false);
    });
  });

  describe('coerceToMatchedValue 选项回显值转换', () => {
    const items: DictItem[] = [
      { label: '启用', value: 1 },
      { label: '停用', value: 0 },
      { label: '字符串ID', value: 'abc' },
    ];

    it('当输入为字符 "1" 且选项为数字 1 时，转换返回选项的真实值 1', () => {
      expect(coerceToMatchedValue('1', items, 'auto')).toBe(1);
    });

    it('当输入为数字 0 且选项为数字 0 时，返回 0', () => {
      expect(coerceToMatchedValue(0, items, 'auto')).toBe(0);
    });

    it('未匹配时原样返回输入值', () => {
      expect(coerceToMatchedValue('not_match', items, 'auto')).toBe('not_match');
      expect(coerceToMatchedValue(999, items, 'auto')).toBe(999);
    });

    it('空值直接原样返回', () => {
      expect(coerceToMatchedValue(null, items)).toBe(null);
      expect(coerceToMatchedValue(undefined, items)).toBe(undefined);
      expect(coerceToMatchedValue('', items)).toBe('');
    });
  });
});
