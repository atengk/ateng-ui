/**
 * AtengIconSelect 通用图标选择器组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengIconSelect } from '../src/components/icon-select';

describe('AtengIconSelect 通用图标选择器交互与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('初始渲染与选中值回显：正确呈现选中图标名称与 SVG 预览', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: 'Search',
      },
    });

    expect(wrapper.classes()).toContain('at-icon-select');
    const input = wrapper.find('input');
    expect(input.element.value).toBe('Search');
    expect(wrapper.find('.at-icon-select__preview svg').exists()).toBe(true);

    wrapper.unmount();
  });

  it('拼音与中文过滤检索：根据英文/拼音/中文精准收敛列表', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: '',
      },
    });

    // 搜索拼音 yonghu
    const popoverContent = document.body;
    // 触发 popover 显示
    await wrapper.find('.at-icon-select__trigger').trigger('click');
    await wrapper.vm.$nextTick();

    // 在组件内直接访问过滤逻辑
    const vm = wrapper.vm as any;
    expect(vm.filteredIcons.length).toBeGreaterThan(10);

    // 设置搜索词为 yonghu (用户)
    vm.searchKeyword = 'yonghu';
    await wrapper.vm.$nextTick();
    expect(vm.filteredIcons.length).toBe(1);
    expect(vm.filteredIcons[0].name).toBe('User');

    // 设置搜索词为 设置
    vm.searchKeyword = '设置';
    await wrapper.vm.$nextTick();
    expect(vm.filteredIcons.length).toBe(1);
    expect(vm.filteredIcons[0].name).toBe('Setting');

    wrapper.unmount();
  });

  it('选择图标：触发 update:modelValue, change 与 select 事件', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: '',
      },
    });

    const vm = wrapper.vm as any;
    const targetItem = vm.allIcons.find((i: any) => i.name === 'Check');
    expect(targetItem).toBeDefined();

    vm.handleSelect(targetItem);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['Check']);
    expect(wrapper.emitted('change')).toBeTruthy();
    expect(wrapper.emitted('change')![0]).toEqual(['Check']);
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0][0].name).toBe('Check');

    wrapper.unmount();
  });

  it('一键清空：触发 update:modelValue 与 clear 事件', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        modelValue: 'Edit',
      },
    });

    wrapper.vm.clear();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toBeTruthy();

    wrapper.unmount();
  });

  it('Dialog 模式交互与禁用态', async () => {
    const wrapper = mount(AtengIconSelect, {
      props: {
        mode: 'dialog',
        disabled: true,
      },
    });

    const input = wrapper.find('input');
    expect(input.attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });
});
