/**
 * AtengDialog 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { AtengDialog } from '../src/components/dialog';

describe('AtengDialog 组件规范与交互测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：正确呈现标题、内容与确定/取消操作栏', async () => {
    const visible = ref(true);

    const TestComponent = defineComponent({
      setup() {
        return { visible };
      },
      template: `
        <AtengDialog v-model="visible" title="测试弹窗" :append-to-body="false">
          <p id="dialog-content">弹窗业务正文</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    expect(wrapper.text()).toContain('测试弹窗');
    expect(wrapper.find('#dialog-content').text()).toBe('弹窗业务正文');
    expect(wrapper.find('.at-dialog__confirm-btn').text()).toContain('确定');
    expect(wrapper.find('.at-dialog__cancel-btn').text()).toContain('取消');
  });

  it('全屏机制：支持按钮点击与双击 Header 快速切换全屏', async () => {
    const visible = ref(true);
    const onFullscreenChange = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, onFullscreenChange };
      },
      template: `
        <AtengDialog
          v-model="visible"
          title="全屏弹窗"
          :append-to-body="false"
          @fullscreen-change="onFullscreenChange"
        >
          <p>正文</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const header = wrapper.find('.at-dialog__header');
    const fullscreenBtn = wrapper.find('.at-dialog__action-btn');
    expect(fullscreenBtn.exists()).toBe(true);

    // 1. 点击全屏按钮切换
    await fullscreenBtn.trigger('click');
    await nextTick();
    expect(onFullscreenChange).toHaveBeenCalledWith(true);

    // 2. 双击 Header 区域再次切换还原
    await header.trigger('dblclick');
    await nextTick();
    expect(onFullscreenChange).toHaveBeenCalledWith(false);
  });

  it('异步确认锁协议：Promise 挂起期间确定 loading、取消与关闭禁用；决议后自动关闭并触发 success', async () => {
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
        <AtengDialog
          v-model="visible"
          title="异步提交弹窗"
          :before-confirm="asyncConfirmHook"
          :append-to-body="false"
          @success="onSuccess"
        >
          <p>表单内容</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-dialog__confirm-btn');
    const cancelBtn = wrapper.find('.at-dialog__cancel-btn');
    const closeBtn = wrapper.find('.at-dialog__close-btn');

    // 1. 点击确定按钮，开始异步提交
    await confirmBtn.trigger('click');
    await nextTick();

    expect(asyncConfirmHook).toHaveBeenCalledTimes(1);

    // 2. 验证锁定状态：确定按钮呈现 loading，取消与关闭按钮被强制禁用
    expect(confirmBtn.classes()).toContain('is-loading');
    expect((cancelBtn.element as HTMLButtonElement).disabled).toBe(true);
    expect((closeBtn.element as HTMLButtonElement).disabled).toBe(true);

    // 3. 异步 Promise 成功决议
    resolvePromise();
    await Promise.resolve();
    await nextTick();

    // 4. 验证成功关闭并派发 success
    expect(visible.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('异步确认锁协议：Promise 抛错时自动退出 loading 并保持弹窗开启保护现场', async () => {
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
        <AtengDialog
          v-model="visible"
          title="异常提交弹窗"
          :before-confirm="failingHook"
          :append-to-body="false"
        >
          <p>表单现场数据</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-dialog__confirm-btn');
    const cancelBtn = wrapper.find('.at-dialog__cancel-btn');

    await confirmBtn.trigger('click');
    await nextTick();

    expect((cancelBtn.element as HTMLButtonElement).disabled).toBe(true);

    // 模拟服务端报错 reject
    rejectPromise(new Error('校验失败'));
    await Promise.resolve();
    await nextTick();

    // 验证弹窗依然保持开启，且恢复可交互
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
        <AtengDialog
          v-model="visible"
          title="普通弹窗"
          :append-to-body="false"
          @cancel="onCancel"
        >
          <p>内容</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const cancelBtn = wrapper.find('.at-dialog__cancel-btn');
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
        <AtengDialog
          v-model="visible"
          title="延迟挂载弹窗"
          :lazy-render="true"
          :append-to-body="false"
        >
          <template #placeholder>
            <div id="custom-placeholder">骨架屏加载中...</div>
          </template>
          <div id="heavy-content">复杂重型业务数据</div>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    // 初始状态下动效尚未完成，渲染占位骨架，未挂载真实业务内容
    expect(wrapper.find('#custom-placeholder').exists()).toBe(true);
    expect(wrapper.find('#heavy-content').exists()).toBe(false);

    // 模拟 Element Plus 动效结束派发 opened 事件
    const dialogComponent = wrapper.findComponent(AtengDialog);
    const elDialog = dialogComponent.findComponent({ name: 'ElDialog' });
    elDialog.vm.$emit('opened');
    await nextTick();

    // 动效落地后，真实业务内容平滑挂载，占位骨架移除
    expect(wrapper.find('#custom-placeholder').exists()).toBe(false);
    expect(wrapper.find('#heavy-content').exists()).toBe(true);
  });

  it('表单自动校验流转：formRef 校验失败时立即终止流转，不进入 loading，不调用 beforeConfirm，保持弹窗开启', async () => {
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
        <AtengDialog
          v-model="visible"
          title="表单校验弹窗"
          :form-ref="formRef"
          :before-confirm="beforeConfirm"
          :append-to-body="false"
          @confirm="onConfirm"
        >
          <p>测试表单内容</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-dialog__confirm-btn');
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
        <AtengDialog
          v-model="visible"
          title="表单校验通过弹窗"
          :form-ref="formRef"
          :before-confirm="beforeConfirm"
          :append-to-body="false"
          @confirm="onConfirm"
          @success="onSuccess"
        >
          <p>测试表单内容</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const confirmBtn = wrapper.find('.at-dialog__confirm-btn');
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
        <AtengDialog
          v-model="visible"
          title="防误关测试弹窗"
          :confirm-on-close="true"
          :append-to-body="false"
          @cancel="onCancel"
        >
          <p>重要表单草稿</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const cancelBtn = wrapper.find('.at-dialog__cancel-btn');
    await cancelBtn.trigger('click');
    await nextTick();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // 等待 Promise.resolve
    await Promise.resolve();
    await nextTick();

    expect(visible.value).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it('防误关二次确认：开启 confirmOnClose 时点击继续编辑保持弹窗开启', async () => {
    const { ElMessageBox } = await import('element-plus');
    const confirmSpy = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel');

    const visible = ref(true);
    const onCancel = vi.fn();

    const TestComponent = defineComponent({
      setup() {
        return { visible, onCancel };
      },
      template: `
        <AtengDialog
          v-model="visible"
          title="防误关测试弹窗"
          :confirm-on-close="true"
          :append-to-body="false"
          @cancel="onCancel"
        >
          <p>重要表单草稿</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const cancelBtn = wrapper.find('.at-dialog__cancel-btn');
    await cancelBtn.trigger('click');
    await nextTick();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await nextTick();

    // 验证弹窗依然保持开启，未触发 cancel
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
        <AtengDialog
          v-model="visible"
          title="自定义拦截弹窗"
          :before-close="beforeClose"
          :append-to-body="false"
        >
          <p>内容</p>
        </AtengDialog>
      `,
    });

    wrapper = mount(TestComponent, {
      global: { components: { AtengDialog } },
      attachTo: document.body,
    });
    await nextTick();

    const cancelBtn = wrapper.find('.at-dialog__cancel-btn');
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
