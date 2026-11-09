/**
 * BPMN 流程节点权限矩阵 (FieldPermissionMatrix) 单元测试。
 *
 * 遵循 ADR-0017、ADR-0044 与“Node Overrides Schema”仲裁准则，
 * 覆盖四态权限切换、只读脱壳格式化与敏感脱敏、隐藏态校验豁免与动态切换。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import {
  AtengFormRenderer,
  formatCurrency,
  formatPhone,
  formatIdCard,
  formatEmail,
  formatDate,
  formatReadonlyValue,
} from '../src';
import type { FormSchema, FieldPermissionMatrix, FormRendererInstance } from '../src';

describe('脱壳只读格式化与敏感数据脱敏工具 (format.ts)', () => {
  it('应该正确格式化金额货币 (formatCurrency)', () => {
    expect(formatCurrency(1234.56)).toBe('¥ 1,234.56');
    expect(formatCurrency('9876543.21', '$', 2)).toBe('$ 9,876,543.21');
    expect(formatCurrency(0)).toBe('¥ 0.00');
    expect(formatCurrency(null)).toBe('-');
    expect(formatCurrency('')).toBe('-');
  });

  it('应该正确执行手机号脱敏 (formatPhone)', () => {
    expect(formatPhone('13812345678')).toBe('138****5678');
    expect(formatPhone('18900009999')).toBe('189****9999');
    expect(formatPhone('12345')).toBe('12345'); // 非 11 位手机号保持原样
    expect(formatPhone('')).toBe('-');
  });

  it('应该正确执行身份证号脱敏 (formatIdCard)', () => {
    expect(formatIdCard('110101199003072345')).toBe('110101********2345');
    expect(formatIdCard('31010119850101123X')).toBe('310101********123X');
    expect(formatIdCard('')).toBe('-');
  });

  it('应该正确执行电子邮箱脱敏 (formatEmail)', () => {
    expect(formatEmail('zhangsan@example.com')).toBe('z***n@example.com');
    expect(formatEmail('admin@test.org')).toBe('a***n@test.org');
    expect(formatEmail('ab@test.org')).toBe('a***@test.org');
    expect(formatEmail('')).toBe('-');
  });

  it('应该正确格式化日期与日期时间 (formatDate)', () => {
    const fixedDate = new Date('2026-11-09T08:30:00.000Z');
    expect(formatDate(fixedDate, false)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatDate(fixedDate, true)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(formatDate(null)).toBe('-');
  });

  it('应该统一通过 formatReadonlyValue 分发格式化', () => {
    expect(formatReadonlyValue(100, { formatType: 'currency' })).toBe('¥ 100.00');
    expect(formatReadonlyValue('13911112222', { formatType: 'phone' })).toBe('139****2222');
    expect(
      formatReadonlyValue(42, {
        formatter: val => `No.${val} 编号`,
      }),
    ).toBe('No.42 编号');
  });
});

describe('FieldPermissionMatrix 流程节点权限矩阵仲裁', () => {
  const sampleSchema: FormSchema = {
    version: '1.0',
    formConfig: { layout: 'vertical' },
    widgetList: [
      {
        id: 'w_name',
        type: 'input',
        modelKey: 'applicantName',
        label: '申请人姓名',
        defaultValue: '张三',
        rules: [{ required: true, message: '申请人姓名不能为空' }],
      },
      {
        id: 'w_phone',
        type: 'input',
        modelKey: 'phone',
        label: '联系手机',
        defaultValue: '13812345678',
        props: { formatType: 'phone' },
      },
      {
        id: 'w_amount',
        type: 'input',
        modelKey: 'amount',
        label: '报销总额',
        defaultValue: 1250.5,
        props: { formatType: 'currency' },
      },
      {
        id: 'w_secret',
        type: 'input',
        modelKey: 'internalCode',
        label: '内部审批密级',
        defaultValue: 'SEC-999',
        rules: [{ required: true, message: '内部密级不能为空' }],
      },
      {
        id: 'w_remark',
        type: 'textarea',
        modelKey: 'remark',
        label: '审核意见',
        defaultValue: '',
      },
    ],
  };

  it('应该遵循“Node Overrides Schema”：hidden 彻底移除渲染且豁免必填校验', async () => {
    // internalCode 原本是必填项，但当前节点声明其为 hidden
    const permissions: FieldPermissionMatrix = {
      internalCode: 'hidden',
    };

    const wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        permissions,
        formData: {
          applicantName: '李四',
          internalCode: '', // 必填但 hidden，留空不应报错
        },
      },
    });

    // 1. 验证 internalCode 从渲染树彻底隐藏
    expect(wrapper.text()).not.toContain('内部审批密级');

    // 2. 验证触发表单校验时，被隐藏的 internalCode 不会阻塞校验
    const instance = wrapper.vm as unknown as FormRendererInstance;
    const res = await instance.validate();
    expect(res.valid).toBe(true);
    expect(res.errors.internalCode).toBeUndefined();

    wrapper.unmount();
  });

  it('应该支持 readonly 只读脱壳渲染，且保留内存真明文与脱敏呈现', async () => {
    // phone 与 amount 在此节点声明为 readonly
    const permissions: FieldPermissionMatrix = {
      applicantName: 'readonly',
      phone: 'readonly',
      amount: 'readonly',
    };

    const wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        permissions,
        formData: {
          applicantName: '王五',
          phone: '13812345678',
          amount: 8888.8,
        },
      },
    });

    const instance = wrapper.vm as unknown as FormRendererInstance;

    // 1. 验证只读脱壳展示：无 input 输入框，以文本方式呈现
    const items = wrapper.findAll('.at-form-item.is-readonly');
    expect(items.length).toBe(3);

    // 2. 验证手机号脱敏与金额格式化脱壳文本
    expect(wrapper.text()).toContain('138****5678');
    expect(wrapper.text()).toContain('¥ 8,888.80');

    // 3. 验证内存真明文不变（保持原始数据契约，杜绝星号污染回显）
    const rawData = instance.getFormData();
    expect(rawData.phone).toBe('13812345678');
    expect(rawData.amount).toBe(8888.8);

    wrapper.unmount();
  });

  it('应该支持 required 强制覆盖原本非必填的字段', async () => {
    // remark 原本是非必填的，但主管审核节点强制要求必填
    const permissions: FieldPermissionMatrix = {
      remark: 'required',
    };

    const wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        permissions,
        formData: {
          applicantName: '张三',
          internalCode: 'OK',
          remark: '', // 留空
        },
      },
    });

    const instance = wrapper.vm as unknown as FormRendererInstance;

    // 验证展示了必填红星
    const remarkItem = wrapper
      .findAll('.at-form-item')
      .find(item => item.text().includes('审核意见'));
    expect(remarkItem?.find('.at-required-asterisk').exists()).toBe(true);

    // 触发表单全量校验，断言 remark 报错
    const res = await instance.validate();
    expect(res.valid).toBe(false);
    expect(res.errors.remark).toContain('为必填项');

    wrapper.unmount();
  });

  it('应该支持审批节点流转（发起人 -> 主管 -> 财务）动态热切换权限矩阵', async () => {
    const currentPermissions = ref<FieldPermissionMatrix>({
      applicantName: 'editable',
      amount: 'editable',
      remark: 'hidden',
    });

    const wrapper = mount(AtengFormRenderer, {
      props: {
        schema: sampleSchema,
        permissions: currentPermissions.value,
        formData: {
          applicantName: '张三',
          amount: 500,
          internalCode: 'A-1',
          remark: '',
        },
      },
    });

    // 节点 1：发起人填报（姓名可编辑，审核意见隐藏）
    expect(wrapper.find('input.at-native-input').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('审核意见');

    // 节点 2：切换为【主管审批】（姓名与金额转为只读脱壳，审核意见转为必填）
    currentPermissions.value = {
      applicantName: 'readonly',
      amount: 'readonly',
      remark: 'required',
    };
    await wrapper.setProps({ permissions: currentPermissions.value });
    await nextTick();

    expect(wrapper.text()).toContain('审核意见');
    expect(wrapper.text()).toContain('¥ 500.00');

    // 节点 3：切换为【财务归档】（全量字段转为只读）
    currentPermissions.value = {
      applicantName: 'readonly',
      phone: 'readonly',
      amount: 'readonly',
      internalCode: 'readonly',
      remark: 'readonly',
    };
    await wrapper.setProps({ permissions: currentPermissions.value });
    await nextTick();

    // 验证所有字段均为只读
    const allInputs = wrapper.findAll('input.at-native-input, textarea.at-native-textarea');
    expect(allInputs.length).toBe(0);

    wrapper.unmount();
  });
});
