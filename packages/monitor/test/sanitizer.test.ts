/**
 * PII 数据脱敏管道单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  sanitizeUrl,
  sanitizeHeaders,
  isElementMasked,
  sanitizeDomText,
} from '../src/sanitizer/pii';

describe('PII Sanitizer', () => {
  describe('sanitizeUrl', () => {
    it('应当对 URL 中预设的敏感 Query 参数进行星号掩码', () => {
      const raw =
        'https://api.example.com/v1/user?page=1&token=sec_abc123&keyword=test&password=p@ssword#user-info';
      const sanitized = sanitizeUrl(raw);

      expect(sanitized).toContain('page=1');
      expect(sanitized).toContain('keyword=test');
      expect(sanitized).toContain('token=******');
      expect(sanitized).toContain('password=******');
      expect(sanitized).toContain('#user-info');
    });

    it('不区分大小写匹配敏感参数键名', () => {
      const raw = 'https://api.example.com/query?TOKEN=secret&Access_Token=xyz&apiKey=key123';
      const sanitized = sanitizeUrl(raw);

      expect(sanitized).toBe(
        'https://api.example.com/query?TOKEN=******&Access_Token=******&apiKey=******',
      );
    });

    it('当 URL 不含 Query 参数时原样返回', () => {
      const raw = 'https://api.example.com/orders/list#tab1';
      expect(sanitizeUrl(raw)).toBe(raw);
    });

    it('支持传入自定义敏感字段清单', () => {
      const raw = 'https://example.com?customField=secretValue&normal=123';
      const sanitized = sanitizeUrl(raw, ['customField']);
      expect(sanitized).toBe('https://example.com?customField=******&normal=123');
    });

    it('对空输入或非法字符串进行安全防御保底', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizeHeaders', () => {
    it('应当对预设的敏感请求头（Authorization, Cookie, X-Token等）进行掩码', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer eyJhbGciOi...',
        Cookie: 'session_id=12345',
        'X-Token': 'tok-abcdef',
        'X-Custom-Safe': 'safe-data',
      };

      const sanitized = sanitizeHeaders(headers);
      expect(sanitized['Content-Type']).toBe('application/json');
      expect(sanitized['X-Custom-Safe']).toBe('safe-data');
      expect(sanitized.Authorization).toBe('******');
      expect(sanitized.Cookie).toBe('******');
      expect(sanitized['X-Token']).toBe('******');
    });

    it('对空对象或非法入参进行安全保底', () => {
      expect(sanitizeHeaders({})).toEqual({});
      expect(sanitizeHeaders(null as unknown as Record<string, string>)).toEqual({});
    });
  });

  describe('DOM 级脱敏 (isElementMasked & sanitizeDomText)', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
      document.body.innerHTML = '';
    });

    it('应当识别 input[type="password"] 并自动掩码', () => {
      const pwdInput = document.createElement('input');
      pwdInput.type = 'password';
      pwdInput.value = 'MyPassword123';
      container.appendChild(pwdInput);

      expect(isElementMasked(pwdInput)).toBe(true);
      const result = sanitizeDomText(pwdInput);
      expect(result.isMasked).toBe(true);
      expect(result.value).toBe('******');
      expect(result.text).toBe('******');
    });

    it('应当识别 [data-monitor-mask] 与 .monitor-mask 选择器', () => {
      const maskedDiv = document.createElement('div');
      maskedDiv.setAttribute('data-monitor-mask', 'true');
      maskedDiv.textContent = '13800138000';
      container.appendChild(maskedDiv);

      expect(isElementMasked(maskedDiv)).toBe(true);
      const result = sanitizeDomText(maskedDiv);
      expect(result.isMasked).toBe(true);
      expect(result.text).toBe('******');
    });

    it('应当支持祖先节点继承脱敏规则', () => {
      const form = document.createElement('form');
      form.className = 'monitor-mask';
      const childSpan = document.createElement('span');
      childSpan.textContent = '420102199001011234';
      form.appendChild(childSpan);
      container.appendChild(form);

      expect(isElementMasked(childSpan)).toBe(true);
      expect(sanitizeDomText(childSpan).text).toBe('******');
    });

    it('常规非敏感节点应当安全提取文本与输入值且不掩码', () => {
      const normalBtn = document.createElement('button');
      normalBtn.textContent = '提交订单';
      container.appendChild(normalBtn);

      expect(isElementMasked(normalBtn)).toBe(false);
      const result = sanitizeDomText(normalBtn);
      expect(result.isMasked).toBe(false);
      expect(result.text).toBe('提交订单');
    });

    it('支持扩展自定义选择器', () => {
      const customEl = document.createElement('div');
      customEl.className = 'my-secret-box';
      customEl.textContent = 'CreditCardNumber';
      container.appendChild(customEl);

      expect(isElementMasked(customEl, ['.my-secret-box'])).toBe(true);
      expect(sanitizeDomText(customEl, ['.my-secret-box']).text).toBe('******');
    });

    it('在无 document 或 Node/SSR 宿主环境下应当安全防御且不抛异常', () => {
      const mockElement = {
        matches: () => false,
        parentElement: null,
      } as unknown as Element;

      expect(isElementMasked(mockElement)).toBe(false);
      expect(sanitizeDomText(mockElement).isMasked).toBe(false);
    });
  });
});
