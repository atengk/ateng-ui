/**
 * CanvasTaintGuard 跨域污染安全防护守卫单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { BusinessException } from '@atengk/core';
import { CanvasTaintGuard } from '../src/guards/canvas-taint-guard';

describe('CanvasTaintGuard', () => {
  it('正确识别原生 SecurityError DOMException', () => {
    const error = new DOMException('The operation is insecure.', 'SecurityError');
    expect(CanvasTaintGuard.isTaintError(error)).toBe(true);
  });

  it('正确识别包含 Tainted 关键字的常规异常', () => {
    const error = new Error(
      'Failed to execute toDataURL on HTMLCanvasElement: Tainted canvases may not be exported.',
    );
    expect(CanvasTaintGuard.isTaintError(error)).toBe(true);
  });

  it('对普通业务异常不误判', () => {
    const error = new Error('Out of memory');
    expect(CanvasTaintGuard.isTaintError(error)).toBe(false);
  });

  it('guard 同步包装执行：正常情况下透明返回结果', () => {
    const result = CanvasTaintGuard.guard(() => 'success');
    expect(result).toBe('success');
  });

  it('guard 同步包装执行：拦截跨域污染并转译为 BusinessException', () => {
    const taintedAction = () => {
      throw new DOMException('Tainted canvases may not be exported', 'SecurityError');
    };

    expect(() => CanvasTaintGuard.guard(taintedAction)).toThrow(BusinessException);

    try {
      CanvasTaintGuard.guard(taintedAction);
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessException);
      const be = err as BusinessException;
      expect(be.code).toBe(40301);
      expect(be.msg).toContain('远程图片跨域导致 Canvas 污染');
      expect(be.cause).toBeDefined();
    }
  });

  it('guardAsync 异步包装执行：拦截跨域污染并转译为 BusinessException', async () => {
    const taintedAsyncAction = async () => {
      throw new Error('Canvas tainted by cross-origin data');
    };

    await expect(CanvasTaintGuard.guardAsync(taintedAsyncAction)).rejects.toThrow(
      BusinessException,
    );
  });

  it('guard 对非跨域普通异常原样向外抛出', () => {
    const normalError = new TypeError('Invalid parameter');
    expect(() =>
      CanvasTaintGuard.guard(() => {
        throw normalError;
      }),
    ).toThrow(TypeError);
  });

  it('guard 支持直接接收 HTMLCanvasElement 实例进行跨域污损探测', () => {
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 10;
    dummyCanvas.height = 10;
    expect(() => CanvasTaintGuard.guard(dummyCanvas)).not.toThrow();

    const mockTaintedCanvas = {
      toDataURL() {
        throw new DOMException('Tainted canvases may not be exported', 'SecurityError');
      },
      width: 10,
      height: 10,
    } as unknown as HTMLCanvasElement;

    expect(() => CanvasTaintGuard.guard(mockTaintedCanvas)).toThrow(BusinessException);
  });
});
