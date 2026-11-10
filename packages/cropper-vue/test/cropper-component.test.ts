/**
 * AtengCropper 表现容器与 useCropper 状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import AtengCropper from '../src/components/AtengCropper.vue';
import { useCropper } from '../src/composables/use-cropper';
import type { UseCropperReturn } from '../src/types';
import { revokedUrls, createdUrls } from './setup';

describe('AtengCropper 表现组件', () => {
  it('当 source 为空时应展示默认空状态占位符', () => {
    const wrapper = mount(AtengCropper);

    expect(wrapper.classes()).toContain('at-cropper');
    expect(wrapper.find('.at-cropper__empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('请选择或传入待裁剪图片');

    wrapper.unmount();
  });

  it('支持通过 empty 插槽自定义空状态表现', () => {
    const wrapper = mount(AtengCropper, {
      slots: {
        empty: '<div class="custom-empty">自定义上传区域</div>',
      },
    });

    expect(wrapper.find('.custom-empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('自定义上传区域');

    wrapper.unmount();
  });

  it('支持 shape="circle" 并正确注入 .at-cropper--circle 样式类', () => {
    const wrapper = mount(AtengCropper, {
      props: {
        shape: 'circle',
      },
    });

    expect(wrapper.classes()).toContain('at-cropper--circle');

    wrapper.unmount();
  });

  it('支持 disabled 属性并正确注入 .at-cropper--disabled 样式类', () => {
    const wrapper = mount(AtengCropper, {
      props: {
        disabled: true,
      },
    });

    expect(wrapper.classes()).toContain('at-cropper--disabled');

    wrapper.unmount();
  });

  it('显式暴露完备的操作 API 与响应式状态', async () => {
    const wrapper = mount(AtengCropper, {
      props: {
        source: 'data:image/png;base64,mockBase64',
      },
    });

    const vm = wrapper.vm as unknown as UseCropperReturn;
    expect(vm.zoom).toBeTypeOf('function');
    expect(vm.rotate).toBeTypeOf('function');
    expect(vm.flipX).toBeTypeOf('function');
    expect(vm.flipY).toBeTypeOf('function');
    expect(vm.reset).toBeTypeOf('function');
    expect(vm.clear).toBeTypeOf('function');
    expect(vm.exportBlob).toBeTypeOf('function');
    expect(vm.exportFile).toBeTypeOf('function');
    expect(vm.exportDataUrl).toBeTypeOf('function');
    expect(vm.exportCanvas).toBeTypeOf('function');
    expect(vm.exportResult).toBeTypeOf('function');
    expect(vm.destroy).toBeTypeOf('function');

    wrapper.unmount();
  });

  it('传入 Blob 对象源时应自动通过 BlobUrlGuard 接管，并在组件卸载时确定性销毁释放', async () => {
    const blob = new Blob(['mock-test-image-data'], { type: 'image/png' });
    const wrapper = mount(AtengCropper, {
      props: {
        source: blob,
      },
    });

    await nextTick();
    expect(createdUrls.length).toBeGreaterThan(0);
    const managedUrl = createdUrls[createdUrls.length - 1];

    // 组件卸载
    wrapper.unmount();
    await nextTick();

    // 验证确定性释放
    expect(revokedUrls).toContain(managedUrl);
  });
});

describe('useCropper 无头状态机', () => {
  it('提供只读响应式几何度量与对称操作方法', () => {
    const imageEl = document.createElement('img');
    const imageRef = ref<HTMLImageElement | null>(imageEl);

    const cropper = useCropper(imageRef, {
      aspectRatio: 1,
      viewMode: 1,
    });

    expect(cropper.ready.value).toBe(false);
    expect(cropper.data.value.rotate).toBe(0);
    expect(cropper.zoomRatio.value).toBe(1);

    // 旋转操作
    cropper.rotate(90);
    expect(cropper.rotateAngle.value).toBe(90);

    cropper.rotateTo(180);
    expect(cropper.rotateAngle.value).toBe(180);

    // 缩放操作
    cropper.zoom(0.2);
    expect(cropper.zoomRatio.value).toBeCloseTo(1.2);

    cropper.zoomTo(2);
    expect(cropper.zoomRatio.value).toBe(2);

    // 重置与清理
    cropper.reset();
    expect(cropper.zoomRatio.value).toBe(1);
    expect(cropper.rotateAngle.value).toBe(0);

    cropper.destroy();
    expect(cropper.ready.value).toBe(false);
  });
});
