/**
 * 传输通道、批缓冲队列与防套娃协议单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MONITOR_SKIP_HEADER,
  isMonitorReportRequest,
  sendBeaconTransport,
  fetchTransport,
  xhrTransport,
  createDefaultReporter,
} from '../src/transport/transport';
import { TransportQueue } from '../src/transport/queue';
import type { MonitorEvent } from '../src/types/event';

function createDummyEvent(id: string = 'evt-1'): MonitorEvent {
  return {
    id,
    type: 'custom',
    level: 'info',
    timestamp: Date.now(),
    payload: { message: `Test message ${id}` },
    context: {
      appVersion: '1.0.0',
      environment: 'dev',
      sessionId: 'sess-1',
      tags: {},
      extra: {},
      device: {
        userAgent: 'test-agent',
        language: 'zh-CN',
        viewport: { width: 1920, height: 1080 },
        screen: { width: 1920, height: 1080 },
        pixelRatio: 1,
        online: true,
      },
      url: 'https://example.com/app',
      title: 'Test App',
    },
  };
}

describe('Transport & Anti-Loop Protocol', () => {
  describe('isMonitorReportRequest', () => {
    it('应当准确识别包含 X-Ateng-Monitor-Skip: true 的请求头 (不区分大小写)', () => {
      expect(
        isMonitorReportRequest('https://api.example.com/data', {
          [MONITOR_SKIP_HEADER]: 'true',
        }),
      ).toBe(true);

      expect(
        isMonitorReportRequest('https://api.example.com/data', {
          'x-ateng-monitor-skip': 'true',
        }),
      ).toBe(true);

      expect(
        isMonitorReportRequest('https://api.example.com/data', {
          'X-Custom-Header': '123',
        }),
      ).toBe(false);
    });

    it('应当准确识别命中 reportUrl 端点的请求', () => {
      const reportEndpoint = 'https://apm.example.com/collect';
      expect(
        isMonitorReportRequest('https://apm.example.com/collect', undefined, reportEndpoint),
      ).toBe(true);
      expect(
        isMonitorReportRequest('https://apm.example.com/collect?v=1', undefined, reportEndpoint),
      ).toBe(true);
      expect(
        isMonitorReportRequest('https://api.example.com/users', undefined, reportEndpoint),
      ).toBe(false);
    });
  });

  describe('三阶传输适配器', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('sendBeaconTransport 应当优先调用 navigator.sendBeacon', () => {
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy });

      const events = [createDummyEvent('e1')];
      const result = sendBeaconTransport('https://apm.example.com', events);

      expect(result).toBe(true);
      expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
      expect(sendBeaconSpy.mock.calls[0][0]).toBe('https://apm.example.com');
    });

    it('fetchTransport 应当携带 keepalive: true 与防循环请求头', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', fetchSpy);

      const events = [createDummyEvent('e2')];
      const result = await fetchTransport('https://apm.example.com/events', events);

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[0]).toBe('https://apm.example.com/events');
      expect(callArgs[1].keepalive).toBe(true);
      expect(callArgs[1].headers[MONITOR_SKIP_HEADER]).toBe('true');
    });

    it('fetchTransport 在网络异常时不抛出并返回 false 降级', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

      const events = [createDummyEvent('e3')];
      const result = await fetchTransport('https://apm.example.com/events', events);
      expect(result).toBe(false);
    });

    it('xhrTransport 应当正确注入请求头并监听状态码', async () => {
      let openUrl = '';
      const setHeaders: Record<string, string> = {};
      let onDone: () => void;

      class MockXHR {
        status = 200;
        onload: () => void = () => {};
        open(_method: string, url: string) {
          openUrl = url;
        }
        setRequestHeader(k: string, v: string) {
          setHeaders[k] = v;
        }
        send() {
          onDone = this.onload;
          setTimeout(() => {
            onDone();
          }, 0);
        }
      }

      vi.stubGlobal('XMLHttpRequest', MockXHR);

      const events = [createDummyEvent('e4')];
      const result = await xhrTransport('https://apm.example.com/xhr', events);

      expect(result).toBe(true);
      expect(openUrl).toBe('https://apm.example.com/xhr');
      expect(setHeaders[MONITOR_SKIP_HEADER]).toBe('true');
    });

    it('createDefaultReporter 应当自适应依序降级', async () => {
      // 1. sendBeacon 失败
      vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) });
      // 2. fetch 成功
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);

      const reporter = createDefaultReporter('https://apm.example.com/api');
      await reporter([createDummyEvent('e5')]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('TransportQueue', () => {
    let reporterSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      reporterSpy = vi.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('未达到 batchSize 时应当延迟通过防抖定时器冲刷', async () => {
      const queue = new TransportQueue({
        batchSize: 3,
        flushInterval: 2000,
        reporter: reporterSpy,
      });

      queue.push(createDummyEvent('1'));
      queue.push(createDummyEvent('2'));

      expect(queue.size).toBe(2);
      expect(reporterSpy).not.toHaveBeenCalled();

      // 快进时间至 2000ms
      await vi.advanceTimersByTimeAsync(2000);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      const batch: MonitorEvent[] = reporterSpy.mock.calls[0][0];
      expect(batch.length).toBe(2);
      expect(queue.size).toBe(0);

      await queue.destroy();
    });

    it('达到 batchSize 时应当立即冲刷而无需等待定时器', async () => {
      const queue = new TransportQueue({
        batchSize: 3,
        flushInterval: 5000,
        reporter: reporterSpy,
      });

      queue.push(createDummyEvent('1'));
      queue.push(createDummyEvent('2'));
      expect(reporterSpy).not.toHaveBeenCalled();

      // 达到第 3 条
      queue.push(createDummyEvent('3'));
      await vi.advanceTimersByTimeAsync(0);

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      expect(reporterSpy.mock.calls[0][0].length).toBe(3);
      expect(queue.size).toBe(0);

      await queue.destroy();
    });

    it('手动调用 flush 应当立即冲刷队列中积压的事件', async () => {
      const queue = new TransportQueue({
        batchSize: 10,
        flushInterval: 5000,
        reporter: reporterSpy,
      });

      queue.push(createDummyEvent('manual-1'));
      queue.push(createDummyEvent('manual-2'));

      await queue.flush();
      expect(reporterSpy).toHaveBeenCalledTimes(1);
      expect(queue.size).toBe(0);

      await queue.destroy();
    });

    it('在 visibilitychange 状态变为 hidden 时应当触发 emergencyFlush 紧急冲刷', () => {
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy });

      const queue = new TransportQueue({
        batchSize: 10,
        reportUrl: 'https://apm.example.com/beacon',
      });

      queue.push(createDummyEvent('unload-1'));
      expect(queue.size).toBe(1);

      // 模拟页面进入 hidden 状态
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
      expect(queue.size).toBe(0);

      void queue.destroy();
    });

    it('destroy 应当清理生命周期监听器并将剩余事件冲刷完成', async () => {
      const queue = new TransportQueue({
        batchSize: 10,
        flushInterval: 5000,
        reporter: reporterSpy,
      });

      queue.push(createDummyEvent('remain-1'));
      await queue.destroy();

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      expect(queue.size).toBe(0);

      // destroy 后 push 应当被忽略
      queue.push(createDummyEvent('ignored'));
      expect(queue.size).toBe(0);
    });

    it('updateLast 应当能够查找队列最近匹配事件并就地修改，未命中返回 false', () => {
      const queue = new TransportQueue({
        batchSize: 10,
        flushInterval: 5000,
        reporter: reporterSpy,
      });

      queue.push(createDummyEvent('item-1'));
      queue.push(createDummyEvent('item-2'));

      const hit = queue.updateLast(
        evt => evt.id === 'item-2',
        evt => {
          (evt.payload as { modified?: boolean }).modified = true;
        },
      );
      expect(hit).toBe(true);

      const miss = queue.updateLast(
        evt => evt.id === 'not-exist',
        () => {},
      );
      expect(miss).toBe(false);

      void queue.destroy();
    });
  });
});
