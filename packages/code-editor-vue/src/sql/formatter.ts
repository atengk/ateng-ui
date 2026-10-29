/**
 * 原生轻量 SQL 格式化美化算法与 SPI。
 *
 * 恪守 ADR-0035 与零臃肿依赖律：
 * 1. 纯原生 TypeScript 纳秒级正则词法归一化，零第三方依赖；
 * 2. 规范化 SQL 核心关键字为标准大写；
 * 3. 规范化主干子句（SELECT, FROM, WHERE, GROUP BY, ORDER BY 等）换行与缩进；
 * 4. 提供可替换的 SqlFormatProvider SPI 供企业级扩展。
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
 * 原生轻量 SQL 格式化美化函数。
 *
 * @param sql 原始待排版 SQL 字符串
 * @returns 规范格式化后的 SQL 字符串
 */
export function formatSql(sql: string): string {
  if (!sql || typeof sql !== 'string') return '';

  // 1. 规范化空白字符，压缩连续空格为单空格
  let text = sql.trim().replace(/\s+/g, ' ');

  // 2. 将所有关键字转为标准大写
  const allKeywords = [...CLAUSE_KEYWORDS, ...INLINE_KEYWORDS].sort((a, b) => b.length - a.length);

  for (const kw of allKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    text = text.replace(regex, kw);
  }

  // 3. 在主干子句关键字前插入换行符
  for (const clause of CLAUSE_KEYWORDS) {
    const clauseRegex = new RegExp(`\\s*\\b(${clause})\\b\\s*`, 'g');
    text = text.replace(clauseRegex, '\n$1 ');
  }

  // 4. 处理换行与行缩进
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

  return formattedLines.join('\n');
}
