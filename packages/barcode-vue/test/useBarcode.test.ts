/**
 * useBarcode 状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { useBarcode } from '../src/composables/useBarcode';

describe('useBarcode 状态机 Hook', () => {
  it('应当能正常渲染合法条码至 SVG 节点并更新状态', () => {
    const { isValid, errorMessage, render, validate } = useBarcode();
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(validate('TEST-12345').valid).toBe(true);

    const res = render(svgEl, 'TEST-12345', {
      format: 'CODE128',
      displayValue: true,
    });

    expect(res.valid).toBe(true);
    expect(isValid.value).toBe(true);
    expect(errorMessage.value).toBe('');
    // 验证 SVG 内部生成了条码 path/rect 元素
    expect(svgEl.innerHTML.length).toBeGreaterThan(0);
  });

  it('遇到非法数据时应当拦截渲染并记录响应式错误信息', () => {
    const { isValid, errorMessage, render } = useBarcode({ format: 'EAN13' });
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    // 传入非法 EAN-13
    const res = render(svgEl, 'INVALID-EAN');

    expect(res.valid).toBe(false);
    expect(isValid.value).toBe(false);
    expect(errorMessage.value).toContain('EAN-13');
  });

  it('支持 formatText 展示文本格式化钩子', () => {
    const { render } = useBarcode();
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    const res = render(svgEl, '1234567890', {
      format: 'CODE128',
      formatText: code => `${code.slice(0, 3)} ${code.slice(3, 6)} ${code.slice(6)}`,
    });

    expect(res.valid).toBe(true);
    expect(svgEl.textContent).toContain('123 456 7890');
  });
});
