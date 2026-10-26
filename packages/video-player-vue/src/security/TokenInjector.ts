/**
 * TokenInjector: 企业级通用双轨鉴权凭据注入器。
 *
 * 全链路对接 @atengk/core 的 AuthManager，自动为视频流请求注入
 * token 与 Authorization: Bearer <token> 双轨请求头，支持 XHR、Fetch 与 URL 参数注入。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { authManager as defaultAuthManager, AuthManager } from '@atengk/core';

export interface TokenInjectorOptions {
  /**
   * 自定义 AuthManager 实例，未指定时默认使用 @atengk/core 的单例。
   */
  authManager?: AuthManager;
  /**
   * 自定义 Token 提取函数（可选逃生门）。
   */
  tokenGetter?: () => string | null;
  /**
   * URL 查询参数名，默认 'token'。
   */
  urlParamName?: string;
}

export class TokenInjector {
  private readonly authManagerInstance: AuthManager;
  private readonly tokenGetter?: () => string | null;
  private readonly urlParamName: string;

  constructor(options: TokenInjectorOptions = {}) {
    this.authManagerInstance = options.authManager ?? defaultAuthManager;
    this.tokenGetter = options.tokenGetter;
    this.urlParamName = options.urlParamName ?? 'token';
  }

  /**
   * 获取当前有效 Token。
   */
  getToken(): string | null {
    if (this.tokenGetter) {
      return this.tokenGetter();
    }
    return this.authManagerInstance.getToken();
  }

  /**
   * 获取注入双轨 Token 的请求头字典。
   */
  getHeaders(): Record<string, string> {
    const customToken = this.tokenGetter ? this.tokenGetter() : null;
    if (customToken) {
      return {
        token: customToken,
        Authorization: `Bearer ${customToken}`,
      };
    }
    return this.authManagerInstance.getHeaders();
  }

  /**
   * 为既有 Headers 注入双轨凭据。
   *
   * @param headers 既有请求头
   * @returns 注入凭据后的请求头集合
   */
  injectHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const injected = { ...headers };
    const authHeaders = this.getHeaders();

    for (const [key, val] of Object.entries(authHeaders)) {
      if (val && !injected[key]) {
        injected[key] = val;
      }
    }

    return injected;
  }

  /**
   * 为原生 XMLHttpRequest 实例自动注入双轨凭据 Header。
   *
   * @param xhr 物理 XMLHttpRequest 实例
   */
  injectXhr(xhr: XMLHttpRequest): void {
    const headers = this.getHeaders();
    for (const [key, val] of Object.entries(headers)) {
      if (val) {
        try {
          xhr.setRequestHeader(key, val);
        } catch {
          // 防御性忽略非 OPEN 状态时的异常
        }
      }
    }
  }

  /**
   * 为标准 Fetch RequestInit 配置注入双轨请求头。
   *
   * @param init 基础 RequestInit 配置
   * @returns 注入鉴权头后的 RequestInit
   */
  injectFetch(init: RequestInit = {}): RequestInit {
    const existingHeaders = (init.headers as Record<string, string>) || {};
    return {
      ...init,
      headers: this.injectHeaders(existingHeaders),
    };
  }

  /**
   * 为流媒体直链 URL 追加 Token 查询参数（防盗链兜底）。
   *
   * @param url 媒体 URL
   * @returns 带有 Token 参数的 URL
   */
  injectUrl(url: string): string {
    const token = this.getToken();
    if (!token || !url) {
      return url;
    }

    try {
      const parsed = new URL(
        url,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      );
      if (!parsed.searchParams.has(this.urlParamName)) {
        parsed.searchParams.set(this.urlParamName, token);
      }
      return parsed.toString();
    } catch {
      // 相对路径降级拼接
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${encodeURIComponent(this.urlParamName)}=${encodeURIComponent(token)}`;
    }
  }

  // --- 静态门面便捷方法 (委托至全局单例) ---

  /**
   * 静态快捷方式：获取当前全局有效 Token。
   */
  static getToken(): string | null {
    return defaultTokenInjector.getToken();
  }

  /**
   * 静态快捷方式：为既有 Headers 注入双轨凭据。
   *
   * @param headers 既有请求头
   * @param tokenOverrides 可选覆盖凭据
   */
  static injectHeaders(
    headers: Record<string, string> = {},
    tokenOverrides?: string,
  ): Record<string, string> {
    if (tokenOverrides) {
      return {
        ...headers,
        token: tokenOverrides,
        Authorization: `Bearer ${tokenOverrides}`,
      };
    }
    return defaultTokenInjector.injectHeaders(headers);
  }

  /**
   * 静态快捷方式：为原生 XMLHttpRequest 实例自动注入双轨凭据 Header。
   *
   * @param xhr 物理 XMLHttpRequest 实例
   */
  static injectXhr(xhr: XMLHttpRequest): void {
    defaultTokenInjector.injectXhr(xhr);
  }

  /**
   * 静态快捷方式：为标准 Fetch RequestInit 配置注入双轨请求头。
   *
   * @param init 基础 RequestInit 配置
   */
  static injectFetch(init: RequestInit = {}): RequestInit {
    return defaultTokenInjector.injectFetch(init);
  }

  /**
   * 静态快捷方式：为流媒体直链 URL 追加 Token 查询参数。
   *
   * @param url 媒体 URL
   * @param tokenOverrides 可选覆盖凭据
   */
  static injectUrl(url: string, tokenOverrides?: string): string {
    if (tokenOverrides) {
      const tempInjector = new TokenInjector({ tokenGetter: () => tokenOverrides });
      return tempInjector.injectUrl(url);
    }
    return defaultTokenInjector.injectUrl(url);
  }
}

/**
 * 默认全局 Token 注入器单例。
 */
export const defaultTokenInjector: TokenInjector = new TokenInjector();
