import { describe, it, expect } from 'vitest';
import { parseSnowflakeJson, transformSnowflakeResponse } from '../src/index';

describe('Snowflake Long ID Invariant (Issue #3)', () => {
  it('demonstrates JavaScript Number.MAX_SAFE_INTEGER precision loss in native JSON.parse', () => {
    const rawJson = '{"id": 9007199254740993}';
    const parsedNative = JSON.parse(rawJson);
    // 原生 V8 浮点数解析会丢失精度，9007199254740993 被截断为 9007199254740992
    expect(parsedNative.id.toString()).not.toBe('9007199254740993');
    expect(parsedNative.id.toString()).toBe('9007199254740992');
  });

  describe('parseSnowflakeJson', () => {
    it('should parse 16+ digit numbers as string to preserve precision', () => {
      const rawJson = '{"id": 9007199254740993, "snowflakeId": 1827364528192837465}';

      const result = parseSnowflakeJson<{ id: string; snowflakeId: string }>(rawJson);

      expect(typeof result.id).toBe('string');
      expect(result.id).toBe('9007199254740993');
      expect(typeof result.snowflakeId).toBe('string');
      expect(result.snowflakeId).toBe('1827364528192837465');
    });

    it('should correctly handle max int64 value (9223372036854775807)', () => {
      const rawJson = '{"maxInt64": 9223372036854775807}';
      const result = parseSnowflakeJson<{ maxInt64: string }>(rawJson);

      expect(result.maxInt64).toBe('9223372036854775807');
    });

    it('should parse arrays containing snowflake IDs as string array', () => {
      const rawJson = '{"ids": [9007199254740993, 9007199254740994, 9007199254740995]}';
      const result = parseSnowflakeJson<{ ids: string[] }>(rawJson);

      expect(result.ids).toEqual(['9007199254740993', '9007199254740994', '9007199254740995']);
    });

    it('should NOT alter numbers smaller than 16 digits or float numbers', () => {
      const rawJson = '{"code": 200, "total": 150, "price": 99.85, "smallId": 123456789012345}';
      const result = parseSnowflakeJson<{
        code: number;
        total: number;
        price: number;
        smallId: number;
      }>(rawJson);

      expect(typeof result.code).toBe('number');
      expect(result.code).toBe(200);
      expect(typeof result.total).toBe('number');
      expect(result.total).toBe(150);
      expect(typeof result.price).toBe('number');
      expect(result.price).toBe(99.85);
      expect(typeof result.smallId).toBe('number');
      expect(result.smallId).toBe(123456789012345);
    });

    it('should NOT corrupt numbers inside string literals or already quoted IDs', () => {
      const rawJson = JSON.stringify({
        orderDesc: '订单号: 9007199254740993 已成功支付',
        quotedId: '9007199254740993',
      });

      const result = parseSnowflakeJson<{ orderDesc: string; quotedId: string }>(rawJson);

      expect(result.orderDesc).toBe('订单号: 9007199254740993 已成功支付');
      expect(result.quotedId).toBe('9007199254740993');
    });

    it('should handle negative big numbers correctly', () => {
      const rawJson = '{"negId": -9007199254740993}';
      const result = parseSnowflakeJson<{ negId: string }>(rawJson);

      expect(result.negId).toBe('-9007199254740993');
    });

    it('should handle nested objects with snowflake IDs', () => {
      const rawJson = '{"user": {"profile": {"id": 1827364528192837465, "name": "ateng"}}}';
      const result = parseSnowflakeJson<{
        user: { profile: { id: string; name: string } };
      }>(rawJson);

      expect(result.user.profile.id).toBe('1827364528192837465');
      expect(result.user.profile.name).toBe('ateng');
    });
  });

  describe('transformSnowflakeResponse (Axios transformResponse adapter)', () => {
    it('should transform raw JSON response string with snowflake defense', () => {
      const rawText = '{"code": 200, "data": {"id": 9007199254740993}, "msg": "success"}';
      const transformed = transformSnowflakeResponse(rawText);

      expect(transformed).toEqual({
        code: 200,
        data: { id: '9007199254740993' },
        msg: 'success',
      });
    });

    it('should pass through non-string data (e.g. Blob, ArrayBuffer, object) untouched', () => {
      const obj = { alreadyParsed: true };
      expect(transformSnowflakeResponse(obj)).toBe(obj);

      const num = 123;
      expect(transformSnowflakeResponse(num)).toBe(num);

      expect(transformSnowflakeResponse(null)).toBeNull();
      expect(transformSnowflakeResponse(undefined)).toBeUndefined();
    });

    it('should safely return original string if it is not valid JSON', () => {
      const rawHtml = '<html><body>Not JSON</body></html>';
      expect(transformSnowflakeResponse(rawHtml)).toBe(rawHtml);
    });
  });
});
