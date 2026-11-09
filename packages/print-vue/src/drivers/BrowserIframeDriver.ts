/**
 * 基于无头隐藏 iframe 的浏览器打印驱动。
 *
 * 遵循策略模式，实现 PrintDriver 接口，通过隔离 iframe 唤起原生 window.print()，
 * 配合 StyleHarvester 彻底规避全局样式丢失与浏览器默认页眉页脚污染。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { PrintErrorCode, PrintException } from '../errors/PrintException';
import { StyleHarvester } from '../services/StyleHarvester';
import type { PrintDriver, PrintOptions } from '../types';

export class BrowserIframeDriver implements PrintDriver {
  public readonly name: string = 'browser';

  /**
   * 探测当前宿主环境是否支持 iframe 浏览器原生打印。
   */
  public async isAvailable(): Promise<boolean> {
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function'
    );
  }

  /**
   * 提交并执行单据打印。
   */
  public async print(target: HTMLElement | string, options?: PrintOptions): Promise<void> {
    // 1. 前置卫语句：校验环境可用性
    if (!(await this.isAvailable())) {
      const error = new PrintException(
        '当前运行环境不支持浏览器无头 iframe 打印驱动',
        PrintErrorCode.DRIVER_UNAVAILABLE,
        { driverName: this.name },
      );
      options?.onError?.(error);
      throw error;
    }

    // 2. 解析目标 DOM 节点或 HTML 字符串
    const targetElement = this.resolveTarget(target);
    if (!targetElement) {
      const error = new PrintException(
        '未能在当前文档中找到指定的打印目标元素',
        PrintErrorCode.INVALID_TARGET,
        { driverName: this.name, target },
      );
      options?.onError?.(error);
      throw error;
    }

    // 3. 克隆目标节点并同步表单输入值与 Canvas 像素数据
    const clonedElement = this.cloneWithInputStates(targetElement);

    // 4. 创建隐藏沙箱 iframe
    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-ateng-print-iframe', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      iframe.remove();
      const error = new PrintException(
        '无法初始化打印沙箱 iframe 上下文文档',
        PrintErrorCode.IFRAME_CREATION_FAILED,
        { driverName: this.name },
      );
      options?.onError?.(error);
      throw error;
    }

    // 5. 抓取宿主全部样式与用户附加 CSS
    const harvestedStyles = StyleHarvester.harvest({ extraCss: options?.extraCss });

    // 6. 写入打印沙箱
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ateng Print</title>
          ${harvestedStyles}
        </head>
        <body>
          ${clonedElement.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // 7. 等待图片与字体资源预加载，防止打印图片时发生空白
    await this.waitForResources(iframeDoc);

    // 8. 唤起打印并确立确定性卸载生命周期
    await this.triggerPrint(iframe, options);
  }

  /**
   * 解析目标入参为有效 DOM 节点。
   */
  private resolveTarget(target: HTMLElement | string): HTMLElement | null {
    if (typeof target !== 'string') {
      return target instanceof HTMLElement ? target : null;
    }

    const trimmed = target.trim();
    if (trimmed.startsWith('<')) {
      const container = document.createElement('div');
      container.innerHTML = trimmed;
      return (container.firstElementChild as HTMLElement) || container;
    }

    return document.querySelector<HTMLElement>(trimmed);
  }

  /**
   * 深度克隆节点，并同步原生表单输入值（input/select/textarea）与 Canvas 位图。
   */
  private cloneWithInputStates(source: HTMLElement): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement;

    // 同步表单值
    const sourceInputs = source.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input, select, textarea');
    const cloneInputs = clone.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input, select, textarea');

    sourceInputs.forEach((src, idx) => {
      const dest = cloneInputs[idx];
      if (!dest) return;

      if (src instanceof HTMLInputElement) {
        const destInput = dest as HTMLInputElement;
        if (src.type === 'checkbox' || src.type === 'radio') {
          destInput.checked = src.checked;
          if (src.checked) destInput.setAttribute('checked', '');
        } else {
          destInput.value = src.value;
          destInput.setAttribute('value', src.value);
        }
      } else if (src instanceof HTMLTextAreaElement) {
        const destText = dest as HTMLTextAreaElement;
        destText.value = src.value;
        destText.textContent = src.value;
      } else if (src instanceof HTMLSelectElement) {
        const destSelect = dest as HTMLSelectElement;
        destSelect.value = src.value;
      }
    });

    // 同步 Canvas 画布内容为图片
    const sourceCanvases = source.querySelectorAll('canvas');
    const cloneCanvases = clone.querySelectorAll('canvas');
    sourceCanvases.forEach((srcCanvas, idx) => {
      const destCanvas = cloneCanvases[idx];
      if (!destCanvas) return;
      try {
        const dataUrl = srcCanvas.toDataURL();
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = destCanvas.style.width || `${srcCanvas.width}px`;
        img.style.height = destCanvas.style.height || `${srcCanvas.height}px`;
        destCanvas.parentNode?.replaceChild(img, destCanvas);
      } catch {
        // 跨域或已污染 Canvas 忽略
      }
    });

    return clone;
  }

  /**
   * 等待沙箱内的外部图片与字体载入。
   */
  private async waitForResources(doc: Document): Promise<void> {
    const images = Array.from(doc.querySelectorAll('img'));
    const imgPromises = images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 1500); // 1.5s 安全超时
      });
    });

    // 字体准备就绪保护
    const fontPromise = doc.fonts ? doc.fonts.ready.catch(() => {}) : Promise.resolve();

    await Promise.race([
      Promise.all([...imgPromises, fontPromise]),
      new Promise<void>(resolve => setTimeout(resolve, 2000)),
    ]);
  }

  /**
   * 触发执行打印并在打印结束后 100% 清理 iframe 句柄。
   */
  private triggerPrint(iframe: HTMLIFrameElement, options?: PrintOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const win = iframe.contentWindow;
      if (!win) {
        iframe.remove();
        const error = new PrintException(
          '无法获取沙箱 iframe 窗口实例',
          PrintErrorCode.EXECUTION_FAILED,
        );
        options?.onError?.(error);
        return reject(error);
      }

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        // 确保从 DOM 中移除
        if (iframe.parentNode) {
          iframe.remove();
        }
        options?.onSuccess?.();
        resolve();
      };

      // 监听打印后事件（支持原生 onafterprint）
      win.onafterprint = cleanup;

      try {
        win.focus();
        win.print();

        // 兜底超时：部分无头/自动化环境不触发 onafterprint
        setTimeout(cleanup, 1000);
      } catch (err) {
        cleanup();
        const error = new PrintException(
          '执行原生 window.print 遇到异常',
          PrintErrorCode.EXECUTION_FAILED,
          { driverName: this.name },
          err,
        );
        options?.onError?.(error);
        reject(error);
      }
    });
  }
}
