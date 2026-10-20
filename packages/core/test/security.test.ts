/**
 * API 请求防重放与原生 WebCrypto 签名插件单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  DefaultRequestSigner,
  createRequestSigner,
  sha256Hex,
  generateNonce,
  defaultBuildCanonicalString,
  type SignTarget,
} from '../src/security';
import { createHttpClient } from '../src/http';

function mockAdapter(
  client: { instance: { defaults: { adapter: unknown } } },
  handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> | AxiosResponse,
) {
  client.instance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    return handler(config);
  };
}

describe('RequestSigner (API 请求防重放与原生 WebCrypto 签名插件)', () => {
  describe('1. sha256Hex 原生 WebCrypto 哈希计算', () => {
    it('应正确计算已知测试向量的 SHA-256 十六进制摘要', async () => {
      // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      const emptyHash = await sha256Hex('');
      expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

      // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      const helloHash = await sha256Hex('hello');
      expect(helloHash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('应正确处理多字节 UTF-8 字符（如中文与特殊符号）', async () => {
      const hash1 = await sha256Hex('阿腾科技-ateng-ui-2026');
      const hash2 = await sha256Hex('阿腾科技-ateng-ui-2026');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    });
  });

  describe('2. generateNonce 随机数生成器', () => {
    it('连续生成 1000 个 Nonce 应具备绝对唯一性与固定长度', () => {
      const set = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const nonce = generateNonce();
        expect(nonce).toBeDefined();
        expect(nonce.length).toBeGreaterThanOrEqual(16);
        set.add(nonce);
      }
      expect(set.size).toBe(1000);
    });
  });

  describe('3. defaultBuildCanonicalString 待签名字符串规范化', () => {
    it('应将 params 键按字典序升序排列并规范拼接', () => {
      const target: SignTarget = {
        method: 'POST',
        url: '/api/v1/orders',
        params: { z: 'last', a: 'first', m: 123 },
        data: { name: 'test' },
        timestamp: 1729411200000,
        nonce: 'nonce-123456',
      };

      const canonical = defaultBuildCanonicalString(target, 'secret-key-888');
      expect(canonical).toContain('params=a=first&m=123&z=last');
      expect(canonical).toContain('method=POST');
      expect(canonical).toContain('url=/api/v1/orders');
      expect(canonical).toContain('timestamp=1729411200000');
      expect(canonical).toContain('nonce=nonce-123456');
      expect(canonical).toContain('secret=secret-key-888');
    });

    it('应对复杂对象 data 进行稳定键排序 JSON 序列化', () => {
      const target1: SignTarget = {
        method: 'POST',
        url: '/api/test',
        data: { b: 2, a: 1 },
        timestamp: 1729411200000,
        nonce: 'nonce-1',
      };
      const target2: SignTarget = {
        method: 'POST',
        url: '/api/test',
        data: { a: 1, b: 2 },
        timestamp: 1729411200000,
        nonce: 'nonce-1',
      };

      const str1 = defaultBuildCanonicalString(target1);
      const str2 = defaultBuildCanonicalString(target2);
      expect(str1).toBe(str2);
      expect(str1).toContain('data={"a":1,"b":2}');
    });

    it('无 params 或 data 时应防御性映射为空字符串', () => {
      const target: SignTarget = {
        method: 'GET',
        url: '/api/items',
        timestamp: 1729411200000,
        nonce: 'nonce-empty',
      };

      const canonical = defaultBuildCanonicalString(target);
      expect(canonical).toContain('params=');
      expect(canonical).toContain('data=');
    });

    it('params 中若包含嵌套对象值应稳定序列化而非输出 [object Object]', () => {
      const target: SignTarget = {
        method: 'GET',
        url: '/api/query',
        params: { filter: { status: 'active', role: 'admin' } },
        timestamp: 1729411200000,
        nonce: 'nonce-obj',
      };

      const canonical = defaultBuildCanonicalString(target);
      expect(canonical).not.toContain('[object Object]');
      expect(canonical).toContain('filter={"role":admin,"status":active}');
    });
  });

  describe('4. DefaultRequestSigner 门面实现', () => {
    it('应计算正确签名并在 headers 中注入默认 Header 键名', async () => {
      const signer = new DefaultRequestSigner({
        secret: 'test-secret-123',
      });

      const target: SignTarget = {
        method: 'POST',
        url: '/api/pay',
        params: { orderId: '1001' },
        data: { amount: 9900 },
        timestamp: 1729411200000,
        nonce: 'fixed-nonce-999',
      };

      const result = await signer.sign(target);
      expect(result.signature).toHaveLength(64);
      expect(result.headers['X-Timestamp']).toBe('1729411200000');
      expect(result.headers['X-Nonce']).toBe('fixed-nonce-999');
      expect(result.headers['X-Signature']).toBe(result.signature);

      // 服务端 100% 预期一致性验证
      const expectedCanonical = defaultBuildCanonicalString(target, 'test-secret-123');
      const expectedHash = await sha256Hex(expectedCanonical);
      expect(result.signature).toBe(expectedHash);
    });

    it('应支持自定义 Header 键名、秒级时间戳与自定义 Nonce 生成器', async () => {
      const signer = createRequestSigner({
        secret: 'custom-secret',
        timestampHeader: 'App-Timestamp',
        nonceHeader: 'App-Nonce',
        signatureHeader: 'App-Signature',
        timestampUnit: 's',
        nonceGenerator: () => 'mocked-nonce-abc',
      });

      const target: SignTarget = {
        method: 'PUT',
        url: '/api/user/1',
        timestamp: 1729411200, // 假设秒级
        nonce: 'mocked-nonce-abc',
      };

      const result = await signer.sign(target);
      expect(result.headers['App-Timestamp']).toBe('1729411200');
      expect(result.headers['App-Nonce']).toBe('mocked-nonce-abc');
      expect(result.headers['App-Signature']).toBe(result.signature);
      expect(result.headers['X-Signature']).toBeUndefined();
    });

    it('应支持自定义 buildCanonicalString 规约策略', async () => {
      const customBuilder = vi.fn(
        (t: SignTarget, secret?: string) =>
          `${t.method}:${t.url}:${t.timestamp}:${t.nonce}:${secret ?? ''}`,
      );

      const signer = new DefaultRequestSigner({
        secret: 'my-secret',
        buildCanonicalString: customBuilder,
      });

      const target: SignTarget = {
        method: 'DELETE',
        url: '/api/resource/42',
        timestamp: 123456789,
        nonce: 'nonce-42',
      };

      const result = await signer.sign(target);
      expect(customBuilder).toHaveBeenCalledTimes(1);
      const expectedHash = await sha256Hex('DELETE:/api/resource/42:123456789:nonce-42:my-secret');
      expect(result.signature).toBe(expectedHash);
    });

    it('shouldSign 默认应对写操作返回 true，对读操作返回 false', () => {
      const signer = new DefaultRequestSigner();

      expect(signer.shouldSign({ method: 'POST' })).toBe(true);
      expect(signer.shouldSign({ method: 'put' })).toBe(true);
      expect(signer.shouldSign({ method: 'DELETE' })).toBe(true);
      expect(signer.shouldSign({ method: 'patch' })).toBe(true);

      expect(signer.shouldSign({ method: 'GET' })).toBe(false);
      expect(signer.shouldSign({ method: 'HEAD' })).toBe(false);
      expect(signer.shouldSign({ method: 'OPTIONS' })).toBe(false);
    });
  });

  describe('5. HttpClient 拦截器管道与 RequestSigner 联动集成', () => {
    it('写操作请求应自动被拦截器注入签名请求头', async () => {
      const signer = new DefaultRequestSigner({
        secret: 'integration-secret',
      });

      const client = createHttpClient({
        signer,
      });

      let capturedHeaders: Record<string, string> | undefined;

      mockAdapter(client, async config => {
        capturedHeaders = config.headers as unknown as Record<string, string>;
        return {
          data: { code: 200, msg: 'success', data: { ok: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      await client.post('/api/orders', { price: 100 });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders?.['X-Timestamp']).toBeDefined();
      expect(capturedHeaders?.['X-Nonce']).toBeDefined();
      expect(capturedHeaders?.['X-Signature']).toBeDefined();
      expect(capturedHeaders?.['X-Signature']).toHaveLength(64);
    });

    it('GET 请求默认不注入签名，但显式声明 sign: true 时应强制注入', async () => {
      const signer = new DefaultRequestSigner({
        secret: 'integration-secret',
      });

      const client = createHttpClient({
        signer,
      });

      let capturedHeaders: Record<string, string> | undefined;

      mockAdapter(client, async config => {
        capturedHeaders = config.headers as unknown as Record<string, string>;
        return {
          data: { code: 200, msg: 'success', data: { list: [] } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      // 1. 普通 GET 请求默认不签名
      await client.get('/api/users');
      expect(capturedHeaders?.['X-Signature']).toBeUndefined();

      // 2. 显式开启 sign: true 时触发签名注入
      await client.get('/api/users', { sign: true });
      expect(capturedHeaders?.['X-Signature']).toBeDefined();
    });

    it('POST 请求显式声明 sign: false 时应跳过签名', async () => {
      const signer = new DefaultRequestSigner({
        secret: 'integration-secret',
      });

      const client = createHttpClient({
        signer,
      });

      let capturedHeaders: Record<string, string> | undefined;

      mockAdapter(client, async config => {
        capturedHeaders = config.headers as unknown as Record<string, string>;
        return {
          data: { code: 200, msg: 'success', data: { skipped: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      await client.post('/api/test', { a: 1 }, { sign: false });
      expect(capturedHeaders?.['X-Signature']).toBeUndefined();
    });
  });
});
