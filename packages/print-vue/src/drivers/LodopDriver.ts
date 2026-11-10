/**
 * 基于 C-Lodop 本地硬件的静默直连打印驱动。
 *
 * 遵循策略模式实现 PrintDriver SPI，支持本地服务端口探针（HTTPS 8443 / HTTP 8000 / 18000）、
 * 物理打印机名称指定、连续打孔走纸协议（SET_PRINT_PAGESIZE）及离线平滑降级至无头浏览器打印。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { PrintErrorCode, PrintException } from '../errors/PrintException';
import { StyleHarvester } from '../services/StyleHarvester';
import { BrowserIframeDriver } from './BrowserIframeDriver';
import { resolvePaperDimensions } from '../types/paper';
import type { PrintDriver, PrintOptions, LodopDriverOptions } from '../types';

export class LodopDriver implements PrintDriver {
  public readonly name: string = 'lodop';

  private readonly options: LodopDriverOptions;

  constructor(options?: LodopDriverOptions) {
    this.options = {
      timeoutMs: 2000,
      hosts: ['localhost', '127.0.0.1'],
      ports: [8443, 8000, 18000],
      fallbackToBrowser: false,
      ...options,
    };
  }

  /**
   * 探测当前运行环境是否支持 C-Lodop 硬件静默打印服务。
   */
  public async isAvailable(): Promise<boolean> {
    if (this.getLodopInstance()) {
      return true;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    return this.probeService(this.options.timeoutMs ?? 2000);
  }

  /**
   * 提交并执行静默打印任务。
   */
  public async print(target: HTMLElement | string, options?: PrintOptions): Promise<void> {
    const fallbackToBrowser = options?.fallbackToBrowser ?? this.options.fallbackToBrowser ?? false;

    // 1. 探测服务可用性
    const available = await this.isAvailable();
    if (!available) {
      if (fallbackToBrowser) {
        options?.onFallback?.(
          'C-Lodop 本地硬件打印服务离线或探测超时，已自动平滑降级为无头浏览器打印',
        );
        const fallbackDriver = new BrowserIframeDriver();
        return fallbackDriver.print(target, options);
      }

      const error = new PrintException(
        'C-Lodop 本地硬件静默打印服务未启动或连接超时 (8443/8000/18000)',
        PrintErrorCode.DRIVER_UNAVAILABLE,
        { driverName: this.name },
      );
      options?.onError?.(error);
      throw error;
    }

    // 2. 获取 LODOP 驱动实例
    const lodopInstance = this.getLodopInstance();
    if (!lodopInstance) {
      const error = new PrintException(
        '获取 C-Lodop 运行实例失败，请检查服务状态',
        PrintErrorCode.DRIVER_NOT_FOUND,
        { driverName: this.name },
      );
      options?.onError?.(error);
      throw error;
    }

    const lodop = lodopInstance as {
      PRINT_INIT?: (taskName: string) => void;
      SET_PRINT_PAGESIZE?: (
        intOrient: number,
        pageWidth: string | number,
        pageHeight: string | number,
        strPageName: string,
      ) => void;
      SET_PRINTER_INDEX_OR_NAME?: (printerName: string) => boolean;
      SET_PRINT_COPIES?: (copies: number) => void;
      ADD_PRINT_HTM?: (
        top: number | string,
        left: number | string,
        width: number | string,
        height: number | string,
        strHtml: string,
      ) => void;
      PRINT?: () => boolean;
      PREVIEW?: () => boolean;
    };

    try {
      // 3. 初始化打印任务
      lodop.PRINT_INIT?.(options?.taskName || 'ATENG_PRINT_JOB');

      // 4. 路由指定物理打印机
      if (options?.printer) {
        lodop.SET_PRINTER_INDEX_OR_NAME?.(options.printer);
      }

      // 5. 对齐连续打孔纸与标准纸张走纸协议
      this.applyPageSize(lodop, options);

      // 6. 配置打印份数
      if (options?.copies && options.copies > 1) {
        lodop.SET_PRINT_COPIES?.(options.copies);
      }

      // 7. 解析打印 HTML 模板与注入保真样式
      const fullHtml = this.resolvePrintHtml(target, options);

      lodop.ADD_PRINT_HTM?.(0, 0, '100%', '100%', fullHtml);

      // 8. 触发物理打印
      lodop.PRINT?.();
      options?.onSuccess?.();
    } catch (err: unknown) {
      const printErr =
        err instanceof PrintException
          ? err
          : new PrintException(
              'C-Lodop 硬件打印执行异常',
              PrintErrorCode.EXECUTION_FAILED,
              {},
              err,
            );
      options?.onError?.(printErr);
      throw printErr;
    }
  }

  /**
   * 应用纸张规约与连续打孔走纸模式。
   */
  private applyPageSize(
    lodop: {
      SET_PRINT_PAGESIZE?: (
        intOrient: number,
        pageWidth: string | number,
        pageHeight: string | number,
        strPageName: string,
      ) => void;
    },
    options?: PrintOptions,
  ): void {
    if (typeof lodop.SET_PRINT_PAGESIZE !== 'function') {
      return;
    }

    const resolved = resolvePaperDimensions(
      options?.preset,
      options?.paperWidth,
      options?.paperHeight,
      options?.orientation,
    );

    const presetName = options?.preset || 'Custom';
    const isPerforatedContinuous =
      typeof options?.preset === 'string' && options.preset.startsWith('continuous-');

    if (resolved.isContinuous) {
      // 连续热敏小票卷纸：intOrient = 3（自适应高度，按内容走纸切刀）
      lodop.SET_PRINT_PAGESIZE(3, `${resolved.widthMm}mm`, 0, presetName);
    } else if (isPerforatedContinuous) {
      // 连续打孔多联单：intOrient = 3（纵向连续打孔走纸，指定单联高度，打孔线精准对齐切刀，绝不跳整页 A4）
      lodop.SET_PRINT_PAGESIZE(3, `${resolved.widthMm}mm`, `${resolved.heightMm}mm`, presetName);
    } else {
      // 标准固定规格纸张（A4/A5 等）
      const intOrient = (options?.orientation || 'portrait') === 'landscape' ? 2 : 1;
      lodop.SET_PRINT_PAGESIZE(
        intOrient,
        `${resolved.widthMm}mm`,
        `${resolved.heightMm}mm`,
        presetName,
      );
    }
  }

  /**
   * 收集宿主样式并组装完备 HTML 文档结构。
   */
  private resolvePrintHtml(target: HTMLElement | string, options?: PrintOptions): string {
    let bodyContent = '';

    if (typeof target === 'string') {
      const trimmed = target.trim();
      if (trimmed.startsWith('<')) {
        bodyContent = trimmed;
      } else if (typeof document !== 'undefined') {
        const el = document.querySelector(trimmed);
        bodyContent = el ? el.outerHTML : trimmed;
      } else {
        bodyContent = trimmed;
      }
    } else if (target && typeof target.outerHTML === 'string') {
      bodyContent = target.outerHTML;
    }

    const harvestedStyles = StyleHarvester.harvest({
      extraCss: options?.extraCss,
    });

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${harvestedStyles}
</head>
<body style="margin: 0; padding: 0;">
${bodyContent}
</body>
</html>`;
  }

  /**
   * 解析获取全局 LODOP / CLODOP 实例。
   */
  private getLodopInstance(): unknown {
    if (this.options.getLodop) {
      return this.options.getLodop();
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const win = window as unknown as {
      getCLodop?: () => unknown;
      LODOP?: unknown;
      CLODOP?: unknown;
    };

    if (typeof win.getCLodop === 'function') {
      try {
        const inst = win.getCLodop();
        if (inst) {
          return inst;
        }
      } catch {
        // 忽略
      }
    }

    return win.LODOP || win.CLODOP || null;
  }

  /**
   * 执行端口心跳探针快速探测。
   */
  private async probeService(timeoutMs: number): Promise<boolean> {
    const ports = this.options.ports || [8443, 8000, 18000];
    const protocol =
      typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https:' : 'http:';

    for (const port of ports) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        await fetch(`${protocol}//127.0.0.1:${port}/CLodopfuncs.js`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });

        clearTimeout(timer);
        return true;
      } catch {
        // 端口未响应或超时，继续尝试下一个端口
      }
    }

    return false;
  }
}
