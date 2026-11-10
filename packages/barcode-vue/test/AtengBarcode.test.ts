/**
 * AtengBarcode 组件端到端测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengBarcode from '../src/components/AtengBarcode.vue';

describe('AtengBarcode 容器组件', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('默认以 SVG 矢量形态正常挂载并渲染条码', async () => {
    wrapper = mount(AtengBarcode, {
      props: {
        value: 'ATENG-1001',
        format: 'CODE128',
      },
    });

    // 等待渲染调度完成
    await new Promise(r => setTimeout(r, 50));

    expect(wrapper.find('svg.at-barcode__svg').exists()).toBe(true);
    expect(wrapper.emitted('rendered')).toBeTruthy();
    expect(wrapper.find('.at-barcode--invalid').exists()).toBe(false);
  });

  it('支持切换至 Canvas 渲染形态', async () => {
    wrapper = mount(AtengBarcode, {
      props: {
        value: 'ATENG-CANVAS',
        renderType: 'canvas',
      },
    });

    await new Promise(r => setTimeout(r, 50));

    expect(wrapper.find('canvas.at-barcode__canvas').exists()).toBe(true);
    expect(wrapper.find('svg.at-barcode__svg').exists()).toBe(false);
  });

  it('遇到非法数据时不崩溃并优雅降级为错误占位', async () => {
    wrapper = mount(AtengBarcode, {
      props: {
        value: 'INVALID_EAN_CODE',
        format: 'EAN13',
      },
    });

    await new Promise(r => setTimeout(r, 50));

    // 不渲染 SVG/Canvas，而是渲染 .at-barcode__error
    expect(wrapper.find('svg.at-barcode__svg').exists()).toBe(false);
    expect(wrapper.find('.at-barcode__error').exists()).toBe(true);
    expect(wrapper.text()).toContain('EAN-13');

    // 触发了 error 事件
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('支持通过 #error 具名插槽自定义接管错误视图', async () => {
    wrapper = mount(AtengBarcode, {
      props: {
        value: '',
      },
      slots: {
        error: `<template #error="{ message }"><div class="custom-error">自定义错误: {{ message }}</div></template>`,
      },
    });

    await new Promise(r => setTimeout(r, 50));

    expect(wrapper.find('.custom-error').exists()).toBe(true);
    expect(wrapper.text()).toContain('条码内容不能为空');
  });

  it('通过 defineExpose 暴露实例状态与渲染接口', async () => {
    wrapper = mount(AtengBarcode, {
      props: {
        value: 'EXPOSE-TEST',
      },
    });

    await new Promise(r => setTimeout(r, 50));

    const vm = wrapper.vm as unknown as {
      isValid: boolean;
      errorMessage: string;
      render: () => void;
      getElement: () => Element;
    };

    expect(vm.isValid).toBe(true);
    expect(vm.errorMessage).toBe('');
    expect(typeof vm.render).toBe('function');
    expect(vm.getElement()).toBeTruthy();
  });
});
