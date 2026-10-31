/**
 * 监控遥测唯一标识符生成工具。
 *
 * @author Ateng
 * @since 2026-10-31
 */

/**
 * 生成符合 UUID v4 格式的随机字符串。
 * 优先采用 Web Crypto API，若环境受限则优雅降级为时间戳与随机数字符串。
 *
 * @returns 规范化的唯一标识符
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // 降级生成伪随机 UUID
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
