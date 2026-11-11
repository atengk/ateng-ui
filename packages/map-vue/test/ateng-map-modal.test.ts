/**
 * AtengMapModal 组件单元测试。
 *
 * 遵循三铁律与组件生命周期规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengMapModal from '../src/components/AtengMapModal.vue';
import type { AtengMapModalInstance } from '../src/types';

describe('AtengMapModal 组件', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    // 清理 Teleport 到 body 的残留
    document.body.innerHTML = '';
  });

  it('modelValue 为 false 时不渲染弹窗 DOM', () => {
    wrapper = mount(AtengMapModal, {
      props: {
        modelValue: false,
      },
    });

    expect(document.querySelector('.at-map-modal-mask')).toBeNull();
  });

  it('modelValue 为 true 时成功 Teleport 渲染并展示标题', async () => {
    wrapper = mount(AtengMapModal, {
      props: {
        modelValue: true,
        title: '自定义地图选点弹窗',
      },
    });

    const mask = document.querySelector('.at-map-modal-mask');
    expect(mask).not.toBeNull();

    const titleEl = document.querySelector('.at-map-modal-title');
    expect(titleEl?.textContent).toBe('自定义地图选点弹窗');
  });

  it('点击确定与取消触发相应事件', async () => {
    wrapper = mount(AtengMapModal, {
      props: {
        modelValue: true,
      },
    });

    const confirmBtn = document.querySelector('.at-map-modal-btn-confirm') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    confirmBtn.click();
    expect(wrapper.emitted('confirm')).toBeTruthy();

    const cancelBtn = document.querySelector('.at-map-modal-btn-cancel') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('支持全屏切换与实例方法暴露', async () => {
    wrapper = mount(AtengMapModal, {
      props: {
        modelValue: true,
      },
    });

    const vm = wrapper.vm as unknown as AtengMapModalInstance;
    expect(typeof vm.toggleFullscreen).toBe('function');

    vm.toggleFullscreen();
    expect(wrapper.emitted('update:fullscreen')).toBeTruthy();
  });
});
