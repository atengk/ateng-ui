/**
 * 打印领域强类型统一异常基类。
 *
 * 继承自原生 Error，封装错误码、底层驱动错误堆栈与因果链，与具体 UI 弹窗彻底解耦。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export enum PrintErrorCode {
  INVALID_TARGET = 'PRINT_INVALID_TARGET',
  DRIVER_NOT_FOUND = 'PRINT_DRIVER_NOT_FOUND',
  DRIVER_UNAVAILABLE = 'PRINT_DRIVER_UNAVAILABLE',
  IFRAME_CREATION_FAILED = 'PRINT_IFRAME_CREATION_FAILED',
  TIMEOUT = 'PRINT_TIMEOUT',
  EXECUTION_FAILED = 'PRINT_EXECUTION_FAILED',
  EXPORT_FAILED = 'PRINT_EXPORT_FAILED',
  QUEUE_ERROR = 'PRINT_QUEUE_ERROR',
  TAINTED_CANVAS = 'PRINT_TAINTED_CANVAS',
}

export interface PrintExceptionContext {
  driverName?: string;
  target?: unknown;
  printerName?: string;
  extra?: Record<string, unknown>;
}

export class PrintException extends Error {
  public readonly code: PrintErrorCode;
  public readonly context?: PrintExceptionContext;
  public override readonly cause?: unknown;

  constructor(
    message: string,
    code: PrintErrorCode,
    context?: PrintExceptionContext,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'PrintException';
    this.code = code;
    this.context = context;
    this.cause = cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PrintException);
    }
  }
}
