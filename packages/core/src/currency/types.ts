/**
 * 金融级货币高精度运算与格式化类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

/**
 * 货币格式化配置项。
 */
export interface CurrencyFormatOptions {
  /**
   * 货币符号前缀，如 '¥'、'$'。默认为空。
   */
  symbol?: string;

  /**
   * 保留小数位数，默认为 2。
   */
  precision?: number;

  /**
   * 千分位分隔符，默认为 ','。
   */
  thousandSeparator?: string;

  /**
   * 小数点分隔符，默认为 '.'。
   */
  decimalSeparator?: string;

  /**
   * 负数展示格式：
   * - 'minus': 标准负号前缀，如 '-¥1,234.56'
   * - 'parentheses': 会计括号，如 '(¥1,234.56)'
   * 默认为 'minus'。
   */
  negativePattern?: 'minus' | 'parentheses';

  /**
   * 输入值是否以“分”为单位。若为 true，自动先将分转换为元再进行格式化。
   */
  fromCents?: boolean;
}
