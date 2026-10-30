/**
 * 原生轻量 SQL 格式化美化算法与 SPI。
 *
 * 恪守 ADR-0035 与零臃肿依赖律：
 * 1. 纯原生 TypeScript 纳秒级分词归一化，零第三方重型解析器依赖；
 * 2. 具备字符串字面量与注释转义隔离保护，彻底杜绝单双引号内部 SQL 关键字被误大写或误换行；
 * 3. 规范化 SQL 核心关键字为标准大写；
 * 4. 规范化主干子句（SELECT, FROM, WHERE, GROUP BY, ORDER BY 等）换行与缩进；
 * 5. 提供可替换的 SqlFormatProvider SPI 供企业级扩展。
 *
 * @author Ateng
 * @since 2026-10-29
 */

/**
 * 外部自定义 SQL 格式化提供者 SPI。
 */
export type SqlFormatProvider = (sql: string) => string | Promise<string>;

/**
 * 必须独占主干行的大写子句关键词列表。
 */
const CLAUSE_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'UNION ALL',
  'UNION',
];

/**
 * 条件与表达式大写关键字。
 */
const INLINE_KEYWORDS = [
  'AND',
  'OR',
  'ON',
  'AS',
  'IN',
  'IS NULL',
  'IS NOT NULL',
  'LIKE',
  'BETWEEN',
  'DESC',
  'ASC',
  'COUNT',
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'COALESCE',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'DISTINCT',
  'PRIMARY KEY',
];

/**
 * 匹配字符串字面量与单行/多行注释的隔离正则。
 * 1. 单行注释: --...
 * 2. 多行注释: /*...* /
 * 3. 单引号字符串 (支持 '' 或 \' 转义)
 * 4. 双引号标识符/字符串
 * 5. 反引号标识符
 */
const LITERAL_OR_COMMENT_REGEX =
  /(--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:''|\\'|[^'])*'|"(?:""|\\"|[^"])*"|`(?:``|\\`|[^`])*`)/g;

/**
 * 原生轻量 SQL 格式化美化函数。
 *
 * @param sql 原始待排版 SQL 字符串
 * @returns 规范格式化后的 SQL 字符串
 */
export function formatSql(sql: string): string {
  if (!sql || typeof sql !== 'string') return '';

  // 1. 词法转义隔离：提取全部字符串字面量与注释至令牌表，替换为安全占位符
  const tokens: string[] = [];
  const tokenizedSql = sql.replace(LITERAL_OR_COMMENT_REGEX, match => {
    tokens.push(match);
    return `__ATENG_SQL_TOKEN_${tokens.length - 1}__`;
  });

  // 2. 规范化纯代码区域的空白字符，压缩连续空白为单空格
  let text = tokenizedSql.trim().replace(/\s+/g, ' ');

  // 3. 将所有关键字转为标准大写（仅作用于代码区，字符串内部已被占位符保护）
  const allKeywords = [...CLAUSE_KEYWORDS, ...INLINE_KEYWORDS].sort((a, b) => b.length - a.length);

  for (const kw of allKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    text = text.replace(regex, kw);
  }

  // 4. 在主干子句关键字前插入换行符
  for (const clause of CLAUSE_KEYWORDS) {
    const clauseRegex = new RegExp(`\\s*\\b(${clause})\\b\\s*`, 'g');
    text = text.replace(clauseRegex, '\n$1 ');
  }

  // 5. 处理换行与行缩进
  const rawLines = text.split('\n');
  const formattedLines: string[] = [];

  for (let line of rawLines) {
    line = line.trim();
    if (!line) continue;

    const startsWithClause = CLAUSE_KEYWORDS.some(kw => line.startsWith(kw));

    if (startsWithClause) {
      formattedLines.push(line);
    } else {
      // 字段或条件缩进 2 个空格
      formattedLines.push(`  ${line}`);
    }
  }

  let formatted = formattedLines.join('\n');

  // 6. 还原占位符为原始字符串字面量与注释（100% 原始不变）
  if (tokens.length > 0) {
    formatted = formatted.replace(/__ATENG_SQL_TOKEN_(\d+)__/g, (_, idx) => {
      const tokenIndex = Number(idx);
      return tokens[tokenIndex] ?? '';
    });
  }

  return formatted;
}
