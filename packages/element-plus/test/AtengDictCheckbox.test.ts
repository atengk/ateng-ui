/**
 * AtengDictCheckbox 多选框组组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengDictCheckbox } from '../src/components/dict';
import { DictManager } from '../src/components/dict/DictManager';

describe('AtengDictCheckbox 字典多选框组组件交互与契约测试', () => {
  beforeEach(() => {
    DictManager.clearCache();
    DictManager.setProvider(async (code: string) => {
      if (code === 'hobby') {
        return [
          { label: '羽毛球', value: 'badminton' },
          { label: '篮球', value: 'basketball' },
          { label: '游泳', value: 'swimming' },
        ];
      }
      return [];
    });
  });

  afterEach(() => {
    DictManager.clearCache();
    document.body.innerHTML = '';
  });

  it('基础渲染：根据 dictCode 异步加载字典项并渲染 el-checkbox', async () => {
    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'hobby',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.findAll('.el-checkbox').length).toBe(3);
    });

    const labels = wrapper.findAll('.el-checkbox').map(c => c.text());
    expect(labels).toEqual(['羽毛球', '篮球', '游泳']);

    wrapper.unmount();
  });

  it('静态 options 优先级高于 dictCode，且无需网络请求', async () => {
    const staticOptions = [
      { label: '选项一', value: 1 },
      { label: '选项二', value: 2 },
    ];
    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'hobby',
        options: staticOptions,
      },
    });

    expect(wrapper.findAll('.el-checkbox').length).toBe(2);
    expect(wrapper.findAll('.el-checkbox').map(c => c.text())).toEqual(['选项一', '选项二']);

    wrapper.unmount();
  });

  it('按钮风格多选：配置 button: true 渲染为 el-checkbox-button', async () => {
    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'hobby',
        button: true,
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.findAll('.el-checkbox-button').length).toBe(3);
    });

    wrapper.unmount();
  });

  it('数组双向绑定与 change 触发：勾选选项派发 update:modelValue 与 change 事件', async () => {
    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'hobby',
        modelValue: ['badminton'],
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.findAll('.el-checkbox').length).toBe(3);
    });

    // 初始第一个被选中
    expect(wrapper.findAll('.el-checkbox')[0].classes()).toContain('is-checked');
    expect(wrapper.findAll('.el-checkbox')[1].classes()).not.toContain('is-checked');

    // 通过组件层派发更新选中集合
    const group = wrapper.findComponent({ name: 'ElCheckboxGroup' });
    group.vm.$emit('update:modelValue', ['badminton', 'basketball']);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    const emitted = wrapper.emitted('update:modelValue')![0][0] as string[];
    expect(emitted).toContain('badminton');
    expect(emitted).toContain('basketball');

    wrapper.unmount();
  });

  it('双向解构不变量：配置 separator="," 支持直接绑定与产出逗号分隔字符串', async () => {
    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'hobby',
        modelValue: 'badminton,swimming',
        separator: ',',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.findAll('.el-checkbox').length).toBe(3);
    });

    // 校验第 1 与第 3 项被正确回显勾选
    const checkboxes = wrapper.findAll('.el-checkbox');
    expect(checkboxes[0].classes()).toContain('is-checked');
    expect(checkboxes[1].classes()).not.toContain('is-checked');
    expect(checkboxes[2].classes()).toContain('is-checked');

    // 触发 group 更新，追加第 2 项，派发的值应为 'badminton,swimming,basketball'
    const group = wrapper.findComponent({ name: 'ElCheckboxGroup' });
    group.vm.$emit('update:modelValue', ['badminton', 'swimming', 'basketball']);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    const emitted = wrapper.emitted('update:modelValue')![0][0];
    expect(emitted).toBe('badminton,swimming,basketball');

    wrapper.unmount();
  });

  it('全选与半选快捷控制：showCheckAll 开启后，点击全选选中全部，半选状态正确自适应', async () => {
    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'hobby',
        modelValue: ['badminton'],
        showCheckAll: true,
        checkAllText: '全部选择',
      },
    });

    await vi.waitFor(() => {
      // 1 个全选复选框 + 3 个子项复选框 = 4 个
      expect(wrapper.findAll('.el-checkbox').length).toBe(4);
    });

    const checkAllBox = wrapper.find('.at-dict-checkbox__check-all .el-checkbox');
    expect(checkAllBox.exists()).toBe(true);
    expect(checkAllBox.text()).toBe('全部选择');
    // 当前选中 1 个，全选框应为 indeterminate
    expect(checkAllBox.find('.is-indeterminate').exists()).toBe(true);

    // 点击全选勾选
    const checkAllComponent = wrapper.findComponent({ name: 'ElCheckbox' });
    checkAllComponent.vm.$emit('change', true);
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted('update:modelValue')![0][0] as string[];
    expect(emitted).toEqual(['badminton', 'basketball', 'swimming']);

    wrapper.unmount();
  });

  it('对外暴露与 refresh 强制穿透刷新', async () => {
    let callCount = 0;
    DictManager.setProvider(async () => {
      callCount += 1;
      return [{ label: `动态项 ${callCount}`, value: callCount }];
    });

    const wrapper = mount(AtengDictCheckbox, {
      props: {
        dictCode: 'dynamic_test',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.findAll('.el-checkbox').length).toBe(1);
    });
    expect(callCount).toBe(1);

    // 调用暴露的 refresh()
    await wrapper.vm.refresh();
    await wrapper.vm.$nextTick();

    expect(callCount).toBe(2);
    expect(wrapper.text()).toContain('动态项 2');

    wrapper.unmount();
  });
});
