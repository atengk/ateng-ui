/**
 * 宿主文档全量样式深度抓取与 @page 净化引擎。
 *
 * 负责克隆当前页面中的全部样式规则并剔除浏览器自带的页眉页脚（URL、时间、标题）干扰。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export interface HarvestStylesOptions {
  /** 额外追加的 CSS 样式规则或网络外链 */
  extraCss?: string | string[];
  /** 是否自动注入清除浏览器默认页眉页脚的 Reset 样式（默认为 true） */
  purgeBrowserHeaders?: boolean;
}

export class StyleHarvester {
  /**
   * 自动深度提取宿主环境的所有样式规则，并合流为打印沙箱可用的 HTML 片段。
   */
  public static harvest(options?: HarvestStylesOptions): string {
    const purge = options?.purgeBrowserHeaders !== false;
    const fragments: string[] = [];

    // 1. 注入防浏览器页眉页脚污染的标准 CSS Reset
    if (purge) {
      fragments.push(`
        <style data-ateng-print="reset">
          @page {
            margin: 0;
            size: auto;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      `);
    }

    // 2. 深度克隆宿主主文档中的全部 <style> 节点
    if (typeof document !== 'undefined') {
      const styles = document.head.querySelectorAll('style');
      styles.forEach(style => {
        // 排除可能由自身测试注入的残留节点
        if (style.hasAttribute('data-ateng-print-temp')) return;
        fragments.push(style.outerHTML);
      });

      // 3. 深度克隆宿主主文档中的全部 <link rel="stylesheet"> 节点
      const links = document.head.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(link => {
        fragments.push(link.outerHTML);
      });
    }

    // 4. 追加注入用户指定的自定义样式或外链
    if (options?.extraCss) {
      const extras = Array.isArray(options.extraCss) ? options.extraCss : [options.extraCss];
      extras.forEach(extra => {
        const trimmed = extra.trim();
        if (
          trimmed.startsWith('http://') ||
          trimmed.startsWith('https://') ||
          trimmed.endsWith('.css')
        ) {
          fragments.push(`<link rel="stylesheet" href="${trimmed}" />`);
        } else {
          fragments.push(`<style data-ateng-print="extra">${trimmed}</style>`);
        }
      });
    }

    return fragments.join('\n');
  }
}
