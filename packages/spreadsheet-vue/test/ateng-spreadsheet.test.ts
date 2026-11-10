/**
 * AtengSpreadsheet 容器组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengSpreadsheet from '../src/components/AtengSpreadsheet.vue';

describe('AtengSpreadsheet Component', () => {
  it('应当正确渲染根容器并支持默认全功能样式类', () => {
    const wrapper = mount(AtengSpreadsheet);

    expect(wrapper.classes()).toContain('at-spreadsheet');
    expect(wrapper.classes()).not.toContain('at-spreadsheet--compact');
    expect(wrapper.classes()).not.toContain('at-spreadsheet--readonly');

    wrapper.unmount();
  });

  it('当 mode="compact" 时应当附加紧凑样式类', () => {
    const wrapper = mount(AtengSpreadsheet, {
      props: {
        mode: 'compact',
      },
    });

    expect(wrapper.classes()).toContain('at-spreadsheet--compact');

    wrapper.unmount();
  });

  it('当 readOnly=true 或 mode="readonly" 时应当附加只读样式类', () => {
    const wrapper1 = mount(AtengSpreadsheet, {
      props: {
        readOnly: true,
      },
    });
    expect(wrapper1.classes()).toContain('at-spreadsheet--readonly');
    wrapper1.unmount();

    const wrapper2 = mount(AtengSpreadsheet, {
      props: {
        mode: 'readonly',
      },
    });
    expect(wrapper2.classes()).toContain('at-spreadsheet--readonly');
    wrapper2.unmount();
  });

  it('应当支持插槽反转渲染 (#header, #extra, #footer)', () => {
    const wrapper = mount(AtengSpreadsheet, {
      slots: {
        header: '<div class="custom-header">自定义顶栏</div>',
        extra: '<button class="custom-btn">自定义按钮</button>',
        footer: '<div class="custom-footer">自定义底栏</div>',
      },
    });

    expect(wrapper.find('.custom-header').exists()).toBe(true);
    expect(wrapper.find('.custom-btn').exists()).toBe(true);
    expect(wrapper.find('.custom-footer').exists()).toBe(true);

    wrapper.unmount();
  });

  it('应当通过 defineExpose 暴露完备的实例方法与只读属性', () => {
    const wrapper = mount(AtengSpreadsheet);
    const vm = wrapper.vm as unknown as Record<string, unknown>;

    expect(vm.ready).toBeDefined();
    expect(vm.loading).toBeDefined();
    expect(vm.activeSheetId).toBeDefined();
    expect(vm.sheetList).toBeDefined();
    expect(vm.selection).toBeDefined();
    expect(vm.isDirty).toBeDefined();

    expect(typeof vm.getSnapshot).toBe('function');
    expect(typeof vm.setSnapshot).toBe('function');
    expect(typeof vm.getData).toBe('function');
    expect(typeof vm.setData).toBe('function');
    expect(typeof vm.addSheet).toBe('function');
    expect(typeof vm.removeSheet).toBe('function');
    expect(typeof vm.activateSheet).toBe('function');
    expect(typeof vm.setReadOnly).toBe('function');
    expect(typeof vm.destroy).toBe('function');

    wrapper.unmount();
  });

  it('组件卸载应当安全执行销毁且不报错', () => {
    const wrapper = mount(AtengSpreadsheet);
    expect(() => wrapper.unmount()).not.toThrow();
  });
});
