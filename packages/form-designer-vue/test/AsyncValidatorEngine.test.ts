/**
 * AsyncValidatorEngine 异步时序抗竞态校验引擎单元测试。
 *
 * 遵循 ADR-0013 与 ADR-0044 规约，覆盖标准同步规则、类型校验、防抖与异步竞态先发后至丢弃。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AsyncValidatorEngine } from '../src';
import type { FormRule } from '../src';

describe('AsyncValidatorEngine', () => {
  let engine: AsyncValidatorEngine;

  beforeEach(() => {
    engine = new AsyncValidatorEngine();
  });

  afterEach(() => {
    engine.clearAll();
  });

  it('应该正确校验同步标准规则 (required, pattern, min, max, len)', async () => {
    const rules: FormRule[] = [
      { required: true, message: '必填项' },
      { min: 3, message: '最少 3 个字符' },
      { max: 10, message: '最多 10 个字符' },
      { pattern: /^[a-zA-Z]+$/, message: '必须全部为英文字母' },
    ];

    // 必填项空值
    const res1 = await engine.validateField('name', rules, '', {});
    expect(res1.valid).toBe(false);
    expect(res1.error).toBe('必填项');

    // 长度不足
    const res2 = await engine.validateField('name', rules, 'ab', {});
    expect(res2.valid).toBe(false);
    expect(res2.error).toBe('最少 3 个字符');

    // 正则不匹配
    const res3 = await engine.validateField('name', rules, 'abc123', {});
    expect(res3.valid).toBe(false);
    expect(res3.error).toBe('必须全部为英文字母');

    // 正确通过
    const res4 = await engine.validateField('name', rules, 'admin', {});
    expect(res4.valid).toBe(true);
    expect(res4.error).toBeUndefined();
  });

  it('应该正确校验内置类型 (email, url, integer)', async () => {
    const emailRules: FormRule[] = [{ type: 'email', message: '邮箱格式错误' }];
    const urlRules: FormRule[] = [{ type: 'url', message: 'URL 格式错误' }];
    const intRules: FormRule[] = [{ type: 'integer', message: '必须为整数' }];

    expect((await engine.validateField('email', emailRules, 'invalid-email', {})).valid).toBe(
      false,
    );
    expect((await engine.validateField('email', emailRules, 'user@example.com', {})).valid).toBe(
      true,
    );

    expect((await engine.validateField('url', urlRules, 'ftp//test', {})).valid).toBe(false);
    expect((await engine.validateField('url', urlRules, 'https://example.com', {})).valid).toBe(
      true,
    );

    expect((await engine.validateField('age', intRules, '12.34', {})).valid).toBe(false);
    expect((await engine.validateField('age', intRules, '42', {})).valid).toBe(true);
  });

  it('应该正确执行异步网络校验与时序抗竞态防御（后发先至丢弃）', async () => {
    // 模拟服务端查重接口：
    // 请求 1 (输入 'admin'): 慢响应 80ms，服务端判定重名报错
    // 请求 2 (输入 'admin_new'): 快响应 20ms，服务端判定通过
    const usernameRules: FormRule[] = [
      {
        debounceMs: 0, // 关闭防抖，直接并发发起真实异步调用
        asyncValidator: async (_rule, val) => {
          if (val === 'admin') {
            await new Promise(resolve => setTimeout(resolve, 80));
            throw new Error('用户名已被占用');
          } else {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        },
      },
    ];

    // 发起第一次调用 (慢且报错)
    const task1 = engine.validateField('username', usernameRules, 'admin', {});

    // 10ms 后发起第二次调用 (快且通过)
    await new Promise(resolve => setTimeout(resolve, 10));
    const task2 = engine.validateField('username', usernameRules, 'admin_new', {});

    const [res1, res2] = await Promise.all([task1, task2]);

    // 关键断言：task1 由于时序过期已被逻辑废弃 (标记为 valid: true)，不会污染最新状态
    expect(res1.valid).toBe(true);
    // task2 为最新请求，顺利通过
    expect(res2.valid).toBe(true);
    expect(res2.error).toBeUndefined();
  });

  it('应该支持 debounceMs 防抖延迟并合并高频触发', async () => {
    let callCount = 0;
    const rules: FormRule[] = [
      {
        debounceMs: 60,
        asyncValidator: async () => {
          callCount++;
        },
      },
    ];

    // 高频连续键入 3 次
    const t1 = engine.validateField('keyword', rules, 'a', {});
    await new Promise(resolve => setTimeout(resolve, 15));
    const t2 = engine.validateField('keyword', rules, 'ab', {});
    await new Promise(resolve => setTimeout(resolve, 15));
    const t3 = engine.validateField('keyword', rules, 'abc', {});

    const [r1, r2, r3] = await Promise.all([t1, t2, t3]);
    expect(r1.valid).toBe(true);
    expect(r2.valid).toBe(true);
    expect(r3.valid).toBe(true);

    // 等待最后一次防抖完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 前两次在防抖阶段被废弃，仅执行了最后一次
    expect(callCount).toBe(1);
  });

  it('应该支持 cancelField 立即废弃在途校验', async () => {
    const rules: FormRule[] = [
      {
        debounceMs: 0,
        asyncValidator: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          throw new Error('不应被抛出');
        },
      },
    ];

    const task = engine.validateField('account', rules, 'test', {});
    // 立即取消
    engine.cancelField('account');

    const res = await task;
    expect(res.valid).toBe(true);
  });
});
