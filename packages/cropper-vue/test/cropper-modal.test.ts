/**
 * AtengCropperModal 与 AtengCropperPreview 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengCropperModal from '../src/components/AtengCropperModal.vue';
import AtengCropperPreview from '../src/components/AtengCropperPreview.vue';
import { ClipboardReceiver } from '../src/utils/clipboard-receiver';

describe('AtengCropperModal 表现组件', () => {
  it('当 modelValue 为 false 时，不渲染模态弹窗', () => {
    const wrapper = mount(AtengCropperModal, {
      props: {
        modelValue: false,
      },
    });

    expect(document.body.querySelector('.at-cropper-modal')).toBeNull();
    wrapper.unmount();
  });

  it('当 modelValue 为 true 且 source 为空时，展示 Dropzone 拖拽上传区域', () => {
    const wrapper = mount(AtengCropperModal, {
      props: {
        modelValue: true,
        title: '测试裁剪弹窗',
      },
    });

    const modal = document.body.querySelector('.at-cropper-modal');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('.at-cropper-modal__title')?.textContent).toBe('测试裁剪弹窗');
    expect(modal?.querySelector('.at-cropper-dropzone')).not.toBeNull();

    wrapper.unmount();
  });

  it('点击取消按钮或遮罩层时触发关闭与取消事件', async () => {
    const wrapper = mount(AtengCropperModal, {
      props: {
        modelValue: true,
      },
    });

    const cancelBtn = document.body.querySelector(
      '.at-cropper-modal__action-btn--cancel',
    ) as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();

    cancelBtn.click();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(wrapper.emitted('cancel')).toBeTruthy();

    wrapper.unmount();
  });
});

describe('AtengCropperPreview 预览组件', () => {
  it('正确渲染多规格尺寸方框与标签', () => {
    const wrapper = mount(AtengCropperPreview, {
      props: {
        sizes: [100, 50],
        shape: 'circle',
        url: 'data:image/png;base64,mock',
      },
    });

    const items = wrapper.findAll('.at-cropper-preview__item');
    expect(items.length).toBe(2);

    expect(wrapper.find('.at-cropper-preview__box--circle').exists()).toBe(true);
    expect(wrapper.text()).toContain('100×100');
    expect(wrapper.text()).toContain('50×50');

    wrapper.unmount();
  });
});

describe('ClipboardReceiver 剪贴板提取工具', () => {
  it('当剪贴板无图片时返回 null', () => {
    const event = {
      clipboardData: {
        items: [
          {
            type: 'text/plain',
            getAsFile: () => null,
          },
        ],
      },
    } as unknown as ClipboardEvent;

    expect(ClipboardReceiver.extractImage(event)).toBeNull();
  });

  it('当剪贴板包含图片项时成功提取 File 实例', () => {
    const mockFile = new File(['mock'], 'screenshot.png', { type: 'image/png' });
    const event = {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => mockFile,
          },
        ],
      },
    } as unknown as ClipboardEvent;

    const file = ClipboardReceiver.extractImage(event);
    expect(file).toBe(mockFile);
    expect(file?.type).toBe('image/png');
  });
});
