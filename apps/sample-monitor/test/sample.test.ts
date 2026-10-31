/**
 * sample-monitor 展厅端到端自洽单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import App from '../src/App.vue';
import { sampleState, clearMonitorEvents } from '../src/state';
import { setupSampleMonitor, destroySampleMonitor } from '../src/monitor';

describe('sample-monitor 端到端自验展厅', () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    clearMonitorEvents();
    setupSampleMonitor();
  });

  afterEach(async () => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
    await destroySampleMonitor();
    clearMonitorEvents();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('应当成功挂载根组件并渲染 5 大自验面板骨架', () => {
    wrapper = mount(App, {
      global: {
        plugins: [ElementPlus],
      },
    });

    // 1. 验证标题与端口标识
    expect(wrapper.text()).toContain('@atengk/monitor 工业级全链路可观测性自验展厅');
    expect(wrapper.text()).toContain('Port: 3010');

    // 2. 验证各个面板标题
    expect(wrapper.text()).toContain('1. 故障注入与异常熔断');
    expect(wrapper.text()).toContain('2. 白屏感知与容器白名单');
    expect(wrapper.text()).toContain('3. 性能大盘与卡顿感知');
    expect(wrapper.text()).toContain('4. 行为轨迹与敏感脱敏');
    expect(wrapper.text()).toContain('5. 本地 Mock APM 实时事件接收终端');
  });

  it('触发故障注入与熔断模拟应当向 APM 终端派发对应遥测事件', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [ElementPlus],
      },
    });

    // 找到模拟 Vue 组件渲染异常按钮
    const vueErrorBtn = wrapper.findAll('button').find(b => b.text().includes('Vue 组件渲染异常'));
    expect(vueErrorBtn).toBeDefined();

    await vueErrorBtn!.trigger('click');

    // 验证事件送入了本地 APM 接收器
    expect(sampleState.events.length).toBeGreaterThan(0);
    const lastEvent = sampleState.events[0];
    expect(lastEvent).toBeDefined();
    expect(lastEvent?.type).toBe('error');
    expect(JSON.stringify(lastEvent?.payload)).toContain('UserProfileView');
  });

  it('触发 TraceId 串联应当提取并在状态栏回显', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [ElementPlus],
      },
    });

    const traceBtn = wrapper
      .findAll('button')
      .find(b => b.text().includes('模拟后端 TraceId 串联'));
    expect(traceBtn).toBeDefined();

    await traceBtn!.trigger('click');

    expect(sampleState.events.some(e => e.type === 'network')).toBe(true);
    expect(wrapper.text()).toContain('trace-mdc-');
  });
});
