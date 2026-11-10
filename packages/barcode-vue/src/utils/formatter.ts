/**
 * 一维条码肉眼防错展示格式化管道工具集。
 *
 * 在不改变条形码实际机器激光扫描数据的前提下，将底部展示文本按段落空格或短横线分组，
 * 极大降低仓储物流与车间现场人工肉眼核对物料批次、串码时的串行看错失误率。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/**
 * 将 13 位 EAN-13 格式化为国际标准的 1-6-6 结构：
 * 首位前缀区码 + 6 位厂商代码 + 6 位商品及校验码。
 * 例如：6901234567892 -> "6 901234 567892"
 *
 * @param code 原始 12 或 13 位纯数字
 * @returns 格式化后的文本
 */
export function formatEan13(code: string): string {
  const clean = code.replace(/\s+/g, '');
  if (clean.length === 13 || clean.length === 12) {
    return `${clean.slice(0, 1)} ${clean.slice(1, 7)} ${clean.slice(7)}`;
  }
  return code;
}

/**
 * 将 14 位 ITF-14 外箱储运条码格式化为 1-2-5-5-1 标准包装分组：
 * 包装指示符 + 厂商代码 + 商品代码 + 校验码。
 * 例如：10012345678902 -> "1 00 12345 67890 2"
 *
 * @param code 原始 14 位纯数字
 * @returns 格式化后的文本
 */
export function formatItf14(code: string): string {
  const clean = code.replace(/\s+/g, '');
  if (clean.length === 14) {
    return `${clean.slice(0, 1)} ${clean.slice(1, 3)} ${clean.slice(3, 8)} ${clean.slice(8, 13)} ${clean.slice(13)}`;
  }
  return code;
}

/**
 * 将通用一维码字符串按固定步长（默认 4 位）分块加空格：
 * 例如：ATENG-WMS-20261110 -> "ATEN G-WM S-20 2611 10"
 *
 * @param code 原始条码文本
 * @param chunkSize 分组块长度，默认 4
 * @returns 格式化后的文本
 */
export function formatCode128Grouped(code: string, chunkSize = 4): string {
  if (chunkSize <= 0) return code;
  const chunks: string[] = [];
  for (let i = 0; i < code.length; i += chunkSize) {
    chunks.push(code.slice(i, i + chunkSize));
  }
  return chunks.join(' ');
}

/**
 * 将 13 位纯数字格式化为标准国际书号 ISBN-13 分组结构：
 * 前缀 (978/979) + 国家出版组号 + 出版社号 + 书序号 + 校验码。
 * 例如：9787123456789 -> "978-7-123-45678-9"
 *
 * @param code 原始 13 位图书条码
 * @returns 格式化后的书号文本
 */
export function formatIsbn(code: string): string {
  const clean = code.replace(/[-\s]+/g, '');
  if (clean.length === 13) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}-${clean.slice(4, 7)}-${clean.slice(7, 12)}-${clean.slice(12)}`;
  }
  return code;
}
