/**
 * AtengLogViewer 实时日志终端组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { AtengLogViewer } from '../src/components/log-viewer';

describe('AtengLogViewer 实时日志终端组件交互与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('静态日志渲染：正确展示行号与日志内容，默认暗色主题', async () => {
    const logs = [
      '[INFO] System startup initialized',
      '[INFO] Database connection ready',
      '[WARN] High memory usage detected',
    ];
    const wrapper = mount(AtengLogViewer, {
      props: {
        logs,
        title: '生产运维监控终端',
      },
    });

    expect(wrapper.classes()).toContain('at-log-viewer');
    expect(wrapper.classes()).toContain('at-log-viewer--dark');
    expect(wrapper.find('.at-log-viewer__title').text()).toBe('生产运维监控终端');

    const lines = wrapper.findAll('.at-log-viewer__line');
    expect(lines.length).toBe(3);
    expect(lines[0].find('.at-log-viewer__line-content').text()).toBe(
      '[INFO] System startup initialized',
    );
    expect(lines[1].find('.at-log-viewer__line-no').text()).toBe('2');

    wrapper.unmount();
  });

  it('缓冲截断防内存泄漏：maxLines 限制日志缓冲区最大行数', async () => {
    const wrapper = mount(AtengLogViewer, {
      props: {
        logs: ['1', '2', '3', '4', '5'],
        maxLines: 4,
      },
    });

    // 初始 5 条，截断为后 4 条：2, 3, 4, 5
    let lines = wrapper.findAll('.at-log-viewer__line');
    expect(lines.length).toBe(4);
    expect(lines[0].find('.at-log-viewer__line-content').text()).toBe('2');
    expect(lines[3].find('.at-log-viewer__line-content').text()).toBe('5');

    // 通过 Expose appendLog 追加
    wrapper.vm.appendLog('6');
    await wrapper.vm.$nextTick();

    lines = wrapper.findAll('.at-log-viewer__line');
    expect(lines.length).toBe(4);
    expect(lines[0].find('.at-log-viewer__line-content').text()).toBe('3');
    expect(lines[3].find('.at-log-viewer__line-content').text()).toBe('6');

    wrapper.unmount();
  });

  it('关键字过滤与高亮：根据关键词动态收敛展示结果', async () => {
    const logs = [
      '[INFO] User 1001 login success',
      '[ERROR] Payment timeout on order 888',
      '[INFO] Cache hit ratio 98%',
      '[ERROR] Database lock wait timeout',
    ];

    const wrapper = mount(AtengLogViewer, {
      props: { logs },
    });

    expect(wrapper.findAll('.at-log-viewer__line').length).toBe(4);

    // 输入过滤关键词 ERROR
    const input = wrapper.find('.at-log-viewer__search-input input');
    await input.setValue('ERROR');
    await wrapper.vm.$nextTick();

    const filtered = wrapper.findAll('.at-log-viewer__line');
    expect(filtered.length).toBe(2);
    expect(filtered[0].find('.at-log-viewer__line-content').text()).toContain('Payment timeout');
    expect(filtered[1].find('.at-log-viewer__line-content').text()).toContain('Database lock');

    wrapper.unmount();
  });

  it('WebSocket 实时流感知：侦听 latestMessage 自动追加日志', async () => {
    const latestMessage = ref<unknown>(null);
    const status = ref<'OPEN' | 'CLOSED' | 'CONNECTING'>('OPEN');

    const fakeWs = {
      latestMessage,
      status,
    } as any;

    const wrapper = mount(AtengLogViewer, {
      props: {
        webSocket: fakeWs,
      },
    });

    expect(wrapper.findAll('.at-log-viewer__line').length).toBe(0);

    // 推送第一条文本消息
    latestMessage.value = '[GATEWAY] Inbound request GET /api/v1/users';
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.at-log-viewer__line').length).toBe(1);
    expect(wrapper.find('.at-log-viewer__line').text()).toContain('Inbound request');

    // 推送第二条 JSON 格式消息
    latestMessage.value = { event: 'USER_LOGIN', uid: 'U100' };
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.at-log-viewer__line').length).toBe(2);
    expect(wrapper.findAll('.at-log-viewer__line')[1].text()).toContain(
      '{"event":"USER_LOGIN","uid":"U100"}',
    );

    wrapper.unmount();
  });

  it('清屏、下载与滚屏状态流转：命令式与交互操作完备性', async () => {
    const wrapper = mount(AtengLogViewer, {
      props: {
        logs: ['Log 1', 'Log 2', 'Log 3'],
      },
    });

    // 1. 测试清屏
    wrapper.vm.clear();
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.at-log-viewer__line').length).toBe(0);
    expect(wrapper.emitted('clear')).toBeTruthy();

    // 2. 模拟下载
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    wrapper.vm.appendLog('New Log A');
    wrapper.vm.appendLog('New Log B');
    await wrapper.vm.$nextTick();

    wrapper.vm.download('test.log');
    expect(wrapper.emitted('download')).toBeTruthy();
    expect(wrapper.emitted('download')![0][0]).toEqual(['New Log A', 'New Log B']);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    wrapper.unmount();
  });
});
