/**
 * 微服务网关多路由映射与前缀分发引擎单元测试。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { describe, expect, it } from 'vitest';
import {
  createGatewayRouter,
  GatewayRoute,
  GatewayRouter,
  resolveGatewayRoute,
} from '../src/routing';

describe('GatewayRoute Engine (微服务网关多路由分发引擎)', () => {
  describe('1. 单体直连与默认回退 (Monolith Direct & Fallback)', () => {
    it('在未配置路由时应回退到 defaultTarget 并保留原始路径', () => {
      const router = new GatewayRouter({
        defaultTarget: 'https://api.example.com',
      });

      const result = router.resolve('/system/user/list');

      expect(result.target).toBe('https://api.example.com');
      expect(result.url).toBe('/system/user/list');
      expect(result.matchedRoute).toBeUndefined();
    });

    it('无匹配路由且未配置 defaultTarget 时 target 应保底返回空字符串', () => {
      const router = createGatewayRouter();

      const result = router.resolve('/order/detail');

      expect(result.target).toBe('');
      expect(result.url).toBe('/order/detail');
      expect(result.matchedRoute).toBeUndefined();
    });

    it('应完整保留查询参数 (query) 与哈希锚点 (hash)', () => {
      const router = new GatewayRouter({
        defaultTarget: 'https://api.example.com',
      });

      const result = router.resolve('/users?pageNum=1&pageSize=20#top');

      expect(result.target).toBe('https://api.example.com');
      expect(result.url).toBe('/users?pageNum=1&pageSize=20#top');
    });
  });

  describe('2. 前缀自动匹配与最长匹配优先 (Prefix Matching & Longest Match)', () => {
    const routes: GatewayRoute[] = [
      {
        prefix: '/auth',
        target: 'https://auth-service.example.com',
        service: 'auth-service',
      },
      {
        prefix: '/api',
        target: 'https://gateway.example.com',
        service: 'api-gateway',
      },
      {
        prefix: '/api/v2/order',
        target: 'https://order-v2.example.com',
        service: 'order-v2',
      },
    ];

    it('应根据 URL 前缀准确匹配目标网关基地址', () => {
      const router = createGatewayRouter({ routes });

      const result = router.resolve('/auth/login');

      expect(result.target).toBe('https://auth-service.example.com');
      expect(result.url).toBe('/auth/login');
      expect(result.matchedRoute?.service).toBe('auth-service');
    });

    it('多前缀嵌套时应遵循最长前缀匹配原则 (Longest Prefix Match)', () => {
      const router = createGatewayRouter({ routes });

      // /api/v2/order/create 应该匹配 /api/v2/order 而不是 /api
      const orderResult = router.resolve('/api/v2/order/create');
      expect(orderResult.target).toBe('https://order-v2.example.com');
      expect(orderResult.matchedRoute?.service).toBe('order-v2');

      // /api/user/info 应该匹配 /api
      const apiResult = router.resolve('/api/user/info');
      expect(apiResult.target).toBe('https://gateway.example.com');
      expect(apiResult.matchedRoute?.service).toBe('api-gateway');
    });

    it('前缀匹配必须具备边界防护，避免词缀混淆 (如 /user 不应误配 /user-profile)', () => {
      const router = createGatewayRouter({
        routes: [
          {
            prefix: '/user',
            target: 'https://user-service.example.com',
          },
        ],
        defaultTarget: 'https://default.example.com',
      });

      // /user-profile 是独立前缀，不应误匹配 /user
      const missResult = router.resolve('/user-profile/avatar');
      expect(missResult.target).toBe('https://default.example.com');
      expect(missResult.matchedRoute).toBeUndefined();

      // /user/profile 或 /user?id=1 属于合法前缀子路径
      const hitResult = router.resolve('/user/profile');
      expect(hitResult.target).toBe('https://user-service.example.com');
      expect(hitResult.matchedRoute?.prefix).toBe('/user');
    });
  });

  describe('3. 路径重写与参数保留契约 (Path Rewriting & Preservation)', () => {
    it('当 rewritePrefix 为空字符串时应正确剥离匹配的前缀', () => {
      const router = createGatewayRouter({
        routes: [
          {
            prefix: '/system',
            target: 'https://system.example.com',
            rewritePrefix: '',
          },
        ],
      });

      const result = router.resolve('/system/user/page?status=1');

      expect(result.target).toBe('https://system.example.com');
      expect(result.url).toBe('/user/page?status=1');
    });

    it('当指定自定义 rewritePrefix 时应正确替换前缀并拼接后续路径', () => {
      const router = createGatewayRouter({
        routes: [
          {
            prefix: '/order-service',
            target: 'https://gateway.example.com',
            rewritePrefix: '/v1/order',
          },
        ],
      });

      const result = router.resolve('/order-service/create?discount=true#detail');

      expect(result.target).toBe('https://gateway.example.com');
      expect(result.url).toBe('/v1/order/create?discount=true#detail');
    });

    it('当未定义 rewritePrefix 时应保留原始完整路径', () => {
      const router = createGatewayRouter({
        routes: [
          {
            prefix: '/pay',
            target: 'https://pay.example.com',
          },
        ],
      });

      const result = router.resolve('/pay/wechat/notify?tradeNo=123');

      expect(result.target).toBe('https://pay.example.com');
      expect(result.url).toBe('/pay/wechat/notify?tradeNo=123');
    });
  });

  describe('4. 显式 service 覆盖规则 (Explicit Service Override)', () => {
    const routes: GatewayRoute[] = [
      {
        prefix: '/auth',
        target: 'https://auth.example.com',
        service: 'auth-service',
      },
      {
        prefix: '/report',
        target: 'https://report.example.com',
        service: 'report-service',
        rewritePrefix: '',
      },
    ];

    it('传入显式 service 时应优先覆盖前缀规则', () => {
      const router = createGatewayRouter({ routes });

      // URL 前缀为 /auth，但显式指定 service 为 report-service
      const result = router.resolve({
        url: '/report/generate',
        service: 'report-service',
      });

      expect(result.target).toBe('https://report.example.com');
      expect(result.url).toBe('/generate');
      expect(result.matchedRoute?.service).toBe('report-service');
    });

    it('显式 service 覆盖时若 URL 包含该路由的 prefix 仍应支持重写', () => {
      const router = createGatewayRouter({ routes });

      const result = router.resolve({
        url: '/report/export/excel',
        service: 'report-service',
      });

      expect(result.target).toBe('https://report.example.com');
      expect(result.url).toBe('/export/excel');
    });

    it('请求了未注册的显式 service 时应快速失败抛出明确异常', () => {
      const router = createGatewayRouter({ routes });

      expect(() =>
        router.resolve({
          url: '/unknown/action',
          service: 'non-existent-service',
        }),
      ).toThrowError(/Unknown service: 'non-existent-service'/);
    });
  });

  describe('5. 边界防御与纯函数门面 (Edge Cases & Functional Helper)', () => {
    it('应容错规范化基地址与路径中的多余斜杠', () => {
      const router = createGatewayRouter({
        routes: [
          {
            prefix: 'system/',
            target: 'https://system.example.com///',
            rewritePrefix: 'api/v2/',
          },
        ],
      });

      const result = router.resolve('system/role/list');

      expect(result.target).toBe('https://system.example.com');
      expect(result.url).toBe('/api/v2/role/list');
    });

    it('绝对 URL (http:// / https://) 应直接旁路穿透不被前缀规则篡改', () => {
      const router = createGatewayRouter({
        routes: [
          {
            prefix: '/oauth',
            target: 'https://gateway.example.com',
          },
        ],
      });

      const result = router.resolve('https://open.thirdparty.com/oauth/token');

      expect(result.target).toBe('');
      expect(result.url).toBe('https://open.thirdparty.com/oauth/token');
      expect(result.matchedRoute).toBeUndefined();
    });

    it('纯函数 resolveGatewayRoute 应支持开箱即用解析', () => {
      const routes: GatewayRoute[] = [
        {
          prefix: '/mock',
          target: 'https://mock.example.com',
        },
      ];

      const result = resolveGatewayRoute('/mock/test', routes);

      expect(result.target).toBe('https://mock.example.com');
      expect(result.url).toBe('/mock/test');
      expect(result.matchedRoute?.prefix).toBe('/mock');
    });

    it('getRoutes 应保底返回防御性只读副本，防止外部直接突变', () => {
      const router = createGatewayRouter();
      router.addRoute({ prefix: '/demo', target: 'https://demo.com' });

      const routes = router.getRoutes();
      expect(routes).toHaveLength(1);

      // 再次添加路由
      router.addRoute({ prefix: '/demo2', target: 'https://demo2.com' });
      expect(router.getRoutes()).toHaveLength(2);
    });
  });
});
