/**
 * 错误指纹生成与特征哈希提取工具。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { ErrorPayload } from '../types/event';

/**
 * 基于 FNV-1a 算法计算确定性 32 位整型哈希，并输出 8 位 16 进制字符串。
 * 纯 TypeScript 原生实现，离线确定性自洽。
 *
 * @param str 输入原始字符串
 * @returns 8 位十六进制哈希特征码
 */
export function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 清洗调用堆栈，去除绝对本地路径、动态 Chunk Hash 与行号微小偏差，提取稳定的结构化特征。
 *
 * @param stack 原始堆栈文本
 * @returns 规整后的堆栈特征文本
 */
export function cleanStack(stack?: string): string {
  if (!stack || typeof stack !== 'string') {
    return '';
  }

  // 1. 按行拆分，过滤前 5 行关键帧
  const lines = stack
    .split('\n')
    .slice(0, 5)
    .map(line => line.trim());

  // 2. 剥离绝对 URL、文件路径查询参数以及行号/列号
  const cleanedLines = lines.map(line => {
    return line
      .replace(/https?:\/\/[^\s)]+/g, '') // 剥离 http(s) URL
      .replace(/\?[^:\s)]+/g, '') // 剥离 query 参数
      .replace(/:\d+:\d+/g, '') // 剥离行号与列号
      .replace(/webpack-internal:\/\/\//g, '')
      .replace(/node_modules\//g, '');
  });

  return cleanedLines.join('|');
}

/**
 * 为异常事件载荷计算确定性特征指纹 (Fingerprint)。
 *
 * @param payload 异常载荷实体
 * @returns 唯一错误指纹字符串
 */
export function generateErrorFingerprint(payload: Partial<ErrorPayload>): string {
  const name = payload.name || 'Error';
  const message = payload.message || '';
  const cleaned = cleanStack(payload.stack);
  const location = `${payload.filename || ''}:${payload.lineno || ''}`;

  const rawSeed = `${name}::${message}::${cleaned || location}`;
  return hashString(rawSeed);
}
