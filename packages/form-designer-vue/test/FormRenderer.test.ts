/**
 * AtengFormRenderer 核心高阶运行态容器行为驱动单元测试。
 *
 * 遵循 ADR-0008 全自洽单测铁律与 ADR-0044 规约，覆盖 Schema 渲染、双向绑定、深层路径、流程权限与重置。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { AtengFormRenderer } from '../src';
import type { FormSchema, FormRendererInstance } from '../src';

describe('AtengFormRenderer', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  const sampleSchema: FormSchema = {
    version: '1.0',
    formConfig: {
      layout: 'vertical',
      labelPosition: 'top',
      labelWidth: 100,
      colon: true,
    },
    widgetList: [
      {
        id: 'widget_username',
        type: 'input',
        modelKey: 'username',
        label: '用户姓名',
        placeholder: '请输入用户名',
        defaultValue: '张三',
        rules: [{ required: true, message: '用户名不能为空' }],
      },
      {
        id: 'widget_bio',
        type: 'textarea',
        modelKey: 'profile.bio',
        label: '个人简介',
        placeholder: '请输入个人简介',
        defaultValue: '前端工程师',
      },
      {
        id: 'widget_role',
        type: 'select',
        modelKey: 'role',
        label: '用户角色',
        defaultValue: 'admin',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '普通用户', value: 'user' },
        ],
      },
      {
        id: 'widget_agree',
        type: 'checkbox',
        modelKey: 'agree',
        label: '同意协议',
        defaultValue: true,
      },
    ],
  };

  it('应该正确基于三段式 AST Schema 渲染出表单项与原生保底控件', () => {
    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
      },
    });

    expect(wrapper.classes()).toContain('at-form-renderer');
    expect(wrapper.classes()).toContain('layout-vertical');

    // 检查表单项标签
    const labels = wrapper.findAll('.at-form-item-label');
    expect(labels.length).toBe(4);
    expect(labels[0].text()).toContain('用户姓名');
    expect(labels[1].text()).toContain('个人简介');

    // 检查原生输入控件渲染
    const input = wrapper.find('input.at-native-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('张三');

    const textarea = wrapper.find('textarea.at-native-textarea');
    expect(textarea.exists()).toBe(true);
    expect((textarea.element as HTMLTextAreaElement).value).toBe('前端工程师');

    const select = wrapper.find('select.at-native-select');
    expect(select.exists()).toBe(true);
    expect((select.element as HTMLSelectElement).value).toBe('admin');
  });

  it('应该正确支持深层点路径解析与 v-model:formData 双向响应式流', async () => {
    const formData = ref<Record<string, unknown>>({
      username: '李四',
      profile: {
        bio: '架构师',
      },
    });

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        formData: formData.value,
        'onUpdate:formData': (val: Record<string, unknown>) => {
          formData.value = val;
        },
      },
    });

    const input = wrapper.find('input.at-native-input');
    expect((input.element as HTMLInputElement).value).toBe('李四');

    const textarea = wrapper.find('textarea.at-native-textarea');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('架构师');

    // 模拟输入修改文本
    await input.setValue('王五');
    await nextTick();

    // 验证双向绑定向外传导
    expect(formData.value.username).toBe('王五');

    // 模拟修改深层嵌套字段
    await textarea.setValue('全栈开发者');
    await nextTick();
    expect((formData.value.profile as Record<string, unknown>).bio).toBe('全栈开发者');
  });

  it('应该正确执行流程节点权限矩阵 (FieldPermissionMatrix) 仲裁覆盖', async () => {
    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        permissions: {
          username: 'readonly', // 强制只读脱壳
          role: 'hidden', // 强制隐藏
        },
      },
    });

    // 验证 username 变为脱壳只读
    const usernameWrapper = wrapper.find('.at-form-item.is-readonly');
    expect(usernameWrapper.exists()).toBe(true);
    expect(usernameWrapper.find('.at-native-readonly-text').text()).toBe('张三');
    expect(usernameWrapper.find('input.at-native-input').exists()).toBe(false);

    // 验证 role 字段被彻底隐藏
    const formItems = wrapper.findAll('.at-form-item');
    expect(formItems.length).toBe(3); // 原 4 个，隐藏 1 个后为 3
    const allLabelsText = formItems.map(item => item.text()).join(' ');
    expect(allLabelsText).not.toContain('用户角色');
  });

  it('应该正确响应 validate() 与 resetFields() 实例方法', async () => {
    const formData = ref<Record<string, unknown>>({
      username: '', // 必填项留空
    });

    wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        formData: formData.value,
        'onUpdate:formData': val => {
          formData.value = val;
        },
      },
    });

    const instance = wrapper.vm as unknown as FormRendererInstance;
    expect(typeof instance.validate).toBe('function');
    expect(typeof instance.resetFields).toBe('function');

    // 触发校验，断言校验失败
    const validateRes = await instance.validate();
    expect(validateRes.valid).toBe(false);
    expect(validateRes.errors.username).toBe('用户名不能为空');

    await nextTick();
    const errorEl = wrapper.find('.at-form-item-error');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('用户名不能为空');

    // 调用 resetFields，断言重置回初始值并清除错误
    instance.resetFields();
    await nextTick();

    expect(wrapper.find('.at-form-item-error').exists()).toBe(false);
  });
});
