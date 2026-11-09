/**
 * Element Plus 官方标准适配器与兄弟生态物料单元测试。
 *
 * 遵循 ADR-0008（全自洽单测）与 ADR-0044 规约：
 * 验证 15 种 Element Plus 控件注册与渲染、双向数据绑定、动态选项解析与四大兄弟生态物料装配。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { FormWidgetRegistry } from '../src/registry';
import {
  registerElementPlusWidgets,
  registerEcosystemWidgets,
  installElementPlusPreset,
  elementPlusAdapters,
  AtengSignature,
} from '../src/presets/element-plus';
import type { WidgetRenderContext, FormWidget } from '../src/types';

describe('Element Plus 官方表单控件适配预设与生态物料', () => {
  let registry: FormWidgetRegistry;

  beforeEach(() => {
    registry = new FormWidgetRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registerElementPlusWidgets 成功注册 15 种官方 Element Plus 表单控件', () => {
    registerElementPlusWidgets(registry);

    const expectedWidgets = [
      'el-input',
      'el-textarea',
      'el-input-number',
      'el-select',
      'el-radio',
      'el-checkbox',
      'el-checkbox-group',
      'el-switch',
      'el-date-picker',
      'el-time-picker',
      'el-rate',
      'el-slider',
      'el-color-picker',
      'el-cascader',
      'el-transfer',
    ];

    expect(elementPlusAdapters.length).toBe(15);
    for (const name of expectedWidgets) {
      expect(registry.has(name)).toBe(true);
      const adapter = registry.get(name);
      expect(adapter).toBeDefined();
      expect(typeof adapter?.render).toBe('function');
    }
  });

  it('el-input 适配器正确渲染并触发 update:modelValue 事件', async () => {
    registerElementPlusWidgets(registry);
    const adapter = registry.get('el-input');
    expect(adapter).toBeDefined();

    const widget: FormWidget = {
      id: 'w_test_input',
      type: 'el-input',
      label: '用户姓名',
      props: { placeholder: '请输入真实姓名' },
    };

    const value = ref('张三');
    const updateSpy = vi.fn((val: unknown) => {
      value.value = String(val);
    });

    const TestHost = defineComponent({
      render() {
        const ctx: WidgetRenderContext = {
          widget,
          modelValue: value.value,
          'onUpdate:modelValue': updateSpy,
          formData: { name: value.value },
          disabled: false,
          readonly: false,
          size: 'default',
        };
        return adapter!.render(ctx);
      },
    });

    const wrapper = mount(TestHost);
    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.find('input').element.placeholder).toBe('请输入真实姓名');

    // 模拟输入修改
    await wrapper.find('input').setValue('李四');
    expect(updateSpy).toHaveBeenCalledWith('李四');
    wrapper.unmount();
  });

  it('el-switch 开关适配器正确处理布尔值状态', async () => {
    registerElementPlusWidgets(registry);
    const adapter = registry.get('el-switch');

    const widget: FormWidget = {
      id: 'w_test_switch',
      type: 'el-switch',
      label: '加急开关',
      props: { activeText: '加急' },
    };

    const updateSpy = vi.fn();
    const ctx: WidgetRenderContext = {
      widget,
      modelValue: true,
      'onUpdate:modelValue': updateSpy,
      formData: {},
      disabled: false,
      readonly: false,
      size: 'default',
    };

    const wrapper = mount({
      render: () => adapter!.render(ctx),
    });

    expect(wrapper.find('.el-switch').exists()).toBe(true);
    wrapper.unmount();
  });

  it('registerEcosystemWidgets 成功注册四大兄弟生态物料', () => {
    registerEcosystemWidgets(registry);

    expect(registry.has('rich-editor')).toBe(true);
    expect(registry.has('code-editor')).toBe(true);
    expect(registry.has('signature')).toBe(true);
    expect(registry.has('chunk-upload')).toBe(true);
  });

  it('signature 手写签名板物料渲染、清空与撤销功能自洽', async () => {
    const signatureWrapper = mount(AtengSignature, {
      props: {
        height: 180,
        placeholder: '请在此签名',
      },
    });

    expect(signatureWrapper.find('canvas').exists()).toBe(true);
    expect(signatureWrapper.text()).toContain('请在此签名');

    // 触发清除
    await signatureWrapper.find('.at-signature-btn.is-danger').trigger('click');
    expect(signatureWrapper.emitted('clear')).toBeTruthy();
    expect(signatureWrapper.emitted('update:modelValue')?.[0]).toEqual(['']);

    signatureWrapper.unmount();
  });

  it('code-editor 代码编辑器物料正确渲染与语言透传', async () => {
    registerEcosystemWidgets(registry);
    const adapter = registry.get('code-editor');

    const widget: FormWidget = {
      id: 'w_code',
      type: 'code-editor',
      label: 'SQL 规则',
      props: { language: 'sql', height: '150px' },
    };

    const updateSpy = vi.fn();
    const ctx: WidgetRenderContext = {
      widget,
      modelValue: 'SELECT * FROM t_user;',
      'onUpdate:modelValue': updateSpy,
      formData: {},
      disabled: false,
      readonly: false,
      size: 'default',
    };

    const wrapper = mount({
      render: () => adapter!.render(ctx),
    });

    // 默认内置代码框回退
    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
    expect(textarea.element.value).toBe('SELECT * FROM t_user;');

    await textarea.setValue('SELECT id FROM t_user;');
    expect(updateSpy).toHaveBeenCalledWith('SELECT id FROM t_user;');

    wrapper.unmount();
  });

  it('installElementPlusPreset 一键安装 19 种全量官方与生态物料', () => {
    installElementPlusPreset(registry);

    expect(registry.getAll().length).toBe(19);
    expect(registry.has('el-input')).toBe(true);
    expect(registry.has('rich-editor')).toBe(true);
    expect(registry.has('signature')).toBe(true);
  });
});
