/**
 * AtengDict* 字典套件（Select / Radio / Tag）组件规范与交互单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import {
  AtengDictSelect,
  AtengDictRadio,
  AtengDictTag,
  DictManager,
  type DictItem,
  type AtengDictSelectExpose,
  type AtengDictRadioExpose,
  type AtengDictTagExpose,
} from '../src/components/dict';

describe('AtengDict* 字典套件组件交互测试', () => {
  let wrapper: VueWrapper | null = null;

  const mockGenderDict: DictItem[] = [
    { label: '男', value: '1', tagType: 'primary' },
    { label: '女', value: '2', tagType: 'danger' },
    { label: '保密', value: '0', tagType: 'info', disabled: true },
  ];

  const mockStatusDict: DictItem[] = [
    { label: '启用', value: 1, tagType: 'success' },
    { label: '停用', value: 0, tagType: 'danger' },
  ];

  beforeEach(() => {
    DictManager.clearCache();
    DictManager.setProvider(async (code: string) => {
      if (code === 'sys_user_gender') {
        return mockGenderDict;
      }
      if (code === 'sys_status') {
        return mockStatusDict;
      }
      return [];
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    DictManager.clearCache();
    vi.restoreAllMocks();
  });

  describe('AtengDictSelect 下拉选择组件', () => {
    it('基础渲染：根据 dict-code 自动拉取字典项并渲染 ElOption', async () => {
      const selected = ref('');
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_user_gender',
          modelValue: selected.value,
          'onUpdate:modelValue': (val: unknown) => {
            selected.value = String(val ?? '');
          },
        },
        attachTo: document.body,
      });

      // 等待异步字典拉取与渲染
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems.length).toBe(3);
      expect(vm.dictItems[0].label).toBe('男');
      expect(vm.dictItems[1].label).toBe('女');
      expect(wrapper.classes()).toContain('at-dict-select');
    });

    it('静态 options 优先级高于 dictCode，且不触发网络请求', async () => {
      const staticOptions: DictItem[] = [{ label: '测试项', value: 'test' }];
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_user_gender',
          options: staticOptions,
        },
        attachTo: document.body,
      });
      await nextTick();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems).toEqual(staticOptions);
      expect(DictManager.hasCache('sys_user_gender')).toBe(false);
    });

    it('支持局部 loader 覆盖全局 provider', async () => {
      const customData: DictItem[] = [{ label: '自定义A', value: 'A' }];
      const customLoader = vi.fn().mockResolvedValue(customData);

      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'custom_code',
          loader: customLoader,
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(vm.dictItems).toEqual(customData);
      expect(customLoader).toHaveBeenCalledTimes(1);
    });

    it('实例暴露与 refresh 强制穿透刷新', async () => {
      wrapper = mount(AtengDictSelect, {
        props: {
          dictCode: 'sys_status',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const vm = wrapper.vm as unknown as AtengDictSelectExpose;
      expect(typeof vm.refresh).toBe('function');
      expect(vm.selectRef).toBeDefined();

      const refreshSpy = vi.spyOn(DictManager, 'loadDict');
      await vm.refresh();
      expect(refreshSpy).toHaveBeenCalledWith('sys_status', undefined, true);
    });
  });

  describe('AtengDictRadio 单选框组组件', () => {
    it('普通单选与按钮单选切换', async () => {
      const val = ref('1');

      // 1. 普通 Radio
      wrapper = mount(AtengDictRadio, {
        props: {
          dictCode: 'sys_user_gender',
          modelValue: val.value,
          'onUpdate:modelValue': (v: unknown) => {
            val.value = String(v ?? '');
          },
        },
        attachTo: document.body,
      });
      await flushPromises();

      expect(wrapper.classes()).toContain('at-dict-radio');
      const vm = wrapper.vm as unknown as AtengDictRadioExpose;
      expect(vm.dictItems.length).toBe(3);

      // 2. 按钮 Radio
      await wrapper.setProps({ button: true });
      await nextTick();
      expect(wrapper.findComponent({ name: 'ElRadioButton' }).exists()).toBe(true);
    });

    it('受控单选变更派发 change 与 update:modelValue 事件', async () => {
      const val = ref('1');
      wrapper = mount(AtengDictRadio, {
        props: {
          dictCode: 'sys_user_gender',
          modelValue: val.value,
          'onUpdate:modelValue': (v: unknown) => {
            val.value = String(v ?? '');
          },
        },
        attachTo: document.body,
      });
      await flushPromises();

      const radioGroup = wrapper.findComponent({ name: 'ElRadioGroup' });
      radioGroup.vm.$emit('update:modelValue', '2');
      await flushPromises();

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2']);
    });
  });

  describe('AtengDictTag 彩色状态标签展示组件', () => {
    it('单值匹配与 Element Plus Tag 彩色语义映射', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_status',
          value: 1,
        },
        attachTo: document.body,
      });
      await flushPromises();

      expect(wrapper.classes()).toContain('at-dict-tag');
      const tag = wrapper.find('.el-tag');
      expect(tag.exists()).toBe(true);
      expect(tag.text()).toBe('启用');
      // 验证 tagType="success" 渲染成功
      expect(tag.classes()).toContain('el-tag--success');
    });

    it('多值字符串映射：逗号分隔多值字符串拆分渲染多个标签', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_user_gender',
          value: '1, 2',
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tags = wrapper.findAll('.el-tag');
      expect(tags.length).toBe(2);
      expect(tags[0].text()).toBe('男');
      expect(tags[0].classes()).toContain('el-tag--primary');
      expect(tags[1].text()).toBe('女');
      expect(tags[1].classes()).toContain('el-tag--danger');
    });

    it('多值数组模式映射', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_user_gender',
          value: ['1', '2'],
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tags = wrapper.findAll('.el-tag');
      expect(tags.length).toBe(2);
      expect(tags[0].text()).toBe('男');
      expect(tags[1].text()).toBe('女');
    });

    it('空安全保底防御：值为 null、undefined 或空字符串时保底渲染 emptyText (-)', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_status',
          value: null,
          emptyText: '--',
        },
        attachTo: document.body,
      });
      await flushPromises();

      expect(wrapper.find('.el-tag').exists()).toBe(false);
      expect(wrapper.find('.at-dict-tag__empty').text()).toBe('--');
    });

    it('未匹配项优雅降级：原样展示原值并不崩溃', async () => {
      wrapper = mount(AtengDictTag, {
        props: {
          dictCode: 'sys_status',
          value: 999,
        },
        attachTo: document.body,
      });
      await flushPromises();

      const tag = wrapper.find('.el-tag');
      expect(tag.exists()).toBe(true);
      expect(tag.text()).toBe('999');

      const vm = wrapper.vm as unknown as AtengDictTagExpose;
      expect(typeof vm.refresh).toBe('function');
      expect(vm.matchingItems.length).toBe(1);
    });
  });
});
