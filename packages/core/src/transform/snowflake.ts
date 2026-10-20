/**
 * 雪花 Long ID 大数防截断管道与 JSON 序列化工具。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 匹配 JSON 字符串字面量或未加双引号的 16 位及以上长整数字符。
 *
 * 第一捕获组 `("([^"\\]|\\.)*")` 匹配完整的 JSON 字符串字面量（含转义双引号），
 * 匹配到的字符串原样返回，防止误修改已有字符串内部的长数字；
 * 第二捕获组 `(?<=[:\[,]\s*)(-?[0-9]{16,})(?=\s*[,\]\}])` 精准匹配在对象属性值或数组元素中未加引号的长数字。
 */
const SNOWFLAKE_REGEX = /("([^"\\]|\\.)*")|(?<=[:[,]\s*)(-?[0-9]{16,})(?=\s*[,\]}])/g;

/**
 * 将原始 JSON 文本中的 16 位以上无引号大数转换为带双引号的字符串格式。
 *
 * @param jsonText 待处理的原始 JSON 文本
 * @returns 处理后带有引号的 JSON 文本
 */
export function stringifySnowflakeInJsonText(jsonText: string): string {
  if (typeof jsonText !== 'string' || jsonText.length === 0) {
    return jsonText;
  }

  // 针对根节点裸返回 16 位以上大整数的场景，快速防截断包装
  if (/^\s*-?[0-9]{16,}\s*$/.test(jsonText)) {
    return `"${jsonText.trim()}"`;
  }

  return jsonText.replace(
    SNOWFLAKE_REGEX,
    (_match: string, stringLiteral?: string, _sub?: string, bigNum?: string) => {
      if (stringLiteral !== undefined) {
        return stringLiteral;
      }
      return `"${bigNum}"`;
    },
  );
}

/**
 * 将包含雪花 Long ID 大数的原始 JSON 文本安全解析为泛型对象。
 *
 * @param jsonText 原始 JSON 字符串
 * @returns 解析后的 JavaScript 实体，超大长整数将安全保留为 string
 */
export function parseSnowflakeJson<T = unknown>(jsonText: string): T {
  const safeText = stringifySnowflakeInJsonText(jsonText);
  return JSON.parse(safeText) as T;
}

/**
 * Axios 响应数据转换器（transformResponse 适配器）。
 *
 * 在反序列化原始数据前对 16 位以上雪花大数加引号，随后调用原生 JSON.parse；
 * 若传入非字符串或非合规 JSON 则防御性保底返回原始数据。
 *
 * @param data Axios 传入的原始 response 数据
 * @returns 解析后的对象或原始数据
 */
export function transformSnowflakeResponse(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data;
  }

  try {
    return parseSnowflakeJson(data);
  } catch {
    // 若不是有效 JSON（如 HTML、纯文本），保底返回原始字符串
    return data;
  }
}
