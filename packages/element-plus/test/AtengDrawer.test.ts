/**
 * AtengDrawer 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { AtengDrawer } from '../src/components/drawer';

describe('AtengDrawer 组件规范与交互测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：正确呈现抽屉标题、主要内容与底部操作栏', async () => {
    const visible = ref(true);

    const TestComponent = defineComponent({
      setup() {
        return { visible };
      },
      template: `
        <AtengDrawer v-model="visible" title="用户详情抽屉" :append-to-body="false">
          <p id="drawer-content">抽屉内容详情</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    expect(wrapper.text()).toContain('用户详情抽屉');
    expect(wrapper.find('#drawer-content').text()).toBe('抽屉内容详情');
    expect(wrapper.find('.at-drawer__confirm-btn').text()).toContain('确定');
    expect(wrapper.find('.at-drawer__cancel-btn').text()).toContain('取消');
  });

  it('尺寸语义断点解析：支持 small、default、large', async () => {
    const visible = ref(true);

    const TestComponent = defineComponent({
      setup() {
        return { visible };
      },
      template: `
        <AtengDrawer v-model="visible" title="尺寸测试" size="small" :append-to-body="false">
          <p>小尺寸抽屉</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    const drawerEl = wrapper.find('.el-drawer');
    expect(drawerEl.exists()).toBe(true);
    // el-drawer 的容器宽或行内样式呈现 360px
    expect((drawerEl.element as HTMLElement).style.width).toBe('360px');
  });

  it('异步确认锁协议：Promise 挂起期间确定 loading、取消与关闭禁用；成功后自动关闭', async () => {
    const visible = ref(true);
    const onSuccess = vi.fn();
    let resolvePromise: () => void = () => {};

    const asyncConfirmHook = vi.fn(() => {
      return new Promise<void>(resolve => {
        resolvePromise = resolve;
      });
    });

    const TestComponent = defineComponent({
      setup() {
        return { visible, asyncConfirmHook, onSuccess };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="异步抽屉"
          :before-confirm="asyncConfirmHook"
          :append-to-body="false"
          @success="onSuccess"
        >
          <p>抽屉表单</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-drawer__confirm-btn');
    const cancelBtn = wrapper.find('.at-drawer__cancel-btn');
    const closeBtn = wrapper.find('.at-drawer__close-btn');

    await confirmBtn.trigger('click');
    await nextTick();

    expect(asyncConfirmHook).toHaveBeenCalledTimes(1);
    expect(confirmBtn.classes()).toContain('is-loading');
    expect((cancelBtn.element as HTMLButtonElement).disabled).toBe(true);
    expect((closeBtn.element as HTMLButtonElement).disabled).toBe(true);

    // 成功决议
    resolvePromise();
    await Promise.resolve();
    await nextTick();

    expect(visible.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('异步确认锁协议：Promise 抛错时退出 loading 并保持抽屉开启', async () => {
    const visible = ref(true);
    let rejectPromise: (err?: unknown) => void = () => {};

    const failingHook = vi.fn(() => {
      return new Promise<void>((_, reject) => {
        rejectPromise = reject;
      });
    });

    const TestComponent = defineComponent({
      setup() {
        return { visible, failingHook };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="报错抽屉"
          :before-confirm="failingHook"
          :append-to-body="false"
        >
          <p>现场数据</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-drawer__confirm-btn');
    const cancelBtn = wrapper.find('.at-drawer__cancel-btn');

    await confirmBtn.trigger('click');
    await nextTick();

    expect((cancelBtn.element as HTMLButtonElement).disabled).toBe(true);

    rejectPromise(new Error('保存抽屉失败'));
    await Promise.resolve();
    await nextTick();

    // 抽屉保持开启，恢复交互
    expect(visible.value).toBe(true);
    expect(confirmBtn.classes()).not.toContain('is-loading');
    expect((cancelBtn.element as HTMLButtonElement).disabled).toBe(false);
  });

  it('点击取消按钮正常关闭并派发 cancel 事件', async () => {
    const visible = ref(true);
    const onCancel = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, onCancel };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="取消测试"
          :append-to-body="false"
          @cancel="onCancel"
        >
          <p>内容</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    const cancelBtn = wrapper.find('.at-drawer__cancel-btn');
    await cancelBtn.trigger('click');
    await nextTick();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(visible.value).toBe(false);
  });
});
