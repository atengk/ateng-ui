/**
 * RenderThrottler 渲染节流与打字机状态机单元测试。
 *
 * 验证 RAF 批处理窗口、字符队列匀速吐字、flushTypewriter 瞬间跳过与销毁清理。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RenderThrottler } from '../src/throttler/RenderThrottler';

describe('RenderThrottler', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('全速模式 (typewriterSpeed: 0) 在高频并发分块下合并批处理', () => {
    const updates: string[] = [];
    const throttler = new RenderThrottler({
      typewriterSpeed: 0,
      onUpdate: text => {
        updates.push(text);
      },
    });

    // 瞬间注入 3 个高速 chunk
    throttler.feed('Hello ');
    throttler.feed('World, ');
    throttler.feed('Ateng!');

    // 在同一个微任务/宏任务内尚未执行 RAF
    expect(updates.length).toBe(0);

    // 触发 RAF
    vi.runAllTimers();

    expect(updates.length).toBe(1);
    expect(updates[0]).toBe('Hello World, Ateng!');

    throttler.finish();
    throttler.dispose();
  });

  it('打字机模式 (typewriterSpeed > 0) 匀速吐字与呼吸感', () => {
    const updates: string[] = [];
    const throttler = new RenderThrottler({
      typewriterSpeed: 20, // 20ms 每字符
      onUpdate: text => {
        updates.push(text);
      },
    });

    throttler.feed('Vue');

    expect(updates.length).toBe(0);

    // 步进 20ms
    vi.advanceTimersByTime(20);
    expect(updates.length).toBe(1);
    expect(updates[0]).toBe('V');

    // 再步进 20ms
    vi.advanceTimersByTime(20);
    expect(updates.length).toBe(2);
    expect(updates[1]).toBe('Vu');

    // 再步进 20ms
    vi.advanceTimersByTime(20);
    expect(updates.length).toBe(3);
    expect(updates[2]).toBe('Vue');

    throttler.finish();
    throttler.dispose();
  });

  it('调用 flushTypewriter 能够瞬间排空剩余缓冲队列', () => {
    const updates: string[] = [];
    const throttler = new RenderThrottler({
      typewriterSpeed: 30,
      onUpdate: text => {
        updates.push(text);
      },
    });

    throttler.feed('Artificial Intelligence');

    // 仅步进一次吐出 1 个字
    vi.advanceTimersByTime(30);
    expect(updates[updates.length - 1]).toBe('A');

    // 用户点击立即跳过打字动画
    throttler.flushTypewriter();

    expect(updates[updates.length - 1]).toBe('Artificial Intelligence');

    throttler.dispose();
  });

  it('dispose 销毁时停止后续定时器并清理资源', () => {
    const updates: string[] = [];
    const throttler = new RenderThrottler({
      typewriterSpeed: 20,
      onUpdate: text => {
        updates.push(text);
      },
    });

    throttler.feed('Pending');
    throttler.dispose();

    vi.advanceTimersByTime(100);
    expect(updates.length).toBe(0);
  });
});
