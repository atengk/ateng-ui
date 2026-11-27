/**
 * 安全模块纯原生 WebCrypto 与编码辅助原语。
 *
 * 严格保持零第三方加密库依赖，兼容现代浏览器与 Node.js 20+ 运行时。
 *
 * @author Ateng
 * @since 2026-11-27
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

const KEY_CACHE_MAX_SIZE = 64;
const rsaPublicKeyCache = new Map<string, CryptoKey>();
const rsaPrivateKeyCache = new Map<string, CryptoKey>();

/**
 * 获取当前运行时的原生 WebCrypto 实例。
 */
export function getWebCrypto(): Crypto {
  const current =
    typeof crypto !== 'undefined' ? crypto : (globalThis as { crypto?: Crypto }).crypto;
  if (!current) {
    throw new Error('WebCrypto is not available in the current runtime environment');
  }
  return current;
}

/**
 * 获取当前运行时的原生 WebCrypto SubtleCrypto 实例。
 */
export function getSubtleCrypto(): SubtleCrypto {
  const subtle = getWebCrypto().subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is not available in the current runtime environment');
  }
  return subtle;
}

/**
 * 将字节数组转换为小写十六进制字符串。
 *
 * @param bytes 字节数组
 * @returns 小写十六进制字符串
 */
export function bytesToHex(bytes: Uint8Array): string {
  const hexParts: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hexParts[i] = (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return hexParts.join('');
}

/**
 * 将字节数组安全编码为标准 Base64 字符串（分块处理防调用栈溢出）。
 *
 * @param bytes 字节数组
 * @returns Base64 字符串
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    const chunkSize = 0x8000;
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      chunks.push(String.fromCharCode(...slice));
    }
    return btoa(chunks.join(''));
  }

  const bufferCtor = (
    globalThis as { Buffer?: { from(data: Uint8Array): { toString(enc: string): string } } }
  ).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString('base64');
  }

  throw new Error('Base64 encoding is not supported in the current runtime environment');
}

/**
 * 严格解码 Base64 字符串为字节数组，格式非法时立即抛出异常。
 *
 * @param raw Base64 字符串
 * @returns 解码后的字节数组
 */
export function base64ToBytes(raw: string): Uint8Array {
  const normalized = raw.trim();
  if (
    normalized.length === 0 ||
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw new Error('Invalid Base64 input');
  }

  if (typeof atob === 'function') {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const bufferCtor = (globalThis as { Buffer?: { from(data: string, enc: string): Uint8Array } })
    .Buffer;
  if (bufferCtor) {
    const buf = bufferCtor.from(normalized, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  throw new Error('Base64 decoding is not supported in the current runtime environment');
}

/**
 * 将字符串编码为 UTF-8 字节数组。
 */
export function utf8ToBytes(text: string): Uint8Array {
  return textEncoder.encode(text);
}

/**
 * 将字节数组严格解码为 UTF-8 字符串。
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

/**
 * 常量时间字符串比对，防范时序侧信道攻击。
 *
 * @param a 字符串 A
 * @param b 字符串 B
 * @returns 是否逐字节相等
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bytesA = textEncoder.encode(a);
  const bytesB = textEncoder.encode(b);
  if (bytesA.length !== bytesB.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  }
  return diff === 0;
}

/**
 * 使用原生 WebCrypto 计算字节数组的 SHA-256 原始摘要字节。
 */
export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const copy = new Uint8Array(data);
  const digest = await subtle.digest('SHA-256', copy.buffer);
  return new Uint8Array(digest);
}

/**
 * 使用原生 Web Crypto API 计算 UTF-8 字符串或字节数组的 SHA-256 十六进制摘要。
 *
 * @param message 待哈希字符串或字节数组
 * @returns 64 位小写十六进制哈希摘要
 */
export async function sha256Hex(message: string | Uint8Array): Promise<string> {
  const data = typeof message === 'string' ? textEncoder.encode(message) : message;
  const digest = await sha256Bytes(data);
  return bytesToHex(digest);
}

/**
 * 使用原生 WebCrypto 计算标准 HMAC-SHA256 摘要。
 *
 * 默认输出标准 Base64 编码（对齐后端 ateng-boot-web HmacSha256Signer.sign），
 * 可选输出小写十六进制字符串。
 *
 * @param message 待签名文本
 * @param secret 对称密钥
 * @param encoding 输出编码格式（默认 'base64'）
 * @returns HMAC-SHA256 签名字符串
 */
export async function hmacSha256(
  message: string,
  secret: string,
  encoding: 'base64' | 'hex' = 'base64',
): Promise<string> {
  if (!secret) {
    throw new Error('HMAC-SHA256 secret must not be empty');
  }
  const subtle = getSubtleCrypto();
  const keyBytes = new Uint8Array(textEncoder.encode(secret));
  const msgBytes = new Uint8Array(textEncoder.encode(message));

  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes.buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await subtle.sign('HMAC', cryptoKey, msgBytes.buffer);
  const signatureBytes = new Uint8Array(signatureBuffer);
  return encoding === 'hex' ? bytesToHex(signatureBytes) : bytesToBase64(signatureBytes);
}

/**
 * 清理 PEM 密钥文本中的头尾标记与全部空白字符。
 */
export function cleanPemKey(key: string): string {
  return key
    .replace(/-----BEGIN RSA PUBLIC KEY-----/g, '')
    .replace(/-----END RSA PUBLIC KEY-----/g, '')
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
}

/**
 * 公共 RSA-OAEP-SHA256 密钥导入与有限缓存辅助实现。
 */
async function importRsaOaepKey(
  keyPem: string,
  format: 'spki' | 'pkcs8',
  usage: 'encrypt' | 'decrypt',
  cache: Map<string, CryptoKey>,
): Promise<CryptoKey> {
  const cleaned = cleanPemKey(keyPem);
  const cached = cache.get(cleaned);
  if (cached) {
    return cached;
  }

  const subtle = getSubtleCrypto();
  const derBytes = new Uint8Array(base64ToBytes(cleaned));
  const key = await subtle.importKey(
    format,
    derBytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    [usage],
  );

  if (cache.size >= KEY_CACHE_MAX_SIZE) {
    cache.clear();
  }
  cache.set(cleaned, key);
  return key;
}

/**
 * 导入 X.509 (SPKI) RSA-OAEP-SHA256 公钥用于加密会话密钥。
 *
 * @param keyPem PEM 或纯 Base64 公钥文本
 * @returns WebCrypto CryptoKey
 */
export async function importRsaOaepPublicKey(keyPem: string): Promise<CryptoKey> {
  return importRsaOaepKey(keyPem, 'spki', 'encrypt', rsaPublicKeyCache);
}

/**
 * 导入 PKCS#8 RSA-OAEP-SHA256 私钥用于解封会话密钥。
 *
 * @param keyPem PEM 或纯 Base64 私钥文本
 * @returns WebCrypto CryptoKey
 */
export async function importRsaOaepPrivateKey(keyPem: string): Promise<CryptoKey> {
  return importRsaOaepKey(keyPem, 'pkcs8', 'decrypt', rsaPrivateKeyCache);
}

/**
 * 判定请求载荷是否为二进制或表单流式数据（FormData / Blob / ArrayBuffer / URLSearchParams / ReadableStream）。
 */
export function isBinaryRequestData(data: unknown): boolean {
  if (data === null || data === undefined) {
    return false;
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return true;
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return true;
  }
  if (typeof ArrayBuffer !== 'undefined') {
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      return true;
    }
  }
  if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
    return true;
  }
  if (typeof ReadableStream !== 'undefined' && data instanceof ReadableStream) {
    return true;
  }
  return false;
}

/**
 * 判定 Axios responseType 是否为二进制或流式响应类型。
 */
export function isBinaryResponseType(responseType: unknown): boolean {
  if (typeof responseType !== 'string') {
    return false;
  }
  const normalized = responseType.trim().toLowerCase();
  return normalized === 'blob' || normalized === 'arraybuffer' || normalized === 'stream';
}

/**
 * 大小写无关读取 AxiosHeaders 或普通对象中的请求/响应头字段值。
 */
export function getHeaderIgnoreCase(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const axiosHeaders = headers as { get?: (key: string) => unknown };
  if (typeof axiosHeaders.get === 'function') {
    const val = axiosHeaders.get(name);
    if (typeof val === 'string') {
      return val;
    }
    if (typeof val === 'number') {
      return String(val);
    }
  }

  const targetLower = name.toLowerCase();
  const record = headers as Record<string, unknown>;
  for (const [k, v] of Object.entries(record)) {
    if (k.toLowerCase() === targetLower) {
      if (typeof v === 'string') {
        return v;
      }
      if (typeof v === 'number') {
        return String(v);
      }
      if (Array.isArray(v) && v.length > 0) {
        return String(v[0]);
      }
    }
  }

  return undefined;
}

/**
 * 将请求/响应头对象归一化为小写键名平铺字典，便于传递给外部回调。
 */
export function normalizeHeadersRecord(headers: unknown): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  if (!headers || typeof headers !== 'object') {
    return result;
  }

  const maybeToJson = headers as { toJSON?: () => Record<string, unknown> };
  const source =
    typeof maybeToJson.toJSON === 'function'
      ? maybeToJson.toJSON()
      : (headers as Record<string, unknown>);

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      result[key] = value;
      result[key.toLowerCase()] = value;
    } else if (typeof value === 'number') {
      const str = String(value);
      result[key] = str;
      result[key.toLowerCase()] = str;
    }
  }
  return result;
}
