/**
 * @atengk/ai-chat-vue AtengToolCallCard 工具调用卡片组件单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengToolCallCard from '../src/components/AtengToolCallCard.vue';
import type { ToolCallPayload } from '../src/types';

describe('AtengToolCallCard', () => {
  it('应当正确渲染工具名称、参数折叠展开与成功态结果', async () => {
    const payload: ToolCallPayload = {
      callId: 'call_test_1',
      name: 'get_weather',
      arguments: { city: '北京' },
      state: 'success',
      result: { temperature: 22, condition: '晴朗' },
    };

    const wrapper = mount(AtengToolCallCard, {
      props: {
        toolCall: payload,
      },
    });

    expect(wrapper.text()).toContain('get_weather');
    expect(wrapper.text()).toContain('调用成功');

    // 默认折叠，参数抽屉不可见或收起
    const toggleBtn = wrapper.find('.at-tool-card__toggle-btn');
    expect(toggleBtn.exists()).toBe(true);

    // 点击展开
    await toggleBtn.trigger('click');
    expect(wrapper.text()).toContain('"city": "北京"');
    expect(wrapper.text()).toContain('"temperature": 22');

    wrapper.unmount();
  });

  it('应当在 awaiting_approval 态下呈现人机审批交互，并触发 approve 与 reject 事件', async () => {
    const payload: ToolCallPayload = {
      callId: 'call_danger_1',
      name: 'drop_database_table',
      arguments: { tableName: 'user_logs' },
      state: 'awaiting_approval',
      requireConfirm: true,
    };

    const wrapper = mount(AtengToolCallCard, {
      props: {
        toolCall: payload,
      },
    });

    expect(wrapper.text()).toContain('drop_database_table');
    expect(wrapper.text()).toContain('等待审批');
    expect(wrapper.text()).toContain('敏感操作');

    // 审批按钮
    const approveBtn = wrapper.find('.at-tool-card__btn--approve');
    const rejectBtn = wrapper.find('.at-tool-card__btn--reject');
    expect(approveBtn.exists()).toBe(true);
    expect(rejectBtn.exists()).toBe(true);

    // 点击“允许执行”
    await approveBtn.trigger('click');
    expect(wrapper.emitted('approve')).toBeTruthy();
    expect(wrapper.emitted('approve')![0]).toEqual(['call_danger_1']);

    // 填写拒批理由并点击“拒绝执行”
    const input = wrapper.find('.at-tool-card__reject-input');
    await input.setValue('生产库禁止直接删除日志表');
    await rejectBtn.trigger('click');
    expect(wrapper.emitted('reject')).toBeTruthy();
    expect(wrapper.emitted('reject')![0]).toEqual(['call_danger_1', '生产库禁止直接删除日志表']);

    wrapper.unmount();
  });

  it('应当正确展示 error 异常与 rejected 拒批态信息', async () => {
    const errorPayload: ToolCallPayload = {
      callId: 'call_err_1',
      name: 'fetch_data',
      arguments: {},
      state: 'error',
      error: '网络超时 504 Gateway Timeout',
    };

    const wrapperErr = mount(AtengToolCallCard, {
      props: { toolCall: errorPayload },
    });
    expect(wrapperErr.text()).toContain('调用失败');
    expect(wrapperErr.text()).toContain('网络超时 504 Gateway Timeout');
    wrapperErr.unmount();

    const rejectedPayload: ToolCallPayload = {
      callId: 'call_rej_1',
      name: 'restart_cluster',
      arguments: {},
      state: 'rejected',
      rejectionReason: '运维人员驳回操作',
    };
    const wrapperRej = mount(AtengToolCallCard, {
      props: { toolCall: rejectedPayload },
    });
    expect(wrapperRej.text()).toContain('已拒绝');
    expect(wrapperRej.text()).toContain('运维人员驳回操作');
    wrapperRej.unmount();
  });
});
