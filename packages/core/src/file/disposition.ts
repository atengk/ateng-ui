/**
 * HTTP 响应头 Content-Disposition 文件名提取与 UTF-8 规范化解码器。
 *
 * 遵循 RFC 6266 与 RFC 5987 国际标准，优先解析 filename*=UTF-8''... 规范编码，
 * 并支持传统引号与无引号 filename 格式及防崩溃容错降级。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 安全 URL 解码，若遭遇非标字符或格式异常则回退原串，严禁抛出 URIError。
 */
function safeDecodeUriComponent(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * 尝试从指定正则表达式中提取文件名候选并安全解码。
 */
function extractAndDecode(content: string, regex: RegExp): string | null {
  const match = content.match(regex);
  if (!match) {
    return null;
  }
  let raw = (match[2] ?? match[1])?.trim();
  if (!raw) {
    return null;
  }
  // 清洗可能存在的冗余引号包裹
  raw = raw.replace(/^["']|["']$/g, '').trim();
  const decoded = safeDecodeUriComponent(raw);
  // 剥离路径前缀以防御目录穿越
  const sanitized = decoded.replace(/^.*[/\\]/, '').trim();
  return sanitized || null;
}

/**
 * 从 HTTP 响应头 Content-Disposition 中提取文件名。
 *
 * @param disposition Content-Disposition 响应头字符串
 * @param fallbackFilename 未能提取到文件名时的保底名称，默认为 'download'
 * @returns 解析并解码后的文件名
 */
export function parseContentDispositionFilename(
  disposition?: string | null,
  fallbackFilename: string = 'download',
): string {
  if (!disposition || typeof disposition !== 'string') {
    return fallbackFilename;
  }

  const trimmed = disposition.trim();
  if (!trimmed) {
    return fallbackFilename;
  }

  // 1. 优先匹配 RFC 5987 / RFC 6266 标准的 filename*=UTF-8'lang'filename-par (语言标签可选)
  const rfc5987Name = extractAndDecode(
    trimmed,
    /filename\*\s*=\s*UTF-8'([a-zA-Z0-9_-]*)'([^;\n]+)/i,
  );
  if (rfc5987Name) {
    return rfc5987Name;
  }

  // 2. 匹配双引号包裹的标准普通文件名 filename="..."
  const quotedName = extractAndDecode(trimmed, /filename\s*=\s*"([^"]+)"/i);
  if (quotedName) {
    return quotedName;
  }

  // 3. 匹配无引号的普通文件名 filename=...
  const rawName = extractAndDecode(trimmed, /filename\s*=\s*([^; ]+)/i);
  if (rawName) {
    return rawName;
  }

  // 4. 未提取到有效文件名时回退保底
  return fallbackFilename;
}
