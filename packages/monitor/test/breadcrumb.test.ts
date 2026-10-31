/**
 * BreadcrumbPlugin 用户行为面包屑与单页应用虚拟路由感知插件单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBreadcrumbPlugin, BreadcrumbPluginInstance } from '../src/plugins/breadcrumb';
import { MonitorKernel } from '../src/core/MonitorKernel';
import type { MonitorEvent, ErrorPayload, BreadcrumbItem } from '../src/types/event';

describe('BreadcrumbPlugin', () => {
  let kernel: MonitorKernel;
  let reporterSpy: ReturnType<typeof vi.fn>;
  let breadcrumbPlugin: BreadcrumbPluginInstance;

  beforeEach(() => {
    reporterSpy = vi.fn().mockResolvedValue(undefined);
    breadcrumbPlugin = createBreadcrumbPlugin({
      maxBreadcrumbs: 5,
    });

    kernel = new MonitorKernel({
      batchSize: 1,
      reporter: reporterSpy,
      plugins: [breadcrumbPlugin],
    });
    kernel.init();
  });

  afterEach(async () => {
    await kernel.destroy();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('环形缓冲区与基本操作', () => {
    it('应当能手动添加面包屑并维护定长环形缓冲区 (FIFO)', () => {
      for (let i = 1; i <= 7; i++) {
        breadcrumbPlugin.addBreadcrumb({
          type: 'custom',
          category: 'test',
          message: `Step ${i}`,
        });
      }

      const list = breadcrumbPlugin.getBreadcrumbs();
      expect(list.length).toBe(5);
      // 前两条 (Step 1, Step 2) 应被淘汰，保留 Step 3 ~ Step 7
      expect(list[0].message).toBe('Step 3');
      expect(list[4].message).toBe('Step 7');
      expect(list[0].timestamp).toBeGreaterThan(0);
    });

    it('应当能清空面包屑列表', () => {
      breadcrumbPlugin.addBreadcrumb({
        type: 'custom',
        category: 'test',
        message: 'Action 1',
      });
      expect(breadcrumbPlugin.getBreadcrumbs().length).toBe(1);

      breadcrumbPlugin.clear();
      expect(breadcrumbPlugin.getBreadcrumbs().length).toBe(0);
    });

    it('应当对非法 maxBreadcrumbs 配置实施边界截断保底', () => {
      const minPlugin = createBreadcrumbPlugin({ maxBreadcrumbs: -5 });
      minPlugin.addBreadcrumb({ type: 'custom', category: 'c', message: '1' });
      minPlugin.addBreadcrumb({ type: 'custom', category: 'c', message: '2' });
      expect(minPlugin.getBreadcrumbs().length).toBe(1); // 至少为 1

      const maxPlugin = createBreadcrumbPlugin({ maxBreadcrumbs: 500 });
      expect(maxPlugin.name).toBe('breadcrumb');
    });
  });

  describe('用户交互点击监听 (Click Breadcrumb) 与脱敏', () => {
    it('点击普通 DOM 按钮应当生成 click 面包屑', () => {
      const button = document.createElement('button');
      button.id = 'submit-btn';
      button.className = 'btn primary';
      button.textContent = '提交订单';
      document.body.appendChild(button);

      button.click();

      const list = breadcrumbPlugin.getBreadcrumbs();
      expect(list.length).toBe(1);
      const item = list[0];
      expect(item.type).toBe('click');
      expect(item.category).toBe('ui.click');
      expect(item.message).toContain('提交订单');
      expect(item.data?.selector).toContain('button#submit-btn');
      expect(item.data?.isMasked).toBe(false);
    });

    it('点击带有 [data-monitor-mask] 的敏感节点应实施掩码脱敏', () => {
      const sensitiveSpan = document.createElement('span');
      sensitiveSpan.setAttribute('data-monitor-mask', 'true');
      sensitiveSpan.textContent = '13800138000';
      document.body.appendChild(sensitiveSpan);

      sensitiveSpan.click();

      const list = breadcrumbPlugin.getBreadcrumbs();
      expect(list.length).toBe(1);
      const item = list[0];
      expect(item.type).toBe('click');
      expect(item.data?.text).toBe('******');
      expect(item.data?.isMasked).toBe(true);
      expect(item.message).toContain('******');
      expect(item.message).not.toContain('13800138000');
    });

    it('点击密码输入框应自动识别并掩码', () => {
      const pwdInput = document.createElement('input');
      pwdInput.type = 'password';
      pwdInput.value = 'secret123456';
      document.body.appendChild(pwdInput);

      pwdInput.click();

      const list = breadcrumbPlugin.getBreadcrumbs();
      expect(list.length).toBe(1);
      const item = list[0];
      expect(item.type).toBe('click');
      expect(item.data?.isMasked).toBe(true);
      expect(item.data?.text).toBe('******');
    });

    it('点击嵌套在脱敏容器内的深层子节点应当成功继承祖先脱敏规则', () => {
      const container = document.createElement('div');
      container.className = 'monitor-mask';
      const innerSpan = document.createElement('span');
      innerSpan.textContent = '敏感身份证号: 110101199001011234';
      container.appendChild(innerSpan);
      document.body.appendChild(container);

      innerSpan.click();

      const list = breadcrumbPlugin.getBreadcrumbs();
      expect(list.length).toBe(1);
      expect(list[0].data?.isMasked).toBe(true);
      expect(list[0].data?.text).toBe('******');
      expect(list[0].message).not.toContain('110101199001011234');
    });
  });

  describe('控制台日志代理 (Console Breadcrumb)', () => {
    it('调用 console.log/info/warn 应当生成对应的行为面包屑且不破坏原生输出', () => {
      console.log('User navigating to dashboard', { id: 1001 });
      console.info('Config loaded');
      console.warn('Network latency high');

      const list = breadcrumbPlugin.getBreadcrumbs();
      expect(list.length).toBe(3);

      expect(list[0].type).toBe('console');
      expect(list[0].category).toBe('console.log');
      expect(list[0].message).toContain('User navigating to dashboard');

      expect(list[1].category).toBe('console.info');
      expect(list[1].message).toContain('Config loaded');

      expect(list[2].category).toBe('console.warn');
      expect(list[2].level).toBe('warn');
      expect(list[2].message).toContain('Network latency high');
    });

    it('console 打印包含循环引用对象或超长参数时应当安全序列化绝不抛出崩溃', () => {
      const circularObj: Record<string, unknown> = { name: 'circular' };
      circularObj.self = circularObj;

      // 验证不抛出 TypeError: Converting circular structure to JSON
      expect(() => {
        console.log('Circular data:', circularObj);
      }).not.toThrow();

      const list = breadcrumbPlugin.getBreadcrumbs();
      const last = list[list.length - 1];
      expect(last.type).toBe('console');
      expect(last.message).toContain('Circular data:');
    });
  });

  describe('SPA 虚拟路由感知与 PAGE_VIEW 派发', async () => {
    it('调用 history.pushState 应当记录 route 面包屑并派发 PAGE_VIEW 事件', async () => {
      // 触发 pushState 路由变更
      window.history.pushState({ page: 'users' }, '', '/users?keyword=ateng');

      // 等待宏任务/RAF 完成渲染耗时结算
      await new Promise(resolve => setTimeout(resolve, 50));

      // 1. 验证产生了 route 面包屑
      const list = breadcrumbPlugin.getBreadcrumbs();
      const routeBreadcrumb = list.find(item => item.type === 'route');
      expect(routeBreadcrumb).toBeDefined();
      expect(routeBreadcrumb?.category).toBe('navigation');
      expect(routeBreadcrumb?.data?.to).toContain('/users');

      // 2. 验证内核自动派发了 PAGE_VIEW 遥测事件
      const pageViewCall = reporterSpy.mock.calls.find(
        call => call[0][0]?.payload?.name === 'PAGE_VIEW',
      );
      expect(pageViewCall).toBeDefined();
      const pageViewEvent: MonitorEvent<{
        name: string;
        from: string;
        to: string;
        trigger: string;
        duration: number;
      }> = pageViewCall[0][0];

      expect(pageViewEvent.type).toBe('custom');
      expect(pageViewEvent.payload.name).toBe('PAGE_VIEW');
      expect(pageViewEvent.payload.to).toContain('/users');
      expect(pageViewEvent.payload.trigger).toBe('pushState');
      expect(typeof pageViewEvent.payload.duration).toBe('number');
    });

    it('触发 popstate 事件时应当记录虚拟路由流转', async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'home' } }));

      await new Promise(resolve => setTimeout(resolve, 50));

      const list = breadcrumbPlugin.getBreadcrumbs();
      const routeBreadcrumb = list.find(item => item.type === 'route');
      expect(routeBreadcrumb).toBeDefined();
      expect(routeBreadcrumb?.data?.trigger).toBe('popstate');
    });

    it('触发 hashchange 事件时应当感知 Hash 虚拟路由变化', async () => {
      window.location.hash = '#/settings';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      await new Promise(resolve => setTimeout(resolve, 50));

      const list = breadcrumbPlugin.getBreadcrumbs();
      const routeBreadcrumb = list.find(item => item.data?.trigger === 'hashchange');
      expect(routeBreadcrumb).toBeDefined();
      expect(routeBreadcrumb?.data?.to).toContain('#/settings');
    });
  });

  describe('异常上报时自动富化面包屑时间轴', () => {
    it('捕获异常时应当在 ErrorPayload 中自动携带最近的行为轨迹快照', () => {
      // 1. 记录前置行为
      console.log('Action A: Open modal');
      const button = document.createElement('button');
      button.id = 'confirm-btn';
      button.textContent = '确定付款';
      document.body.appendChild(button);
      button.click();

      // 2. 触发异常
      kernel.captureException(new Error('Payment failed'));

      expect(reporterSpy).toHaveBeenCalled();
      const errorCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'error');
      expect(errorCalls.length).toBe(1);

      const errorEvent: MonitorEvent<ErrorPayload> = errorCalls[0][0][0];
      expect(errorEvent.payload.breadcrumbs).toBeDefined();
      const breadcrumbs = errorEvent.payload.breadcrumbs as BreadcrumbItem[];
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(2);
      expect(breadcrumbs.some(b => b.type === 'console')).toBe(true);
      expect(breadcrumbs.some(b => b.type === 'click')).toBe(true);
    });
  });

  describe('确定性生命周期与注销恢复 (teardown)', () => {
    it('卸载插件后应当完全恢复原生 history 与 console 方法，且停止捕获点击', async () => {
      const wrappedPushState = window.history.pushState;
      const wrappedConsoleLog = console.log;

      // 销毁内核
      await kernel.destroy();

      // 验证原生方法是否已恢复（不再是 setup 期间包装的拦截函数）
      expect(window.history.pushState).not.toBe(wrappedPushState);
      expect(console.log).not.toBe(wrappedConsoleLog);

      // 点击 DOM 不再记录
      const btn = document.createElement('button');
      btn.textContent = '测试按钮';
      document.body.appendChild(btn);
      btn.click();

      expect(breadcrumbPlugin.getBreadcrumbs().length).toBe(0);
    });
  });
});
