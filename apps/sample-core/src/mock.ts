/**
 * sample-core 离线自洽模拟网络适配器。
 *
 * 为可视化展厅提供全特性的离线模拟服务，覆盖微服务路由、雪花大数反序列化、
 * 鉴权请求头校验、401 失效广播、请求取消与 Blob 双态异常。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

let transientFailCount = 0;
let dedupeNetworkCallCount = 0;

/**
 * 获取飞行中去重模拟的网络实际调用计数。
 */
export function getMockDedupeNetworkCalls(): number {
  return dedupeNetworkCallCount;
}

/**
 * 安装离线自洽模拟适配器。
 *
 * @param targetAxios 目标 Axios 实例
 */
export function installMockAdapter(targetAxios: AxiosInstance): void {
  targetAxios.defaults.adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    const url = config.url || '';
    const baseURL = config.baseURL || '';
    const fullUrl = `${baseURL}${url}`;
    const method = (config.method || 'get').toUpperCase();

    // 1. 模拟响应延迟（防竞态场景延迟响应）
    const params = config.params as Record<string, unknown> | undefined;
    if (params?.['q'] === 'slow') {
      const signal = config.signal as AbortSignal | undefined;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, 800);

        const onAbort = () => {
          clearTimeout(timer);
          reject(new axios.CanceledError(signal?.reason as string));
        };

        if (signal?.aborted) {
          clearTimeout(timer);
          reject(new axios.CanceledError(signal.reason as string));
          return;
        }

        signal?.addEventListener('abort', onAbort, { once: true });
      });

      return {
        data: { code: 200, data: '搜索结果已按时返回', msg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 2. 正常用户详情与默认解包
    if (url.includes('/api/user/detail')) {
      return {
        data: {
          code: 200,
          data: {
            id: '9007199254740995123',
            name: 'Ateng',
            phone: '13812345678',
            idCard: '110101199003072345',
            email: 'admin@ateng.local',
          },
          msg: '查询用户详情成功',
          traceId: 'tr-user-2026-001',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 3. 原始雪花大数响应（未加引号的 19 位大数字符串，经 transformSnowflakeResponse 管道保护）
    if (url.includes('/api/snowflake/test')) {
      const rawText =
        '{"code":200,"data":{"orderId":9007199254740995888,"amount":999.5},"msg":"雪花订单已生成","traceId":"tr-snow-888"}';

      let transformed: unknown = rawText;
      if (Array.isArray(config.transformResponse)) {
        for (const fn of config.transformResponse) {
          transformed = fn.call(config, transformed, config.headers);
        }
      }

      return {
        data: transformed,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 4. 微服务路由分发验证
    if (fullUrl.includes('order-service.cloud') || url.includes('/detail/100')) {
      return {
        data: {
          code: 200,
          data: {
            serviceRouted: 'order-service.cloud',
            receivedUrl: url,
            receivedBaseURL: baseURL,
          },
          msg: '微服务网关分发成功',
          traceId: 'tr-route-777',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 5. 模拟 401 凭据失效
    if (url.includes('/api/auth/expire')) {
      return {
        data: {
          code: 401,
          data: null,
          msg: '登录凭据已过期，请重新登录',
          traceId: 'tr-auth-401',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 6. 文件下载：正常二进制流
    if (url.includes('/api/download/normal')) {
      const csvContent = 'ID,Name,Phone\n9007199254740995123,Ateng,13812345678\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return {
        data: blob,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'text/csv',
          'content-disposition':
            "attachment; filename*=UTF-8''%e7%94%a8%e6%88%b7%e6%b8%85%e5%8d%95_2026.csv",
        },
        config,
      };
    }

    // 7. 文件下载：业务异常 JSON 拦截
    if (url.includes('/api/download/error')) {
      const errorJson = JSON.stringify({
        code: 50001,
        msg: '服务端临时磁盘已满，无法生成导出文件',
        traceId: 'tr-download-err-99',
        data: { limit: '10GB' },
      });
      const blob = new Blob([errorJson], { type: 'application/json' });
      return {
        data: blob,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
        },
        config,
      };
    }

    // 8. 幂等安全重试与飞行中合并去重模拟
    if (url.includes('/api/resilience/retry-transient')) {
      transientFailCount++;
      if (transientFailCount % 2 === 1) {
        const error = new axios.AxiosError(
          '服务端 500 临时故障（模拟网关抖动）',
          'ERR_BAD_RESPONSE',
          config,
        );
        error.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { code: 500, msg: '网关临时抖动 (500)' },
          headers: {},
          config,
        };
        throw error;
      }
      return {
        data: {
          code: 200,
          data: { status: 'recovered', attempts: 2 },
          msg: '第 1 次重试成功：网关服务已恢复正常！',
          traceId: 'tr-retry-success-200',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/resilience/write-forbidden')) {
      const error = new axios.AxiosError('订单支付写操作超时', 'ERR_BAD_RESPONSE', config);
      error.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { code: 500, msg: '写操作异常 (杜绝自动重试防重复扣款)' },
        headers: {},
        config,
      };
      throw error;
    }

    if (url.includes('/api/resilience/dedupe-flight')) {
      dedupeNetworkCallCount++;
      const currentCall = dedupeNetworkCallCount;
      await new Promise(r => setTimeout(r, 200));
      return {
        data: {
          code: 200,
          data: { callIndex: currentCall, payload: '仪表盘用户聚合数据' },
          msg: '飞行中合并成功',
          traceId: 'tr-dedupe-999',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 8.1 模拟防重放签名校验
    if (url.includes('/api/security/sign-verify')) {
      const headers = (config.headers ?? {}) as Record<string, string>;
      return {
        data: {
          code: 200,
          data: {
            verified: true,
            receivedTimestamp: headers['X-Timestamp'],
            receivedNonce: headers['X-Nonce'],
            receivedSignature: headers['X-Signature'],
            receivedTenant: headers['X-Tenant-Id'],
          },
          msg: '服务端签名与时间戳防重放校验通过',
          traceId: 'tr-sign-verified-001',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 9. 默认透传兜底
    return {
      data: { code: 200, data: `Echo: ${method} ${url}`, msg: 'ok' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
}

/**
 * 创建用于 AI 打字机展示的模拟流式 fetch 实现。
 */
export function createMockStreamFetch(): typeof fetch {
  return async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const textPieces = [
      '你好！我是 ',
      '@atengk/core ',
      '流式推理 ',
      '打字机助手。',
      '\n\n基于 Web 原生 ',
      'ReadableStream 与 fetch ',
      '无头编排构建，',
      '零 Axios 依赖，',
      '支持任意大模型 ',
      'SSE 协议分发！',
      '\n当前连接已完成。',
    ];

    let index = 0;
    const encoder = new TextEncoder();
    const signal = init?.signal;

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (signal?.aborted) {
          controller.close();
          return;
        }

        if (index < textPieces.length) {
          // 模拟网络打字延迟 (120ms)
          await new Promise(r => setTimeout(r, 120));
          if (signal?.aborted) {
            controller.close();
            return;
          }
          const sseEventStr = `id: evt-${index + 1}\nevent: delta\ndata: ${textPieces[index]}\n\n`;
          controller.enqueue(encoder.encode(sseEventStr));
          index++;
        } else {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  };
}

/**
 * WebSocket 自验离线模拟控制器。
 */
export interface MockWebSocketServerController {
  factory: (url: string, protocols?: string | string[]) => WebSocket;
  triggerServerClose: (code?: number, reason?: string) => void;
  setDropPong: (drop: boolean) => void;
  broadcastTopic: (type: string, data: unknown) => void;
  isDropPong: () => boolean;
}

/**
 * 创建适用于 sample-core 自验看板的离线自洽 Mock WebSocket 服务端。
 */
export function createMockWebSocketServer(): MockWebSocketServerController {
  let activeSocket: MockBrowserSocket | null = null;
  let dropPong = false;

  class MockBrowserSocket implements WebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;

    url: string;
    protocols?: string | string[];
    readyState: number = MockBrowserSocket.CONNECTING;
    binaryType: BinaryType = 'blob';
    bufferedAmount: number = 0;
    extensions: string = '';
    protocol: string = '';

    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      this.protocols = protocols;

      // 模拟 100ms 网络握手时延
      setTimeout(() => {
        if (this.readyState === MockBrowserSocket.CONNECTING) {
          this.readyState = MockBrowserSocket.OPEN;
          this.onopen?.(new Event('open'));
        }
      }, 100);
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      if (this.readyState !== MockBrowserSocket.OPEN) {
        throw new Error('WebSocket is not open');
      }

      // 1. 识别心跳 Ping
      if (data === 'ping') {
        if (!dropPong) {
          setTimeout(() => {
            if (this.readyState === MockBrowserSocket.OPEN) {
              this.onmessage?.(new MessageEvent('message', { data: 'pong' }));
            }
          }, 40);
        }
        return;
      }

      // 2. 识别业务 JSON 消息并模拟服务端应答
      if (typeof data === 'string' && data.startsWith('{') && data.endsWith('}')) {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (parsed['type'] === 'chat') {
            const chatData = (parsed['data'] as Record<string, unknown>) || {};
            setTimeout(() => {
              if (this.readyState === MockBrowserSocket.OPEN) {
                this.onmessage?.(
                  new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'chat',
                      data: {
                        user: '服务端 AI 助手',
                        text: `收到你的消息: "${chatData['text'] || ''}"`,
                        time: new Date().toLocaleTimeString(),
                      },
                    }),
                  }),
                );
              }
            }, 100);
          } else if (parsed['type'] === 'quote') {
            setTimeout(() => {
              if (this.readyState === MockBrowserSocket.OPEN) {
                this.onmessage?.(
                  new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'quote',
                      data: {
                        symbol: 'ATENG',
                        price: +(120 + (Math.random() * 6 - 3)).toFixed(2),
                        time: new Date().toLocaleTimeString(),
                      },
                    }),
                  }),
                );
              }
            }, 100);
          }
        } catch {
          // 忽略非标准 JSON
        }
      }
    }

    close(code = 1000, reason = ''): void {
      this.readyState = MockBrowserSocket.CLOSING;
      setTimeout(() => {
        this.readyState = MockBrowserSocket.CLOSED;
        this.onclose?.(new CloseEvent('close', { code, reason, wasClean: true }));
      }, 30);
    }

    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return true;
    }
  }

  return {
    factory: (url: string, protocols?: string | string[]): WebSocket => {
      const socket = new MockBrowserSocket(url, protocols);
      activeSocket = socket;
      return socket as unknown as WebSocket;
    },
    triggerServerClose: (code = 1006, reason = '模拟服务端异常断网') => {
      if (activeSocket && activeSocket.readyState === MockBrowserSocket.OPEN) {
        activeSocket.readyState = MockBrowserSocket.CLOSED;
        activeSocket.onclose?.(new CloseEvent('close', { code, reason, wasClean: false }));
      }
    },
    setDropPong: (drop: boolean) => {
      dropPong = drop;
    },
    isDropPong: () => dropPong,
    broadcastTopic: (type: string, data: unknown) => {
      if (activeSocket && activeSocket.readyState === MockBrowserSocket.OPEN) {
        activeSocket.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type, data }),
          }),
        );
      }
    },
  };
}
