/**
 * AtengSpreadsheetModal 脱壳模态弹窗组件单元测试。
 *
 * 遵循 ADR-0008、ADR-0021 与 ADR-0049 规约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengSpreadsheetModal from '../src/components/AtengSpreadsheetModal.vue';
import type { SpreadsheetRecord } from '../src/types';

describe('AtengSpreadsheetModal Component', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('visible 为 false 时 Teleport 内容不应出现在 body 中', () => {
    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: false,
      },
    });

    expect(document.body.querySelector('.at-spreadsheet-modal-mask')).toBeNull();
  });

  it('visible 为 true 时应当渲染脱壳模态弹窗至 body', () => {
    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: true,
        title: '批量填报弹窗',
      },
    });

    const modalMask = document.body.querySelector('.at-spreadsheet-modal-mask');
    expect(modalMask).not.toBeNull();
    const titleEl = document.body.querySelector('.at-spreadsheet-modal__title');
    expect(titleEl?.textContent).toBe('批量填报弹窗');
  });

  it('点击取消按钮或遮罩层应当触发 cancel 与 update:visible(false)', async () => {
    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: true,
      },
    });

    const cancelBtn = document.body.querySelector(
      '.at-spreadsheet-modal__footer .at-spreadsheet-btn--default',
    ) as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();

    cancelBtn.click();

    expect(wrapper.emitted('cancel')).toBeDefined();
    expect(wrapper.emitted('update:visible')).toBeDefined();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  it('键盘按下 Escape 键时应当触发取消并关闭弹窗', async () => {
    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: true,
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('cancel')).toBeDefined();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  it('点击全屏按钮应当切换全屏状态并添加 at-spreadsheet-modal--fullscreen 类名', async () => {
    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: true,
        fullscreen: false,
      },
    });

    const modal = document.body.querySelector('.at-spreadsheet-modal');
    expect(modal?.classList.contains('at-spreadsheet-modal--fullscreen')).toBe(false);

    // 点击全屏切换
    const fullscreenBtn = document.body.querySelector(
      '.at-spreadsheet-modal__controls button',
    ) as HTMLButtonElement;
    fullscreenBtn.click();

    await wrapper.vm.$nextTick();
    expect(modal?.classList.contains('at-spreadsheet-modal--fullscreen')).toBe(true);
  });

  it('点击确认按钮应当回传 snapshot 与 data 数据负载', async () => {
    const testData: SpreadsheetRecord[] = [{ name: '商品A', price: 99 }];

    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: true,
        data: testData,
      },
    });

    const confirmBtn = document.body.querySelector(
      '.at-spreadsheet-modal__footer .at-spreadsheet-btn--primary',
    ) as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();

    confirmBtn.click();

    expect(wrapper.emitted('confirm')).toBeDefined();
    const payload = wrapper.emitted('confirm')![0][0] as {
      snapshot: unknown;
      data: SpreadsheetRecord[];
    };
    expect(payload).toBeDefined();
    expect(payload.data).toBeDefined();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  it('应当正确渲染 #trigger 唤起插槽并通过 open 回调打开弹窗', async () => {
    wrapper = mount(AtengSpreadsheetModal, {
      props: {
        visible: false,
      },
      slots: {
        trigger: `
          <template #trigger="{ open }">
            <button class="custom-trigger" @click="open">打开表格</button>
          </template>
        `,
      },
    });

    const triggerBtn = wrapper.find('.custom-trigger');
    expect(triggerBtn.exists()).toBe(true);

    await triggerBtn.trigger('click');
    expect(wrapper.emitted('update:visible')![0]).toEqual([true]);
  });
});
