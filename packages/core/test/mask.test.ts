/**
 * 内存真明文展示脱敏工具集单元测试。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { describe, expect, it } from 'vitest';
import {
  formatMask,
  formatMaskEmail,
  formatMaskIdCard,
  formatMaskName,
  formatMaskPhone,
} from '../src/mask';

describe('Data Masking Suite (内存真明文展示脱敏工具集)', () => {
  describe('1. formatMask (底层通用脱敏函数)', () => {
    it('常规文本应正确保留前后字符并用星号脱敏中间内容', () => {
      expect(formatMask('1234567890', 3, 4)).toBe('123***7890');
      expect(formatMask('abcdef', 1, 1)).toBe('a****f');
      expect(formatMask('abcdef', 2, 2)).toBe('ab**ef');
    });

    it('支持指定自定义掩码字符', () => {
      expect(formatMask('1234567890', 3, 4, '#')).toBe('123###7890');
    });

    it('保留长度等于或超出总长度时应安全返回原字符串，不抛出异常', () => {
      expect(formatMask('hello', 3, 3)).toBe('hello');
      expect(formatMask('hello', 5, 0)).toBe('hello');
      expect(formatMask('hello', 0, 5)).toBe('hello');
      expect(formatMask('hi', 2, 2)).toBe('hi');
    });

    it('空值与边界输入应具备确定性空安全防御', () => {
      expect(formatMask(null, 1, 1)).toBe('');
      expect(formatMask(undefined, 1, 1)).toBe('');
      expect(formatMask('', 1, 1)).toBe('');
      expect(formatMask('abc', -1, -2)).toBe('***');
    });
  });

  describe('2. formatMaskPhone (手机号 3-4-4 脱敏)', () => {
    it('标准 11 位大陆手机号应正确脱敏为 3-4-4 格式', () => {
      expect(formatMaskPhone('13812345678')).toBe('138****5678');
      expect(formatMaskPhone('19988889999')).toBe('199****9999');
    });

    it('支持包含连字符或空格的分隔格式', () => {
      expect(formatMaskPhone('138-1234-5678')).toBe('138****5678');
      expect(formatMaskPhone('138 1234 5678')).toBe('138****5678');
    });

    it('支持带 +86 国际区号前缀的手机号', () => {
      expect(formatMaskPhone('+8613812345678')).toBe('+86138****5678');
      expect(formatMaskPhone('+86 138 1234 5678')).toBe('+86 138****5678');
    });

    it('支持自定义掩码字符', () => {
      expect(formatMaskPhone('13812345678', '#')).toBe('138####5678');
    });

    it('非 11 位异常或过短输入应安全容错不崩溃', () => {
      expect(formatMaskPhone('12345')).toBe('12345');
      expect(formatMaskPhone('021-12345678')).toBe('021****5678');
    });

    it('空值保底安全返回空字符串', () => {
      expect(formatMaskPhone(null)).toBe('');
      expect(formatMaskPhone(undefined)).toBe('');
      expect(formatMaskPhone('')).toBe('');
    });
  });

  describe('3. formatMaskIdCard (身份证号脱敏)', () => {
    it('18 位二代身份证应保留前 6 位与后 4 位，中间 8 位脱敏', () => {
      const id18 = '110101199003072345';
      const masked = formatMaskIdCard(id18);
      expect(masked).toBe('110101********2345');
      expect(masked.length).toBe(18);
    });

    it('18 位二代身份证末尾带 X 时应正确保留校验位', () => {
      expect(formatMaskIdCard('11010119900307234X')).toBe('110101********234X');
    });

    it('15 位一代身份证应保留前 6 位与后 3 位，中间 6 位脱敏', () => {
      const id15 = '110101900307234';
      const masked = formatMaskIdCard(id15);
      expect(masked).toBe('110101******234');
      expect(masked.length).toBe(15);
    });

    it('支持指定自定义保留位数与掩码字符', () => {
      expect(formatMaskIdCard('110101199003072345', 3, 4, '#')).toBe('110###########2345');
    });

    it('异常长度或非法输入安全降级', () => {
      expect(formatMaskIdCard('12345')).toBe('12345');
      expect(formatMaskIdCard(null)).toBe('');
      expect(formatMaskIdCard(undefined)).toBe('');
      expect(formatMaskIdCard('')).toBe('');
    });
  });

  describe('4. formatMaskEmail (邮箱地址脱敏)', () => {
    it('标准邮箱应脱敏用户名部分并完整保留 @ 域名', () => {
      expect(formatMaskEmail('service@atengk.com')).toBe('s*****e@atengk.com');
      expect(formatMaskEmail('zhangsan@example.com')).toBe('z******n@example.com');
    });

    it('短用户名邮箱应正确自适应脱敏', () => {
      expect(formatMaskEmail('a@test.com')).toBe('*@test.com');
      expect(formatMaskEmail('ab@test.com')).toBe('a*@test.com');
      expect(formatMaskEmail('abc@test.com')).toBe('a*c@test.com');
    });

    it('支持自定义掩码字符', () => {
      expect(formatMaskEmail('admin@test.com', '#')).toBe('a###n@test.com');
    });

    it('无 @ 符号的非规范输入应安全保底脱敏', () => {
      expect(formatMaskEmail('invalid-email')).toBe('i***********l');
    });

    it('空值保底安全返回空字符串', () => {
      expect(formatMaskEmail(null)).toBe('');
      expect(formatMaskEmail(undefined)).toBe('');
      expect(formatMaskEmail('')).toBe('');
    });
  });

  describe('5. formatMaskName (姓名脱敏)', () => {
    it('2 字中文姓名应脱敏第 2 个字 (如 张三 -> 张*)', () => {
      expect(formatMaskName('张三')).toBe('张*');
      expect(formatMaskName('李四')).toBe('李*');
    });

    it('3 字中文姓名应脱敏中间字符 (如 李小龙 -> 李*龙)', () => {
      expect(formatMaskName('李小龙')).toBe('李*龙');
      expect(formatMaskName('王大锤')).toBe('王*锤');
    });

    it('4 字及以上复姓或多字姓名应保留首尾字符 (如 诸葛孔明 -> 诸**明)', () => {
      expect(formatMaskName('诸葛孔明')).toBe('诸**明');
      expect(formatMaskName('古力娜扎尔')).toBe('古***尔');
    });

    it('单字姓名或单字符应安全返回原名', () => {
      expect(formatMaskName('张')).toBe('张');
    });

    it('支持自定义掩码字符', () => {
      expect(formatMaskName('李小龙', '#')).toBe('李#龙');
      expect(formatMaskName('诸葛孔明', '#')).toBe('诸##明');
    });

    it('空值保底安全返回空字符串', () => {
      expect(formatMaskName(null)).toBe('');
      expect(formatMaskName(undefined)).toBe('');
      expect(formatMaskName('')).toBe('');
    });
  });
});
