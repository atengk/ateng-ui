/**
 * AtengFooterBar 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { AtengFooterBar } from '../src/components/footer-bar';
import { ATENG_PRO_LAYOUT_KEY } from '../src/components/pro-layout';

describe('AtengFooterBar 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('基础渲染：默认 sticky 模式，包含操作按钮与边框', () => {
    wrapper = mount(AtengFooterBar, {
      slots: {
        default: '<button class="submit-btn">提交</button>',
        extra: '<span class="status-tip">已自动保存草稿</span>',
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.exists()).toBe(true);
    expect(bar.classes()).toContain('is-sticky');
    expect(bar.classes()).toContain('is-bordered');
    expect(wrapper.find('.submit-btn').exists()).toBe(true);
    expect(wrapper.find('.status-tip').exists()).toBe(true);
  });

  it('fixed 模式与防遮挡占位垫块 (placeholder)', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        placeholder: true,
        height: 60,
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.classes()).toContain('is-fixed');
    expect(bar.attributes('style')).toContain('position: fixed');

    // 占位垫块
    const placeholder = wrapper.find('.at-footer-bar__placeholder');
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.attributes('style')).toContain('height: 60px');
  });

  it('关闭 placeholder 时不渲染占位块', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        placeholder: false,
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-footer-bar__placeholder').exists()).toBe(false);
  });

  it('智能对齐：开启 autoOffset 时，通过 target 动态测量并设置 left 与 width', async () => {
    const container = document.createElement('div');
    container.className = 'custom-layout-main';
    document.body.appendChild(container);

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 220,
      top: 0,
      right: 1220,
      bottom: 900,
      width: 1000,
      height: 900,
      x: 220,
      y: 0,
      toJSON: () => {},
    });

    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        autoOffset: true,
        target: '.custom-layout-main',
      },
      attachTo: document.body,
    });

    await nextTick();
    const bar = wrapper.find('.at-footer-bar');
    expect(bar.attributes('style')).toContain('left: 220px');
    expect(bar.attributes('style')).toContain('width: 1000px');
  });

  it('智能对齐：未显式传 target 时，自动向上寻找 .at-page-container 或父容器', async () => {
    const parent = document.createElement('div');
    parent.className = 'at-page-container';
    document.body.appendChild(parent);

    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      left: 180,
      top: 0,
      right: 980,
      bottom: 700,
      width: 800,
      height: 700,
      x: 180,
      y: 0,
      toJSON: () => {},
    });

    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        autoOffset: true,
      },
      attachTo: parent,
    });

    await nextTick();
    const bar = wrapper.find('.at-footer-bar');
    expect(bar.attributes('style')).toContain('left: 180px');
    expect(bar.attributes('style')).toContain('width: 800px');
  });

  it('智能对齐：容器 Resize 触发回调后，平滑更新 left 与 width', async () => {
    let roCallback: () => void = () => {};
    class MockResizeObserver {
      constructor(callback: () => void) {
        roCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    const originalRO = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      const container = document.createElement('div');
      container.className = 'resizable-container';
      document.body.appendChild(container);

      let currentLeft = 200;
      let currentWidth = 800;

      vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => ({
        left: currentLeft,
        top: 0,
        right: currentLeft + currentWidth,
        bottom: 600,
        width: currentWidth,
        height: 600,
        x: currentLeft,
        y: 0,
        toJSON: () => {},
      }));

      wrapper = mount(AtengFooterBar, {
        props: {
          position: 'fixed',
          autoOffset: true,
          target: '.resizable-container',
        },
        attachTo: document.body,
      });

      await nextTick();
      const bar = wrapper.find('.at-footer-bar');
      expect(bar.attributes('style')).toContain('left: 200px');
      expect(bar.attributes('style')).toContain('width: 800px');

      // 模拟侧边栏折叠：left 变为 64，width 变为 936
      currentLeft = 64;
      currentWidth = 936;
      roCallback();

      // 推进 requestAnimationFrame
      await new Promise(resolve => requestAnimationFrame(resolve));
      await nextTick();

      expect(bar.attributes('style')).toContain('left: 64px');
      expect(bar.attributes('style')).toContain('width: 936px');
    } finally {
      window.ResizeObserver = originalRO;
    }
  });

  it('确定性生命周期清理：组件销毁时断开 ResizeObserver 监听', async () => {
    const disconnectSpy = vi.fn();
    const observeSpy = vi.fn();

    class MockResizeObserver {
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    }

    const originalRO = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      wrapper = mount(AtengFooterBar, {
        props: {
          position: 'fixed',
          autoOffset: true,
        },
        attachTo: document.body,
      });

      await nextTick();
      expect(observeSpy).toHaveBeenCalled();

      wrapper.unmount();
      wrapper = null;
      expect(disconnectSpy).toHaveBeenCalled();
    } finally {
      window.ResizeObserver = originalRO;
    }
  });

  it('预置快捷操作开箱即用：配置 showSubmit/showReset/showCancel 渲染标准操作流', async () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        showSubmit: true,
        submitText: '保存并发布',
        showReset: true,
        resetText: '清空重填',
        showCancel: true,
        cancelText: '放弃返回',
      },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll('.at-footer-bar__actions .el-button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].text()).toBe('放弃返回');
    expect(buttons[1].text()).toBe('清空重填');
    expect(buttons[2].text()).toBe('保存并发布');
    expect(buttons[2].classes()).toContain('el-button--primary');
  });

  it('零胶水自动判定：传入 onSubmit / onReset / onCancel 时自动启用对应预置按钮', async () => {
    const onSubmit = vi.fn();
    const onReset = vi.fn();

    wrapper = mount(AtengFooterBar, {
      props: {
        onSubmit,
        onReset,
      },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll('.at-footer-bar__actions .el-button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].text()).toBe('重置');
    expect(buttons[1].text()).toBe('提交');

    // 触发重置
    await buttons[0].trigger('click');
    expect(onReset).toHaveBeenCalledTimes(1);

    // 触发提交
    await buttons[1].trigger('click');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('事件派发模式：未提供 onSubmit 时点击提交按钮派发 submit 事件', async () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        showSubmit: true,
        showReset: true,
        showCancel: true,
      },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll('.at-footer-bar__actions .el-button');
    await buttons[0].trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();

    await buttons[1].trigger('click');
    expect(wrapper.emitted('reset')).toBeTruthy();

    await buttons[2].trigger('click');
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('异步 Loading 互斥防重锁：onSubmit 返回 Promise 时自动接管加载态与防重点击，resolve 后恢复', async () => {
    let resolvePromise!: () => void;
    const promise = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
    const onSubmitMock = vi.fn().mockReturnValue(promise);

    wrapper = mount(AtengFooterBar, {
      props: {
        showSubmit: true,
        onSubmit: onSubmitMock,
      },
      attachTo: document.body,
    });

    const submitBtn = wrapper.find('.at-footer-bar__actions .el-button--primary');
    expect(submitBtn.exists()).toBe(true);

    // 1. 点击提交 -> 触发异步任务并进入 loading 互斥锁态
    await submitBtn.trigger('click');
    expect(onSubmitMock).toHaveBeenCalledTimes(1);

    await nextTick();
    expect(submitBtn.classes()).toContain('is-loading');
    expect(submitBtn.attributes('disabled')).toBeDefined();

    // 2. 处于 loading 时重复连击 -> 必须被互斥锁阻断，不得二次调用 onSubmit
    await submitBtn.trigger('click');
    expect(onSubmitMock).toHaveBeenCalledTimes(1);

    // 3. 异步操作决议 (resolve) -> loading 自动恢复释放
    resolvePromise();
    await promise;
    await nextTick();

    expect(submitBtn.classes()).not.toContain('is-loading');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });

  it('异步 Loading 互斥防重锁：onSubmit 发生异常 reject 时，finally 确保 loading 确定性释放', async () => {
    let rejectPromise!: (err: Error) => void;
    const promise = new Promise<void>((_, reject) => {
      rejectPromise = reject;
    });
    promise.catch(() => {});
    const onSubmitMock = vi.fn().mockReturnValue(promise);

    wrapper = mount(AtengFooterBar, {
      props: {
        showSubmit: true,
        onSubmit: onSubmitMock,
      },
      attachTo: document.body,
    });

    const submitBtn = wrapper.find('.at-footer-bar__actions .el-button--primary');

    await submitBtn.trigger('click');
    await nextTick();
    expect(submitBtn.classes()).toContain('is-loading');

    // 抛出异常 reject
    rejectPromise(new Error('网络超时'));
    try {
      await promise;
    } catch {
      // ignore
    }
    await nextTick();

    // 验证无论成功还是失败，Loading 状态都会在 finally 块中确定性解锁
    expect(submitBtn.classes()).not.toContain('is-loading');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
    expect(wrapper.emitted('submit-error')).toBeTruthy();
  });

  it('外部受控覆盖：传入 :submit-loading 显式受控内部状态机', async () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        showSubmit: true,
        submitLoading: true,
      },
      attachTo: document.body,
    });

    const submitBtn = wrapper.find('.at-footer-bar__actions .el-button--primary');
    expect(submitBtn.classes()).toContain('is-loading');
    expect(submitBtn.attributes('disabled')).toBeDefined();

    // 切换受控为 false
    await wrapper.setProps({ submitLoading: false });
    await nextTick();

    expect(submitBtn.classes()).not.toContain('is-loading');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });

  it('声明式 actions 批量配置：正确渲染自定义按钮数组并绑定点击交互', async () => {
    const handleAudit = vi.fn();
    const handleReject = vi.fn();

    wrapper = mount(AtengFooterBar, {
      props: {
        actions: [
          { key: 'reject', label: '驳回退回', type: 'danger', plain: true, onClick: handleReject },
          { key: 'audit', label: '审核通过', type: 'success', onClick: handleAudit },
        ],
      },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll('.at-footer-bar__actions .el-button');
    expect(buttons.length).toBe(2);

    expect(buttons[0].text()).toBe('驳回退回');
    expect(buttons[0].classes()).toContain('el-button--danger');
    expect(buttons[0].classes()).toContain('is-plain');

    expect(buttons[1].text()).toBe('审核通过');
    expect(buttons[1].classes()).toContain('el-button--success');

    await buttons[0].trigger('click');
    expect(handleReject).toHaveBeenCalled();

    await buttons[1].trigger('click');
    expect(handleAudit).toHaveBeenCalled();
  });

  it('defineExpose 完整暴露：实例包含 submitLoading、submit、reset、cancel 门面句柄', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        showSubmit: true,
      },
      attachTo: document.body,
    });

    const exposed = wrapper.vm as unknown as {
      barRef: unknown;
      updateOffset: unknown;
      submitLoading: unknown;
      submit: unknown;
      reset: unknown;
      cancel: unknown;
    };

    expect(exposed.barRef).toBeDefined();
    expect(typeof exposed.updateOffset).toBe('function');
    expect(exposed.submitLoading).toBeDefined();
    expect(typeof exposed.submit).toBe('function');
    expect(typeof exposed.reset).toBe('function');
    expect(typeof exposed.cancel).toBe('function');
  });

  it('响应 ATENG_PRO_LAYOUT_KEY 容器总线：fixed 模式下动态避让侧边栏宽度', async () => {
    const asideWidth = ref('220px');
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
      },
      global: {
        provide: {
          [ATENG_PRO_LAYOUT_KEY as symbol]: {
            asideWidth,
            collapsed: ref(false),
            isMaximized: ref(false),
            isMobile: ref(false),
            toggleCollapse: () => {},
            toggleMaximize: () => {},
          },
        },
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.attributes('style')).toContain('left: 220px');

    // 折叠侧边栏至 64px
    asideWidth.value = '64px';
    await nextTick();
    expect(bar.attributes('style')).toContain('left: 64px');

    // 最大化模式下侧边栏归零
    asideWidth.value = '0px';
    await nextTick();
    expect(bar.attributes('style')).toContain('left: 0px');
  });
});
