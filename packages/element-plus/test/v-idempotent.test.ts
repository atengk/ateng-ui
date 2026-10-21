/**
 * v-idempotent 指令单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { vIdempotent } from '../src/directives/idempotent';

describe('v-idempotent 指令规范与边界测试', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('时间窗口模式：在指定毫秒窗口内阻断连击，窗口结束后可再次触发', async () => {
    const clickHandler = vi.fn();

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { clickHandler };
      },
      template: `
        <button id="btn" v-idempotent="1000" @click="clickHandler">提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    // 1. 第一次点击，正常触发
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    // 2. 在 1000ms 窗口内连续点击两次，必须被阻断
    await btn.trigger('click');
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    // 3. 快进 1001ms，时间窗口结束
    vi.advanceTimersByTime(1001);

    // 4. 再次点击，正常触发
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(2);
  });

  it('时间窗口模式：支持对象配置 { delay: 500 }', async () => {
    const clickHandler = vi.fn();

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { clickHandler };
      },
      template: `
        <button id="btn" v-idempotent="{ delay: 500 }" @click="clickHandler">提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(501);

    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(2);
  });

  it('时间窗口模式：缺省配置默认生效 1000ms 防刷窗口', async () => {
    const clickHandler = vi.fn();

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { clickHandler };
      },
      template: `
        <button id="btn" v-idempotent @click="clickHandler">提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(999);
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(2);
  });

  it('异步互斥锁模式：执行期间呈现 is-loading / is-disabled 与 disabled 属性，决议后恢复', async () => {
    let resolvePromise: () => void = () => {};
    const asyncAction = vi.fn(() => {
      return new Promise<void>(resolve => {
        resolvePromise = resolve;
      });
    });

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { asyncAction };
      },
      template: `
        <button id="btn" class="el-button" v-idempotent="asyncAction">异步提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');
    const buttonEl = btn.element as HTMLButtonElement;

    // 1. 触发点击，开始异步操作
    await btn.trigger('click');
    expect(asyncAction).toHaveBeenCalledTimes(1);

    // 2. 检查 pending 期间的类名与禁用状态
    expect(buttonEl.classList.contains('is-loading')).toBe(true);
    expect(buttonEl.classList.contains('is-disabled')).toBe(true);
    expect(buttonEl.disabled).toBe(true);

    // 3. 在 pending 期间暴力连续点击，确保互斥锁生效，不产生重复执行
    await btn.trigger('click');
    await btn.trigger('click');
    expect(asyncAction).toHaveBeenCalledTimes(1);

    // 4. Promise 决议
    resolvePromise();
    await Promise.resolve();
    await nextTick();

    // 5. 校验决议后状态完全恢复
    expect(buttonEl.classList.contains('is-loading')).toBe(false);
    expect(buttonEl.classList.contains('is-disabled')).toBe(false);
    expect(buttonEl.disabled).toBe(false);

    // 6. 恢复后可以再次点击
    await btn.trigger('click');
    expect(asyncAction).toHaveBeenCalledTimes(2);
  });

  it('异步互斥锁模式：异步抛错 (reject) 时自动解锁并恢复按钮交互，杜绝假死', async () => {
    let rejectPromise: (reason?: unknown) => void = () => {};
    const failingAction = vi.fn(() => {
      return new Promise<void>((_, reject) => {
        rejectPromise = reject;
      });
    });

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { failingAction };
      },
      template: `
        <button id="btn" class="el-button" v-idempotent="failingAction">失败提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');
    const buttonEl = btn.element as HTMLButtonElement;

    await btn.trigger('click');
    expect(failingAction).toHaveBeenCalledTimes(1);
    expect(buttonEl.disabled).toBe(true);

    // 触发 reject 报错
    rejectPromise(new Error('Network error'));
    await Promise.resolve();
    await nextTick();

    // 验证锁已解除并恢复交互
    expect(buttonEl.classList.contains('is-loading')).toBe(false);
    expect(buttonEl.classList.contains('is-disabled')).toBe(false);
    expect(buttonEl.disabled).toBe(false);

    // 再次点击可以继续触发
    await btn.trigger('click');
    expect(failingAction).toHaveBeenCalledTimes(2);
  });

  it('超时防死锁兜底：异步函数未决议时到达 timeout 自动释放锁', async () => {
    // 永远处于 pending 的 Promise
    const hangingAction = vi.fn(() => new Promise<void>(() => {}));

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return {
          options: {
            handler: hangingAction,
            timeout: 2000,
          },
        };
      },
      template: `
        <button id="btn" class="el-button" v-idempotent="options">悬挂提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');
    const buttonEl = btn.element as HTMLButtonElement;

    await btn.trigger('click');
    expect(hangingAction).toHaveBeenCalledTimes(1);
    expect(buttonEl.disabled).toBe(true);

    // 前进 1999ms，仍锁定
    vi.advanceTimersByTime(1999);
    expect(buttonEl.disabled).toBe(true);

    // 前进 2ms 超过 2000ms 超时阈值，触发兜底解锁
    vi.advanceTimersByTime(2);
    expect(buttonEl.classList.contains('is-loading')).toBe(false);
    expect(buttonEl.disabled).toBe(false);

    // 解锁后可再次点击
    await btn.trigger('click');
    expect(hangingAction).toHaveBeenCalledTimes(2);
  });

  it('支持非 button 宿主元素并兼容 aria-disabled', async () => {
    let resolvePromise: () => void = () => {};
    const asyncAction = vi.fn(
      () =>
        new Promise<void>(res => {
          resolvePromise = res;
        }),
    );

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { asyncAction };
      },
      template: `
        <div id="div-btn" v-idempotent="asyncAction">自定义按钮</div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const div = wrapper.find('#div-btn');

    await div.trigger('click');
    expect(div.attributes('aria-disabled')).toBe('true');
    expect(div.classes()).toContain('is-disabled');

    resolvePromise();
    await Promise.resolve();
    await nextTick();

    expect(div.attributes('aria-disabled')).toBeUndefined();
    expect(div.classes()).not.toContain('is-disabled');
  });

  it('组件卸载时清理事件与计时器，防止离线内存泄漏', async () => {
    const clickHandler = vi.fn();
    const show = ref(true);

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { clickHandler, show };
      },
      template: `
        <div v-if="show">
          <button id="btn" v-idempotent="1000" @click="clickHandler">提交</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    // 销毁组件
    show.value = false;
    await nextTick();

    expect(wrapper.find('#btn').exists()).toBe(false);

    // 确认快进定时器不会抛错
    expect(() => {
      vi.advanceTimersByTime(2000);
    }).not.toThrow();
  });

  it('支持参数语法 v-idempotent:500 形式配置时间窗口', async () => {
    const clickHandler = vi.fn();

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { clickHandler };
      },
      template: `
        <button id="btn" v-idempotent:500 @click="clickHandler">提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(501);

    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(2);
  });

  it('支持修饰符 .noFeedback 禁用按钮样式联动', async () => {
    let resolvePromise: () => void = () => {};
    const asyncAction = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolvePromise = resolve;
        }),
    );

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { asyncAction };
      },
      template: `
        <button id="btn" class="el-button" v-idempotent.noFeedback="asyncAction">无反馈提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');
    const buttonEl = btn.element as HTMLButtonElement;

    await btn.trigger('click');
    expect(asyncAction).toHaveBeenCalledTimes(1);

    // 虽然互斥锁生效，但不附加样式和 disabled 属性
    expect(buttonEl.classList.contains('is-loading')).toBe(false);
    expect(buttonEl.classList.contains('is-disabled')).toBe(false);
    expect(buttonEl.disabled).toBe(false);

    // 期间连击依然被互斥阻断
    await btn.trigger('click');
    expect(asyncAction).toHaveBeenCalledTimes(1);

    resolvePromise();
    await Promise.resolve();
    await nextTick();
  });

  it('异步函数同步抛出异常时立即解锁，杜绝按钮假死', async () => {
    const syncErrorAction = vi.fn(() => {
      throw new Error('Sync error occurred');
    });

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { syncErrorAction };
      },
      template: `
        <button id="btn" class="el-button" v-idempotent="syncErrorAction">报错提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');
    const buttonEl = btn.element as HTMLButtonElement;

    // 点击时抛错，但锁和样式必须立即还原
    expect(() => {
      btn.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }).toThrow('Sync error occurred');

    expect(buttonEl.classList.contains('is-loading')).toBe(false);
    expect(buttonEl.classList.contains('is-disabled')).toBe(false);
    expect(buttonEl.disabled).toBe(false);
  });

  it('动态更新：入参改变后即时生效', async () => {
    const clickHandler = vi.fn();
    const delayRef = ref(1000);

    const TestComponent = defineComponent({
      directives: { idempotent: vIdempotent },
      setup() {
        return { clickHandler, delayRef };
      },
      template: `
        <button id="btn" v-idempotent="delayRef" @click="clickHandler">提交</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    // 初始 1000ms
    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1001);

    // 动态改为 300ms
    delayRef.value = 300;
    await nextTick();

    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(2);

    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(301);

    await btn.trigger('click');
    expect(clickHandler).toHaveBeenCalledTimes(3);
  });
});
