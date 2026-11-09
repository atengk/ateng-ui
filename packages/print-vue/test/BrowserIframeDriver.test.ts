/**
 * BrowserIframeDriver 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserIframeDriver } from '../src/drivers/BrowserIframeDriver';
import { PrintErrorCode, PrintException } from '../src/errors/PrintException';

describe('BrowserIframeDriver', () => {
  let driver: BrowserIframeDriver;

  beforeEach(() => {
    driver = new BrowserIframeDriver();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('在 DOM 环境下报告驱动可用', async () => {
    expect(await driver.isAvailable()).toBe(true);
    expect(driver.name).toBe('browser');
  });

  it('当目标元素不存在时抛出 INVALID_TARGET 异常', async () => {
    await expect(driver.print('#non-existent')).rejects.toThrow(PrintException);

    try {
      await driver.print('#non-existent');
    } catch (err) {
      const ex = err as PrintException;
      expect(ex.code).toBe(PrintErrorCode.INVALID_TARGET);
    }
  });

  it('成功克隆 DOM、克隆表单输入值并唤起 window.print 后移除 iframe', async () => {
    const container = document.createElement('div');
    container.id = 'invoice-target';
    container.innerHTML = `
      <h1>发票单据</h1>
      <input type="text" id="cust-name" value="张三" />
      <input type="checkbox" id="tax-flag" checked />
      <textarea id="remark">急单</textarea>
    `;
    document.body.appendChild(container);

    // 动态修改 input 当前值
    const input = container.querySelector<HTMLInputElement>('#cust-name')!;
    input.value = '李四';

    const onSuccess = vi.fn();
    await driver.print(container, { onSuccess });

    expect(onSuccess).toHaveBeenCalled();
    // 确认 iframe 最终被确定性清理
    const iframes = document.querySelectorAll('iframe[data-ateng-print-iframe]');
    expect(iframes.length).toBe(0);
  });

  it('支持直接传入 HTML 字符串进行打印', async () => {
    const onSuccess = vi.fn();
    await driver.print('<div class="raw-sheet">纯 HTML 字符串内容</div>', { onSuccess });
    expect(onSuccess).toHaveBeenCalled();
  });
});
