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

  it('分帧延迟挂载协议 (lazy-render)：展开完成前显示骨架占位，opened 触发后挂载真实内容', async () => {
    const visible = ref(true);

    const TestComponent = defineComponent({
      setup() {
        return { visible };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="延迟挂载抽屉"
          :lazy-render="true"
          :append-to-body="false"
        >
          <template #placeholder>
            <div id="drawer-placeholder">抽屉骨架屏加载中...</div>
          </template>
          <div id="drawer-heavy-content">复杂抽屉详情视图</div>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    // 初始动效执行期间渲染骨架占位，未挂载重型业务节点
    expect(wrapper.find('#drawer-placeholder').exists()).toBe(true);
    expect(wrapper.find('#drawer-heavy-content').exists()).toBe(false);

    // 模拟 Element Plus 抽屉展开就绪派发 opened
    const drawerComponent = wrapper.findComponent(AtengDrawer);
    const elDrawer = drawerComponent.findComponent({ name: 'ElDrawer' });
    elDrawer.vm.$emit('opened');
    await nextTick();

    // 展开落地后，真实业务内容平滑挂载
    expect(wrapper.find('#drawer-placeholder').exists()).toBe(false);
    expect(wrapper.find('#drawer-heavy-content').exists()).toBe(true);
  });

  it('表单自动校验流转：formRef 校验失败时立即终止流转，不进入 loading，不调用 beforeConfirm，保持抽屉开启', async () => {
    const visible = ref(true);
    const mockForm = {
      validate: vi.fn().mockRejectedValue({ username: [{ message: '请输入用户名' }] }),
    };
    const formRef = ref(mockForm);
    const beforeConfirm = vi.fn();
    const onConfirm = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, formRef, beforeConfirm, onConfirm };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="表单校验抽屉"
          :form-ref="formRef"
          :before-confirm="beforeConfirm"
          :append-to-body="false"
          @confirm="onConfirm"
        >
          <p>测试抽屉表单</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-drawer__confirm-btn');
    await confirmBtn.trigger('click');
    await nextTick();

    // 验证 form.validate 被调用且校验失败就地阻断
    expect(mockForm.validate).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(beforeConfirm).not.toHaveBeenCalled();
    expect(confirmBtn.classes()).not.toContain('is-loading');
    expect(visible.value).toBe(true);
  });

  it('表单自动校验流转：formRef 校验成功后放行，开启 loading 并执行 beforeConfirm，决议后成功关闭', async () => {
    const visible = ref(true);
    const mockForm = {
      validate: vi.fn().mockResolvedValue(true),
    };
    const formRef = ref(mockForm);
    let resolveConfirm: () => void = () => {};
    const beforeConfirm = vi.fn(() => {
      return new Promise<void>(resolve => {
        resolveConfirm = resolve;
      });
    });
    const onConfirm = vi.fn();
    const onSuccess = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, formRef, beforeConfirm, onConfirm, onSuccess };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="表单校验通过抽屉"
          :form-ref="formRef"
          :before-confirm="beforeConfirm"
          :append-to-body="false"
          @confirm="onConfirm"
          @success="onSuccess"
        >
          <p>测试抽屉表单</p>
        </AtengDrawer>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDrawer } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-drawer__confirm-btn');
    await confirmBtn.trigger('click');
    await nextTick();

    // 1. 验证校验成功放行：触发 confirm 事件，进入 loading 并调用 beforeConfirm
    expect(mockForm.validate).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(beforeConfirm).toHaveBeenCalledTimes(1);
    expect(confirmBtn.classes()).toContain('is-loading');
    expect(visible.value).toBe(true);

    // 2. 异步决议完成
    resolveConfirm();
    await Promise.resolve();
    await nextTick();

    // 3. 成功关闭并派发 success
    expect(visible.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('防误关二次确认：开启 confirmOnClose 时点击取消弹出确认框，确认后关闭', async () => {
    const { ElMessageBox } = await import('element-plus');
    type MessageBoxAction = Parameters<
      NonNullable<Parameters<ReturnType<typeof ElMessageBox.confirm>['then']>[0]>
    >[0];
    const confirmSpy = vi
      .spyOn(ElMessageBox, 'confirm')
      .mockResolvedValue('confirm' as MessageBoxAction);

    const visible = ref(true);
    const onCancel = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, onCancel };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="防误关测试抽屉"
          :confirm-on-close="true"
          :append-to-body="false"
          @cancel="onCancel"
        >
          <p>重要抽屉草稿</p>
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

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await nextTick();

    expect(visible.value).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it('防误关二次确认：开启 confirmOnClose 时点击继续编辑保持抽屉开启', async () => {
    const { ElMessageBox } = await import('element-plus');
    const confirmSpy = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel');

    const visible = ref(true);
    const onCancel = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, onCancel };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="防误关测试抽屉"
          :confirm-on-close="true"
          :append-to-body="false"
          @cancel="onCancel"
        >
          <p>重要抽屉草稿</p>
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

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await nextTick();

    // 验证抽屉依然保持开启，未触发 cancel
    expect(visible.value).toBe(true);
    expect(onCancel).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('自定义 beforeClose 拦截：点击取消触发 beforeClose，由外部控制关闭', async () => {
    const visible = ref(true);
    let capturedDone: (() => void) | null = null;
    const beforeClose = vi.fn((done: () => void) => {
      capturedDone = done;
    });

    const TestComponent = defineComponent({
      setup() {
        return { visible, beforeClose };
      },
      template: `
        <AtengDrawer
          v-model="visible"
          title="自定义拦截抽屉"
          :before-close="beforeClose"
          :append-to-body="false"
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

    expect(beforeClose).toHaveBeenCalledTimes(1);
    expect(visible.value).toBe(true);

    // 外部调用 done 执行关闭
    capturedDone!();
    await nextTick();
    expect(visible.value).toBe(false);
  });
});
