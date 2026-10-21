/**
 * AtengCaptcha 验证码倒计时组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengCaptcha } from '../src/components/captcha';

describe('AtengCaptcha 验证码与防刷新倒计时按钮交互与契约测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('初始按钮文案与默认未倒计时态', async () => {
    const wrapper = mount(AtengCaptcha, {
      props: {
        text: '获取验证码',
        seconds: 60,
      },
    });

    expect(wrapper.classes()).toContain('at-captcha');
    expect(wrapper.classes()).toContain('at-captcha--button');
    expect(wrapper.find('button').text()).toBe('获取验证码');
    expect(wrapper.vm.isCounting).toBe(false);

    wrapper.unmount();
  });

  it('倒计时生命周期：启动、跳动与结束流转', async () => {
    const wrapper = mount(AtengCaptcha, {
      props: {
        seconds: 10,
        countdownText: '{s}秒后重发',
        retryText: '再次获取',
      },
    });

    // 启动
    const startResult = await wrapper.vm.start();
    expect(startResult).toBe(true);
    expect(wrapper.emitted('start')).toBeTruthy();
    expect(wrapper.vm.isCounting).toBe(true);
    expect(wrapper.find('button').text()).toBe('10秒后重发');

    // 前进 3 秒
    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.remainingSeconds).toBe(7);
    expect(wrapper.find('button').text()).toBe('7秒后重发');
    expect(wrapper.emitted('change')).toBeTruthy();

    // 前进 7 秒直至结束
    vi.advanceTimersByTime(7000);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isCounting).toBe(false);
    expect(wrapper.emitted('end')).toBeTruthy();
    expect(wrapper.find('button').text()).toBe('再次获取');

    wrapper.unmount();
  });

  it('beforeSend 前置校验拦截机制：返回 false 时拒绝启动', async () => {
    const beforeSend = vi.fn().mockResolvedValue(false);
    const send = vi.fn();

    const wrapper = mount(AtengCaptcha, {
      props: {
        beforeSend,
        send,
      },
    });

    const success = await wrapper.vm.start();
    expect(success).toBe(false);
    expect(beforeSend).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.vm.isCounting).toBe(false);

    wrapper.unmount();
  });

  it('storageKey 持久化防刷新清零机制', async () => {
    const storageKey = 'test_sms_captcha_key';

    // 挂载组件 1 并启动 60 秒倒计时
    const wrapper1 = mount(AtengCaptcha, {
      props: {
        storageKey,
        seconds: 60,
      },
    });

    await wrapper1.vm.start();
    expect(wrapper1.vm.isCounting).toBe(true);
    expect(localStorage.getItem(storageKey)).toBeTruthy();

    // 时间流逝 20 秒
    vi.advanceTimersByTime(20000);
    await wrapper1.vm.$nextTick();
    expect(wrapper1.vm.remainingSeconds).toBe(40);

    // 销毁组件 1 (模拟页面刷新前离开)
    wrapper1.unmount();

    // 时间在页面刷新间隙再流逝 5 秒
    vi.advanceTimersByTime(5000);

    // 重新挂载组件 2 (模拟页面刷新重新加载)
    const wrapper2 = mount(AtengCaptcha, {
      props: {
        storageKey,
        seconds: 60,
      },
    });

    // 预期自动恢复倒计时，剩余约为 35 秒
    expect(wrapper2.vm.isCounting).toBe(true);
    expect(wrapper2.vm.remainingSeconds).toBe(35);

    wrapper2.unmount();
  });

  it('命令式 reset() 重置状态并清除 Storage 记录', async () => {
    const storageKey = 'reset_test_key';
    const wrapper = mount(AtengCaptcha, {
      props: {
        storageKey,
        seconds: 60,
      },
    });

    await wrapper.vm.start();
    expect(localStorage.getItem(storageKey)).toBeTruthy();

    wrapper.vm.reset();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.isCounting).toBe(false);
    expect(wrapper.vm.remainingSeconds).toBe(0);
    expect(localStorage.getItem(storageKey)).toBeNull();

    wrapper.unmount();
  });

  it('并发防重与互斥锁：倒计时中重复调用 start() 立即拒绝', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(AtengCaptcha, {
      props: {
        seconds: 30,
        send,
      },
    });

    const first = await wrapper.vm.start();
    expect(first).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);

    // 倒计时中再次调用
    const second = await wrapper.vm.start();
    expect(second).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('发送异常容错：send 方法抛错时触发 error 事件，释放 loading 锁', async () => {
    const sendError = new Error('网络请求超时');
    const send = vi.fn().mockRejectedValue(sendError);

    const wrapper = mount(AtengCaptcha, {
      props: {
        seconds: 60,
        send,
      },
    });

    const success = await wrapper.vm.start();
    expect(success).toBe(false);
    expect(wrapper.emitted('error')?.[0]?.[0]).toBe(sendError);
    expect(wrapper.vm.isCounting).toBe(false);
    expect(wrapper.vm.isLoading).toBe(false);

    wrapper.unmount();
  });

  it('图形验证码形态与点击刷新', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(AtengCaptcha, {
      props: {
        type: 'image',
        imageSrc: 'https://example.com/captcha.png',
        refresh,
      },
    });

    expect(wrapper.classes()).toContain('at-captcha--image');
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/captcha.png');

    await wrapper.find('.at-captcha__image-box').trigger('click');
    expect(refresh).toHaveBeenCalled();

    wrapper.unmount();
  });
});
