/**
 * StyleHarvester 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StyleHarvester } from '../src/services/StyleHarvester';

describe('StyleHarvester', () => {
  beforeEach(() => {
    // 注入模拟样式
    const style1 = document.createElement('style');
    style1.textContent = '.custom-title { color: red; }';
    document.head.appendChild(style1);

    const link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.href = 'https://example.com/theme.css';
    document.head.appendChild(link1);
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('默认提取包括 reset、style 标签与 link 标签在内的全部样式', () => {
    const html = StyleHarvester.harvest();

    expect(html).toContain('@page');
    expect(html).toContain('margin: 0');
    expect(html).toContain('.custom-title { color: red; }');
    expect(html).toContain('https://example.com/theme.css');
  });

  it('支持附加自定义 extraCss 规则与外链样式', () => {
    const html = StyleHarvester.harvest({
      extraCss: ['.invoice-box { border: 1px solid black; }', 'https://cdn.example.com/print.css'],
    });

    expect(html).toContain('.invoice-box { border: 1px solid black; }');
    expect(html).toContain('https://cdn.example.com/print.css');
  });

  it('支持关闭 purgeBrowserHeaders 重置注入', () => {
    const html = StyleHarvester.harvest({ purgeBrowserHeaders: false });
    expect(html).not.toContain('data-ateng-print="reset"');
    expect(html).toContain('.custom-title { color: red; }');
  });
});
