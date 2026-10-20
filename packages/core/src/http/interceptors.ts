/**
 * HTTP 客户端请求与响应拦截器管道编排。
 *
 * 负责组装：
 * 1. 请求拦截器：网关前缀与 service 路由分发、双轨 Token 请求头注入、雪花大数防截断、请求取消协调器防竞态；
 * 2. 响应拦截器：Blob 双态异常识别、统一因果异常转译、401 自动清理与事件广播、Result<T> 默认自动解包与逃生门。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosResponseTransformer,
} from 'axios';
import { BusinessException, isResult } from '../contracts';
import { transformSnowflakeResponse } from '../transform';
import type { GatewayRouter } from '../routing';
import type { AuthManager } from '../auth';
import type { TenantManager } from '../tenant';
import { generateRequestKey, isAbortError, type AbortCoordinator } from '../abort';
import { checkBlobForJsonError } from '../file';
import { isIdempotentMethod, isRetriableError, calculateBackoffDelay } from '../retry';
import type { RequestSigner } from '../security';
import type { HttpRequestConfig } from './types';

/**
 * 内部存储 Blob 响应与其 Content-Disposition 头部的弱引用映射表，
 * 杜绝污染原生 Blob 对象。
 */
const blobDispositionWeakMap = new WeakMap<Blob, string>();

/**
 * 获取指定 Blob 实例绑定的 Content-Disposition 响应头。
 *
 * @param blob 目标二进制数据块
 * @returns 对应的 Content-Disposition 字符串
 */
export function getBlobDisposition(blob: Blob): string | undefined {
  return blobDispositionWeakMap.get(blob);
}

/**
 * 异步睡眠等待，支持 AbortSignal 级联即时中断唤醒。
 *
 * @param ms 等待毫秒数
 * @param signal 可选的中断信号
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Request aborted during retry backoff'));
      return;
    }
    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      reject(signal?.reason ?? new Error('Request aborted during retry backoff'));
    };
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * 拦截器管道内部运行依赖上下文。
 */
export interface InterceptorContext {
  router: GatewayRouter;
  authManager: AuthManager;
  tenantManager?: TenantManager;
  signer?: RequestSigner;
  abortCoordinator: AbortCoordinator;
  defaultCancelDuplicate: boolean;
  defaultUnwrap: boolean;
  defaultRetry?: number;
  defaultRetryDelay?: number;
  defaultShouldRetry?: (error: BusinessException) => boolean;
  onUnauthorized?: () => void;
}

/**
 * 为指定的 Axios 实例挂载全套工业级请求与响应拦截器。
 *
 * @param instance 目标 Axios 实例
 * @param context 拦截器管道依赖上下文
 */
export function setupInterceptors(instance: AxiosInstance, context: InterceptorContext): void {
  const {
    router,
    authManager,
    abortCoordinator,
    defaultCancelDuplicate,
    defaultUnwrap,
    defaultRetry = 0,
    defaultRetryDelay = 1000,
    defaultShouldRetry,
    onUnauthorized,
  } = context;

  // ================= 1. 请求拦截器 =================
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const customConfig = config as HttpRequestConfig & InternalAxiosRequestConfig;

    // 1.1 默认设置 unwrap 标记
    if (customConfig.unwrap === undefined) {
      customConfig.unwrap = defaultUnwrap;
    }

    // 1.2 微服务网关路由前缀匹配与 service 显式覆盖（保留原始路径防重试时二次路由篡改）
    const customRecord = customConfig as unknown as Record<string, unknown>;
    if (!customRecord.__originalUrl) {
      customRecord.__originalUrl = customConfig.url;
      customRecord.__originalBaseURL = customConfig.baseURL;
    }
    if (customRecord.__originalSignal === undefined) {
      customRecord.__originalSignal = customConfig.signal;
    }

    const originalUrl = (customRecord.__originalUrl as string) ?? customConfig.url ?? '';
    const resolvedRoute = router.resolve({
      url: originalUrl,
      baseURL: (customRecord.__originalBaseURL as string) ?? customConfig.baseURL,
      service: customConfig.service,
    });
    if (resolvedRoute.target) {
      customConfig.baseURL = resolvedRoute.target;
      customConfig.url = resolvedRoute.url;
    }

    // 1.3 双轨 Token 请求头自动注入
    const authHeaders = authManager.getHeaders();
    customConfig.headers = customConfig.headers || {};
    for (const [key, value] of Object.entries(authHeaders)) {
      if (!customConfig.headers[key] && value) {
        customConfig.headers[key] = value;
      }
    }

    // 1.3.1 多租户上下文请求头自动注入
    if (context.tenantManager) {
      const tenantHeaders = context.tenantManager.getHeaders();
      for (const [key, value] of Object.entries(tenantHeaders)) {
        if (!customConfig.headers[key] && value) {
          customConfig.headers[key] = value;
        }
      }
    }

    // 1.3.2 API 请求防重放与防篡改签名自动注入
    if (context.signer) {
      const shouldSign =
        customConfig.sign !== undefined
          ? customConfig.sign
          : context.signer.shouldSign(customConfig);

      if (shouldSign) {
        const timestamp = context.signer.generateTimestamp();
        const nonce = context.signer.generateNonce();
        const signResult = await context.signer.sign({
          method: customConfig.method,
          url: customConfig.url,
          params: customConfig.params,
          data: customConfig.data,
          timestamp,
          nonce,
        });

        for (const [key, value] of Object.entries(signResult.headers)) {
          if (value) {
            customConfig.headers[key] = value;
          }
        }
      }
    }

    // 1.4 雪花 ID 大数防截断反序列化管道注入（去重防重复包装）
    const hasSnowflakeTransformer =
      Array.isArray(customConfig.transformResponse) &&
      customConfig.transformResponse.includes(
        transformSnowflakeResponse as AxiosResponseTransformer,
      );

    if (!hasSnowflakeTransformer) {
      const existingTransformers: AxiosResponseTransformer[] = Array.isArray(
        customConfig.transformResponse,
      )
        ? (customConfig.transformResponse as AxiosResponseTransformer[])
        : customConfig.transformResponse
          ? [customConfig.transformResponse as AxiosResponseTransformer]
          : Array.isArray(axios.defaults.transformResponse)
            ? (axios.defaults.transformResponse as AxiosResponseTransformer[])
            : [];

      customConfig.transformResponse = [
        transformSnowflakeResponse as AxiosResponseTransformer,
        ...existingTransformers,
      ];
    }

    // 1.5 异步请求取消协调器与防竞态
    const shouldCancelDuplicate = customConfig.cancelDuplicate ?? defaultCancelDuplicate;
    const target = {
      method: customConfig.method,
      url: customConfig.url,
      params: customConfig.params,
      data: customConfig.data,
    };
    const requestKey = generateRequestKey(target);
    (customConfig as unknown as Record<string, unknown>).__requestKey = requestKey;

    const originalSignal =
      (customRecord.__originalSignal as AbortSignal | undefined) ??
      (customConfig.signal as AbortSignal | undefined);

    const registration = abortCoordinator.register({
      key: requestKey,
      target,
      signal: originalSignal,
      cancelDuplicate: shouldCancelDuplicate,
    });

    customConfig.signal = registration.signal;

    return customConfig;
  });

  // ================= 2. 响应拦截器 =================
  instance.interceptors.response.use(
    async (response: AxiosResponse) => {
      // 2.1 无论成败，从取消协调器中移除已完成的请求
      const requestKey = (response.config as unknown as Record<string, unknown>)?.__requestKey as
        string | undefined;
      if (requestKey) {
        abortCoordinator.remove(requestKey);
      }

      const customConfig = response.config as HttpRequestConfig;

      // 2.2 二进制流双态异常检测 (Blob Error Check)
      if (
        customConfig.responseType === 'blob' ||
        (typeof Blob !== 'undefined' && response.data instanceof Blob)
      ) {
        const contentType = (response.headers?.['content-type'] as string | undefined) ?? null;
        await checkBlobForJsonError(response.data, contentType, response.status);

        if (typeof Blob !== 'undefined' && response.data instanceof Blob) {
          const disposition = response.headers?.['content-disposition'] as string | undefined;
          if (disposition) {
            blobDispositionWeakMap.set(response.data, disposition);
          }
        }

        return response.data;
      }

      // 2.3 标准 Result 统一信封解包与业务状态码校验
      if (isResult(response.data)) {
        const result = response.data;

        // 业务成功 (code === 200)
        if (result.code === 200) {
          // 逃生门：显式配置 unwrap: false 时返回原始完整 Result 实体
          if (customConfig.unwrap === false) {
            return result;
          }
          // 默认自动解包：提取泛型业务数据载荷
          return result.data;
        }

        // 业务失败 (code !== 200)
        if (result.code === 401) {
          authManager.handleUnauthorized();
          onUnauthorized?.();
        }

        // 转译业务异常
        throw new BusinessException(result.code, result.msg, result.traceId, result);
      }

      // 2.4 非 Result 格式的常规数据直接原样透传
      return response.data;
    },
    async (error: unknown) => {
      const errObj =
        error && typeof error === 'object' ? (error as Record<string, unknown>) : undefined;
      const responseObj =
        errObj?.response && typeof errObj.response === 'object'
          ? (errObj.response as Record<string, unknown>)
          : undefined;
      const config = (errObj?.config ?? responseObj?.config) as
        (HttpRequestConfig & InternalAxiosRequestConfig) | undefined;

      // 3.1 清理取消协调器中的未决状态
      if (config) {
        const requestKey = (config as unknown as Record<string, unknown>).__requestKey as
          string | undefined;
        if (requestKey) {
          abortCoordinator.remove(requestKey);
        }
      }

      // 3.2 若为主动取消异常，受控抛出
      if (isAbortError(error)) {
        throw error;
      }

      // 3.3 构建或获取 BusinessException 实体
      let exception: BusinessException;
      if (error instanceof BusinessException) {
        exception = error;
      } else if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const responseData = error.response?.data;

        // 401 凭据失效自动清理并通知
        if (status === 401) {
          authManager.handleUnauthorized();
          onUnauthorized?.();
        }

        let code = status;
        let msg = error.message || `HTTP Request Failed (${status})`;
        let traceId: string | undefined = undefined;

        // 尝试从服务端响应结构体中提取更具体的业务错误与 traceId
        if (responseData && typeof responseData === 'object') {
          const rec = responseData as Record<string, unknown>;
          if (typeof rec.code === 'number') {
            code = rec.code;
          }
          if (typeof rec.msg === 'string') {
            msg = rec.msg;
          } else if (typeof rec.message === 'string') {
            msg = rec.message;
          }
          if (typeof rec.traceId === 'string') {
            traceId = rec.traceId;
          }
        }

        if (!traceId && error.response?.headers) {
          traceId = (error.response.headers['x-trace-id'] || error.response.headers['trace-id']) as
            string | undefined;
        }

        exception = new BusinessException(code, msg, traceId, error);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        exception = new BusinessException(500, message, undefined, error);
      }

      // 3.4 检查重试策略与幂等安全不变量
      if (config) {
        const customRecord = config as unknown as Record<string, unknown>;
        const originalSignal =
          (customRecord.__originalSignal as AbortSignal | undefined) ??
          (config.signal as AbortSignal | undefined);

        const maxRetries = config.retry ?? defaultRetry;
        const currentRetry = (customRecord.__retryCount as number | undefined) ?? 0;

        if (maxRetries > 0 && currentRetry < maxRetries && !originalSignal?.aborted) {
          const method = (config.method ?? 'GET').toUpperCase();
          const isIdempotent = isIdempotentMethod(method);

          let allowRetry = false;
          const customShouldRetry = config.shouldRetry ?? defaultShouldRetry;

          if (customShouldRetry) {
            allowRetry = customShouldRetry(exception);
          } else if (isIdempotent) {
            // 安全重试不变量：默认仅在幂等方法（GET、HEAD）且错误为网络中断、超时或 5xx 状态时按指数退避重试
            allowRetry = isRetriableError(exception, error);
          } else {
            // POST/PUT/DELETE 写操作默认严禁自动重试
            allowRetry = false;
          }

          if (allowRetry) {
            customRecord.__retryCount = currentRetry + 1;
            const baseDelay = config.retryDelay ?? defaultRetryDelay;
            const delayMs = calculateBackoffDelay(currentRetry, baseDelay);

            // 指数退避等待（支持外部 AbortSignal 联动唤醒）
            await sleep(delayMs, originalSignal);

            // 恢复原始 URL、baseURL 与 signal
            if (customRecord.__originalUrl) {
              config.url = customRecord.__originalUrl as string;
            }
            if (customRecord.__originalBaseURL !== undefined) {
              config.baseURL = customRecord.__originalBaseURL as string;
            }
            if (customRecord.__originalSignal !== undefined) {
              config.signal = customRecord.__originalSignal as AbortSignal | undefined;
            }

            return instance.request(config);
          }
        }
      }

      // 3.5 最终抛出统一因果业务异常
      throw exception;
    },
  );
}
