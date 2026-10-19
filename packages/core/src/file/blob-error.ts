/**
 * Blob 二进制流双态业务异常识别与安全拦截器。
 *
 * 当请求以 responseType: 'blob' 下载文件时，若后端发生业务拦截、权限失败或抛出错误，
 * 往往返回 application/json 错误体并被包装为 Blob 二进制对象。
 * 本模块负责异步嗅探并提取该错误，将其转译为强类型 BusinessException 抛出，
 * 彻底杜绝调用方将 JSON 错误内容误当作正常文件下载落地。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { BusinessException } from '../contracts';
import { parseSnowflakeJson } from '../transform';

/**
 * 校验指定二进制响应是否为服务端 JSON 错误体。
 * 若判定为业务或 HTTP 异常，将提取解析并抛出对应的 BusinessException。
 *
 * @param data 响应数据
 * @param contentType 响应头中的 Content-Type
 * @param status HTTP 状态码
 */
export async function checkBlobForJsonError(
  data: unknown,
  contentType?: string | null,
  status?: number,
): Promise<void> {
  // 1. 若非 Blob 实体直接安全跳过
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) {
    return;
  }

  const isJsonType =
    Boolean(data.type && /application\/(?:problem\+)?json/i.test(data.type)) ||
    Boolean(contentType && /application\/(?:problem\+)?json/i.test(contentType));

  const isErrorStatus = status !== undefined && (status < 200 || status >= 300);

  // 2. 仅当明确标识为 JSON 或发生 HTTP 异常且有内容时才执行内容嗅探
  if (!isJsonType && (!isErrorStatus || data.size === 0)) {
    return;
  }

  let text = '';
  try {
    text = await data.text();
  } catch {
    // 读取流失败时不中断正常文件流
    return;
  }

  const cleanText = text.trim();
  if (!cleanText) {
    return;
  }

  // 3. 尝试以防大数截断的雪花解析器反序列化
  let parsed: unknown;
  try {
    parsed = parseSnowflakeJson(cleanText);
  } catch {
    // 若非标准 JSON 但属于 HTTP 错误状态码，抛出对应状态码异常
    if (isErrorStatus) {
      throw new BusinessException(status, cleanText || `HTTP Error ${status}`);
    }
    return;
  }

  // 4. 若为标准 Result 结构或具备 code/msg 的对象，转译为 BusinessException
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const code = typeof record.code === 'number' ? record.code : (status ?? 500);

    const msg =
      typeof record.msg === 'string'
        ? record.msg
        : typeof record.message === 'string'
          ? record.message
          : '服务端返回业务错误，已阻止下载损坏文件';

    const traceId = typeof record.traceId === 'string' ? record.traceId : undefined;
    const cause = record.data ?? record;

    throw new BusinessException(code, msg, traceId, cause);
  }
}
