/**
 * 富文本完整 HTML 文档生成与离线导出工具。
 *
 * 提供独立、自洽、开箱即用的离线 HTML 页面渲染方案，无需任何外部网络依赖。
 *
 * @author Ateng
 * @since 2026-10-30
 */

/**
 * 完整 HTML 文档生成配置选项。
 */
export interface FullHtmlOptions {
  /**
   * 网页标题，默认为“富文本文档”。
   */
  title?: string;

  /**
   * 页面字符编码，默认 "UTF-8"。
   */
  charset?: string;

  /**
   * 文档语言标识，默认 "zh-CN"。
   */
  lang?: string;

  /**
   * 是否注入内联排版与代码高亮样式表，默认 true。
   */
  includeStyles?: boolean;

  /**
   * 用户追加的自定义 CSS 样式规则。
   */
  extraCss?: string;

  /**
   * 主题模式："light" | "dark" | "auto"，默认 "auto"（跟随系统）。
   */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * 独立离线 HTML 文档基础排版 CSS 样式。
 */
const DEFAULT_DOCUMENT_CSS = `
:root {
  --at-export-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --at-export-bg: #ffffff;
  --at-export-text: #1f2328;
  --at-export-border: #d0d7de;
  --at-export-code-bg: #f6f8fa;
  --at-export-code-text: #24292f;
  --at-export-quote-border: #0969da;
  --at-export-quote-text: #57606a;
  --at-export-table-head: #f6f8fa;
  --at-export-mark-bg: #fff8c5;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --at-export-bg: #0d1117;
    --at-export-text: #e6edf3;
    --at-export-border: #30363d;
    --at-export-code-bg: #161b22;
    --at-export-code-text: #c9d1d9;
    --at-export-quote-border: #2f81f7;
    --at-export-quote-text: #8b949e;
    --at-export-table-head: #161b22;
    --at-export-mark-bg: #bb800940;
  }
}

:root[data-theme="dark"] {
  --at-export-bg: #0d1117;
  --at-export-text: #e6edf3;
  --at-export-border: #30363d;
  --at-export-code-bg: #161b22;
  --at-export-code-text: #c9d1d9;
  --at-export-quote-border: #2f81f7;
  --at-export-quote-text: #8b949e;
  --at-export-table-head: #161b22;
  --at-export-mark-bg: #bb800940;
}

body {
  margin: 0;
  padding: 40px 24px;
  background-color: var(--at-export-bg);
  color: var(--at-export-text);
  font-family: var(--at-export-font);
  font-size: 16px;
  line-height: 1.68;
  -webkit-font-smoothing: antialiased;
}

.at-document-container {
  max-width: 900px;
  margin: 0 auto;
  word-break: break-word;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.35;
}

h1 { font-size: 2em; border-bottom: 1px solid var(--at-export-border); padding-bottom: 8px; }
h2 { font-size: 1.5em; border-bottom: 1px solid var(--at-export-border); padding-bottom: 6px; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.05em; }

p {
  margin: 12px 0;
}

blockquote {
  margin: 16px 0;
  padding: 8px 16px;
  border-left: 4px solid var(--at-export-quote-border);
  color: var(--at-export-quote-text);
  background-color: var(--at-export-code-bg);
  border-radius: 0 4px 4px 0;
}

mark {
  background-color: var(--at-export-mark-bg);
  color: inherit;
  padding: 2px 4px;
  border-radius: 2px;
}

code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.9em;
  background-color: var(--at-export-code-bg);
  color: var(--at-export-code-text);
  padding: 2px 6px;
  border-radius: 4px;
}

pre {
  background-color: var(--at-export-code-bg);
  color: var(--at-export-code-text);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.5;
}

pre code {
  background: none;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 20px 0;
  display: table;
}

table th, table td {
  border: 1px solid var(--at-export-border);
  padding: 10px 14px;
  text-align: left;
}

table th {
  background-color: var(--at-export-table-head);
  font-weight: 600;
}

ul, ol {
  padding-left: 28px;
  margin: 12px 0;
}

li {
  margin: 4px 0;
}

ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

hr {
  border: none;
  border-top: 1px solid var(--at-export-border);
  margin: 24px 0;
}
`.trim();

/**
 * 将 HTML 文本片段包裹为完整自洽的 HTML 网页文档。
 *
 * @param content HTML 片段内容
 * @param options 文档生成配置选项
 * @returns 完整的 HTML 文档字符串
 */
export function generateFullHtml(content: string, options: FullHtmlOptions = {}): string {
  const {
    title = '富文本文档',
    charset = 'UTF-8',
    lang = 'zh-CN',
    includeStyles = true,
    extraCss = '',
    theme = 'auto',
  } = options;

  const themeAttr = theme !== 'auto' ? ` data-theme="${theme}"` : '';

  let styleTag = '';
  if (includeStyles) {
    const combinedCss = extraCss ? `${DEFAULT_DOCUMENT_CSS}\n${extraCss}` : DEFAULT_DOCUMENT_CSS;
    styleTag = `\n  <style>\n${combinedCss}\n  </style>`;
  } else if (extraCss) {
    styleTag = `\n  <style>\n${extraCss}\n  </style>`;
  }

  return `<!DOCTYPE html>
<html lang="${lang}"${themeAttr}>
<head>
  <meta charset="${charset}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlTitle(title)}</title>${styleTag}
</head>
<body>
  <article class="at-document-container">
${content}
  </article>
</body>
</html>`;
}

/**
 * 针对 HTML title 标签内容的轻量安全转义。
 */
function escapeHtmlTitle(title: string): string {
  return title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
