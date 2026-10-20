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
