/**
 * @atengk/form-designer-vue 零 eval 轻量安全算术 AST 解释器 (SafeMathEvaluator)。
 *
 * 遵循 ADR-0044 规约，彻底杜绝 eval 与 new Function，100% 免疫 CSP 拦截与 XSS 注入风险；
 * 基于词法分词与递归下降语法分析，安全解析多级运算符优先级、圆括号嵌套、路径变量插值与基础数学函数。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { getByPath } from '../utils/path';

/**
 * 标记类型枚举。
 */
type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

/**
 * 词法标记实体。
 */
interface Token {
  type: TokenType;
  value: string | number;
}

/**
 * 高危关键字与原型链属性黑名单（全部转小写比对）。
 */
const FORBIDDEN_IDENTIFIERS = new Set([
  'window',
  'document',
  'globalthis',
  'global',
  'process',
  '__proto__',
  'prototype',
  'constructor',
  'function',
  'eval',
  'settimeout',
  'setinterval',
  'fetch',
  'xmlhttprequest',
  'alert',
  'prompt',
  'confirm',
  'location',
  'cookie',
  'localstorage',
  'sessionstorage',
  'indexeddb',
]);

/**
 * 安全内置数学函数白名单。
 */
const SAFE_MATH_FUNCS: Record<string, (...args: number[]) => number> = {
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
};

export class SafeMathEvaluator {
  /**
   * 安全计算数学算术表达式。
   *
   * @param expression 算术公式字符串（如 "price * count * (1 - discount)"）
   * @param context 变量上下文数据源（通常为 formData）
   * @returns 计算所得纯数值，若语法非法或存在注入风险则安全返回 0
   */
  public static evaluate(
    expression: string | number | undefined | null,
    context: Record<string, unknown> = {},
  ): number {
    if (expression == null) {
      return 0;
    }
    if (typeof expression === 'number') {
      return isNaN(expression) ? 0 : expression;
    }

    const raw = String(expression).trim();
    if (raw === '') {
      return 0;
    }

    // 1. 字符级白名单快速安全前置防御（严禁引号、分号、赋值号、模板字符串等）
    if (/[^0-9a-zA-Z_$.()+\-*/%,\s[\]]/.test(raw)) {
      return 0;
    }

    try {
      // 2. 词法分词 (Tokenize)
      const tokens = SafeMathEvaluator.tokenize(raw);
      if (tokens.length === 0 || tokens[0]?.type === 'EOF') {
        return 0;
      }

      // 3. 语法分析与递归下降求值 (Parser)
      const evaluator = new SafeMathEvaluator(tokens, context);
      const result = evaluator.parseExpression();

      // 4. 浮点数防噪与有效性校验
      if (isNaN(result) || !isFinite(result)) {
        return 0;
      }
      return Number(result.toFixed(10));
    } catch {
      // 捕获任意语法或语义异常，防御性降级返回 0
      return 0;
    }
  }

  private current = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: Record<string, unknown>,
  ) {}

  /**
   * 词法分词器。
   */
  private static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = input.length;

    while (i < len) {
      const char = input[i];
      if (!char) {
        i++;
        continue;
      }

      // 跳过空白字符
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // 数字（支持整数与小数）
      const nextChar = i + 1 < len ? input[i + 1] : undefined;
      if (/[0-9]/.test(char) || (char === '.' && nextChar && /[0-9]/.test(nextChar))) {
        let numStr = '';
        while (i < len) {
          const c = input[i];
          if (c && (/[0-9]/.test(c) || c === '.')) {
            numStr += c;
            i++;
          } else {
            break;
          }
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // 标点与四则运算符
      if (char === '+') {
        tokens.push({ type: 'PLUS', value: '+' });
        i++;
        continue;
      }
      if (char === '-') {
        tokens.push({ type: 'MINUS', value: '-' });
        i++;
        continue;
      }
      if (char === '*') {
        tokens.push({ type: 'STAR', value: '*' });
        i++;
        continue;
      }
      if (char === '/') {
        tokens.push({ type: 'SLASH', value: '/' });
        i++;
        continue;
      }
      if (char === '%') {
        tokens.push({ type: 'PERCENT', value: '%' });
        i++;
        continue;
      }
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }

      // 标识符（变量路径或函数名，如 order.items[0].price, min, max）
      if (/[a-zA-Z_$]/.test(char)) {
        let ident = '';
        while (i < len) {
          const c = input[i];
          if (c && /[a-zA-Z0-9_$.[\]]/.test(c)) {
            ident += c;
            i++;
          } else {
            break;
          }
        }

        // 黑名单与原型链安全审计
        const lowerIdent = ident.toLowerCase();
        for (const forbidden of FORBIDDEN_IDENTIFIERS) {
          if (lowerIdent.includes(forbidden)) {
            // 发现恶意注入特征，抛出阻断异常
            throw new Error(
              `Security Exception: Access to forbidden property "${ident}" is blocked.`,
            );
          }
        }

        tokens.push({ type: 'IDENTIFIER', value: ident });
        continue;
      }

      // 非法字符，终止
      throw new Error(`Syntax Error: Unexpected character "${char}"`);
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  /**
   * 获取当前 Token。
   */
  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '' };
  }

  /**
   * 消费一个指定类型的 Token。
   */
  private consume(expectedType?: TokenType): Token {
    const token = this.peek();
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Syntax Error: Expected ${expectedType}, but got ${token.type}`);
    }
    this.current++;
    return token;
  }

  /**
   * 表达式入口：解析加减算式。
   */
  private parseExpression(): number {
    return this.parseAdditive();
  }

  /**
   * 加法与减法解析 (优先级最低)。
   */
  private parseAdditive(): number {
    let left = this.parseMultiplicative();

    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.consume().type;
      const right = this.parseMultiplicative();
      if (op === 'PLUS') {
        left += right;
      } else {
        left -= right;
      }
    }

    return left;
  }

  /**
   * 乘法、除法与取模解析 (优先级中等)。
   */
  private parseMultiplicative(): number {
    let left = this.parseUnary();

    while (
      this.peek().type === 'STAR' ||
      this.peek().type === 'SLASH' ||
      this.peek().type === 'PERCENT'
    ) {
      const op = this.consume().type;
      const right = this.parseUnary();
      if (op === 'STAR') {
        left *= right;
      } else if (op === 'SLASH') {
        // 除以零防御
        left = right === 0 ? 0 : left / right;
      } else if (op === 'PERCENT') {
        left = right === 0 ? 0 : left % right;
      }
    }

    return left;
  }

  /**
   * 一元正负号解析。
   */
  private parseUnary(): number {
    if (this.peek().type === 'PLUS') {
      this.consume();
      return this.parseUnary();
    }
    if (this.peek().type === 'MINUS') {
      this.consume();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  /**
   * 基础因子解析 (数字、括号嵌套、变量插值、内置函数)。
   */
  private parsePrimary(): number {
    const token = this.peek();

    // 1. 常量数值
    if (token.type === 'NUMBER') {
      this.consume();
      return typeof token.value === 'number' ? token.value : parseFloat(String(token.value));
    }

    // 2. 括号嵌套表达式
    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const val = this.parseExpression();
      this.consume('RPAREN');
      return val;
    }

    // 3. 标识符（变量或函数）
    if (token.type === 'IDENTIFIER') {
      const identToken = this.consume('IDENTIFIER');
      const identStr = String(identToken.value);

      // 若紧跟左括号，说明为函数调用
      if (this.peek().type === 'LPAREN') {
        this.consume('LPAREN');
        const args: number[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.peek().type === 'COMMA') {
            this.consume('COMMA');
            args.push(this.parseExpression());
          }
        }
        this.consume('RPAREN');

        const fn = SAFE_MATH_FUNCS[identStr.toLowerCase()];
        if (fn) {
          return fn(...args);
        }
        // 未知或非白名单函数，安全返回 0
        return 0;
      }

      // 变量取值：从上下文依据路径深层解析
      const rawVal = getByPath(this.context, identStr);
      if (rawVal == null || rawVal === '') {
        return 0;
      }
      const numVal = Number(rawVal);
      return isNaN(numVal) ? 0 : numVal;
    }

    throw new Error(`Syntax Error: Unexpected token "${token.type}"`);
  }
}
