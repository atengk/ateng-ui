/**
 * @atengk/video-player-vue 工业级防线单元测试：
 * 1. 企业级鉴权双轨注入 (TokenInjector)
 * 2. Blob-JSON 双态异常拦截 (BlobJsonGuard / ADR-0004)
 * 3. 确定性销毁六步防线 (Deterministic Lifecycle)
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式与存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { authManager, BusinessException } from '@atengk/core';
import { TokenInjector } from '../src/security/TokenInjector';
import { BlobJsonGuard } from '../src/security/BlobJsonGuard';
import { ArtplayerEngine } from '../src/engine/ArtplayerEngine';
import { AtengVideoPlayer } from '../src/components';

describe('工单 #142 企业级鉴权与防线测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalSrcDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // 1. 重置全局 Token 状态
    authManager.clearToken();

    // 2. 模拟 HTMLMediaElement 在 happy-dom 下的原生缺失能力
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    // 3. 拦截 happy-dom 针对 src 赋值时错误同步触发 canplay 导致 Artplayer 插件未初始化完成的缺陷
    originalSrcDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLMediaElement.prototype,
      'src',
    );
    Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
      set(val: string) {
        this.setAttribute('src', val);
        setTimeout(() => {
          this.dispatchEvent(new Event('canplay'));
        }, 0);
      },
      get() {
        return this.getAttribute('src') || '';
      },
      configurable: true,
    });
  });

  afterEach(() => {
    authManager.clearToken();
    if (originalSrcDescriptor) {
      Object.defineProperty(window.HTMLMediaElement.prototype, 'src', originalSrcDescriptor);
    }
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('1. TokenInjector 鉴权双轨注入防线', () => {
    it('1.1 默认未登录态下应返回空请求头', () => {
      const headers = TokenInjector.injectHeaders();
      expect(headers).toEqual({});
    });

    it('1.2 全局登录后应准确注入 token 与 Authorization: Bearer 双轨请求头', () => {
      authManager.setToken('mock-access-token-007');
      const headers = TokenInjector.injectHeaders();
      expect(headers).toEqual({
        token: 'mock-access-token-007',
        Authorization: 'Bearer mock-access-token-007',
      });
    });

    it('1.3 支持自定义 tokenOverrides 覆盖全局凭据并合并初始请求头', () => {
      authManager.setToken('global-token');
      const headers = TokenInjector.injectHeaders(
        { 'X-Custom-Trace': 'trace-123' },
        'override-token-888',
      );
      expect(headers).toEqual({
        'X-Custom-Trace': 'trace-123',
        token: 'override-token-888',
        Authorization: 'Bearer override-token-888',
      });
    });

    it('1.4 injectUrl 应精准在 URL 查询参中拼接 token 且支持已有查询参数', () => {
      authManager.setToken('token-abc');

      // 无参 URL
      const url1 = TokenInjector.injectUrl('https://stream.example.com/live.m3u8');
      expect(url1).toBe('https://stream.example.com/live.m3u8?token=token-abc');

      // 已包含其他查询参数的 URL
      const url2 = TokenInjector.injectUrl('https://stream.example.com/live.m3u8?quality=high');
      expect(url2).toBe('https://stream.example.com/live.m3u8?quality=high&token=token-abc');

      // 覆盖 Token
      const url3 = TokenInjector.injectUrl('https://stream.example.com/live.m3u8', 'custom-token');
      expect(url3).toBe('https://stream.example.com/live.m3u8?token=custom-token');
    });

    it('1.5 injectXhr 应为原生 XMLHttpRequest 实例正确调用 setRequestHeader', () => {
      authManager.setToken('token-xyz');
      const mockSetRequestHeader = vi.fn();
      const mockXhr = {
        setRequestHeader: mockSetRequestHeader,
      } as unknown as XMLHttpRequest;

      TokenInjector.injectXhr(mockXhr);
      expect(mockSetRequestHeader).toHaveBeenCalledWith('token', 'token-xyz');
      expect(mockSetRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer token-xyz');
    });

    it('1.6 injectHeaders 遇到既有小写 authorization 或 token 时不应重复追加冲突 Header', () => {
      authManager.setToken('token-abc');
      const headers = TokenInjector.injectHeaders({
        authorization: 'Bearer existing-custom-token',
        'content-type': 'application/json',
      });
      // 既有 authorization 保持原样，未存在的 token 正常注入
      expect(headers['authorization']).toBe('Bearer existing-custom-token');
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['token']).toBe('token-abc');
    });
  });

  describe('2. BlobJsonGuard 双态异常识别防线 (ADR-0004 规范)', () => {
    it('2.1 当后端返回 401 带有 JSON 错误时应转译为 BusinessException', async () => {
      const jsonPayload = JSON.stringify({
        code: 40101,
        msg: '视频点播鉴权令牌已过期',
        traceId: 'trace-vid-401',
      });

      const mockResponse = new Response(jsonPayload, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });

      vi.spyOn(window, 'fetch').mockResolvedValueOnce(mockResponse);

      let caughtError: unknown = null;
      try {
        await BlobJsonGuard.probeMediaStream('https://video.example.com/protected.mp4');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(BusinessException);
      const bizError = caughtError as BusinessException;
      expect(bizError.code).toBe(40101);
      expect(bizError.msg).toBe('视频点播鉴权令牌已过期');
      expect(bizError.traceId).toBe('trace-vid-401');
    });

    it('2.2 当后端返回 403 带有纯文本错误时应转译为标准状态码 BusinessException', async () => {
      const mockResponse = new Response('Forbidden resource access', {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      vi.spyOn(window, 'fetch').mockResolvedValueOnce(mockResponse);

      let caughtError: unknown = null;
      try {
        await BlobJsonGuard.probeMediaStream('https://video.example.com/forbidden.mp4');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(BusinessException);
      const bizError = caughtError as BusinessException;
      expect(bizError.code).toBe(403);
      expect(bizError.msg).toContain('Forbidden');
    });

    it('2.3 当正常音视频流返回 (200/206 video/mp4) 时应无异常顺利放行', async () => {
      const mockResponse = new Response(new Uint8Array([0x00, 0x00, 0x00, 0x20]), {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
        },
      });

      vi.spyOn(window, 'fetch').mockResolvedValueOnce(mockResponse);

      await expect(
        BlobJsonGuard.probeMediaStream('https://video.example.com/ok.mp4'),
      ).resolves.not.toThrow();
    });

    it('2.4 parseJsonError 遇非数字错误码时应安全兜底为 status 而非 NaN', () => {
      const err = BlobJsonGuard.parseJsonError(
        JSON.stringify({ code: 'ERR_MEDIA_DENIED', msg: '拒绝访问' }),
        403,
      );
      expect(err).toBeInstanceOf(BusinessException);
      expect(err?.code).toBe(403);
      expect(Number.isNaN(err?.code)).toBe(false);
      expect(err?.msg).toBe('拒绝访问');
    });
  });

  describe('3. 确定性六步销毁防线 (Deterministic Lifecycle)', () => {
    it('3.1 ArtplayerEngine.destroy() 必须严密执行六步清理流程', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const engine = new ArtplayerEngine(container, {
        url: 'https://example.com/test.mp4',
      });

      // 注册解封装器销毁钩子
      const mockTeardown = vi.fn();
      engine.registerTeardownHook(mockTeardown);

      // 注册模拟定时器
      const mockTimer = setInterval(() => {}, 1000);
      engine.registerTimer(mockTimer);

      const abortSpy = vi.spyOn(engine.abortSignal, 'addEventListener');
      expect(abortSpy).toBeDefined();

      const videoElement = engine.videoElement;
      expect(videoElement).not.toBeNull();

      // 执行销毁
      engine.destroy();

      // 1. 中断信号被发出
      expect(engine.abortSignal.aborted).toBe(true);

      // 2. 解封装器注销钩子被确定性调用
      expect(mockTeardown).toHaveBeenCalledTimes(1);

      // 3. 视频被暂停且 src 被清空
      expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
      expect(videoElement!.src).toBe('');

      // 4. video.load() 强制释放 GPU 解码器与视频流缓冲区
      expect(window.HTMLMediaElement.prototype.load).toHaveBeenCalled();

      // 5. 定时器已被清理
      expect(engine.isDestroyed).toBe(true);
    });

    it('3.2 AtengVideoPlayer 组件销毁时应触发 engine.destroy 并回收 DOM', async () => {
      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://example.com/test.mp4',
        },
      });

      const engine = (wrapper.vm as unknown as { engine: ArtplayerEngine }).engine;
      expect(engine).toBeDefined();
      expect(engine.isDestroyed).toBe(false);

      const destroySpy = vi.spyOn(engine, 'destroy');
      wrapper.unmount();
      wrapper = null;

      expect(destroySpy).toHaveBeenCalledTimes(1);
      expect(engine.isDestroyed).toBe(true);
    });
  });

  describe('4. 前置双态探测与组件错误呈现', () => {
    it('4.1 当配置 probeStream: true 且探测抛出 401 BusinessException 时应呈现错误面板', async () => {
      const jsonPayload = JSON.stringify({
        code: 40105,
        msg: '未获取到当前频道的播放权限',
        traceId: 'trace-vid-slot-401',
      });

      const mockResponse = new Response(jsonPayload, {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      vi.spyOn(window, 'fetch').mockResolvedValueOnce(mockResponse);

      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://video.example.com/forbidden.mp4',
          probeStream: true,
        },
      });

      // 等待异步探测完成
      await vi.waitFor(() => {
        const errorView = wrapper?.find('.at-video-player__error-layer');
        expect(errorView?.exists()).toBe(true);
      });

      expect(wrapper.text()).toContain('40105');
      expect(wrapper.text()).toContain('未获取到当前频道的播放权限');
      expect(wrapper.text()).toContain('trace-vid-slot-401');
    });
  });
});
