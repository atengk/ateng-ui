/**
 * DynamicRuleEngine 与 SafeMathEvaluator 核心联动及安全 AST 单元测试。
 *
 * 遵循 ADR-0013 与 ADR-0044 规约，覆盖算术 AST 解析、优先级、括号、路径插值、黑客对抗防御及表单容器联动。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { SafeMathEvaluator, DynamicRuleEngine, AtengFormRenderer } from '../src';
import type { FormSchema, FormWidget, FormRendererInstance } from '../src';

describe('SafeMathEvaluator 算术 AST 解释器', () => {
  it('应该正确计算标准四则运算与运算符优先级', () => {
    expect(SafeMathEvaluator.evaluate('1 + 2 * 3')).toBe(7);
    expect(SafeMathEvaluator.evaluate('(1 + 2) * 3')).toBe(9);
    expect(SafeMathEvaluator.evaluate('10 - 4 / 2')).toBe(8);
    expect(SafeMathEvaluator.evaluate('(10 - 4) / 2')).toBe(3);
    expect(SafeMathEvaluator.evaluate('10 % 3')).toBe(1);
  });

  it('应该正确支持一元正负号与括号嵌套', () => {
    expect(SafeMathEvaluator.evaluate('-5 + 10')).toBe(5);
    expect(SafeMathEvaluator.evaluate('-(2 + 3) * 4')).toBe(-20);
    expect(SafeMathEvaluator.evaluate('+5 + -3')).toBe(2);
    expect(SafeMathEvaluator.evaluate('((2 + 3) * (4 - 1)) / 3')).toBe(5);
  });

  it('应该正确支持浮点数与小数运算', () => {
    expect(SafeMathEvaluator.evaluate('0.1 + 0.2')).toBe(0.3);
    expect(SafeMathEvaluator.evaluate('100 * 0.85')).toBe(85);
  });

  it('应该正确支持变量插值与深层点路径解析', () => {
    const context = {
      price: 100,
      count: 3,
      discount: 0.2,
      order: {
        taxRate: 0.1,
      },
    };

    // price * count * (1 - discount) = 100 * 3 * 0.8 = 240
    expect(SafeMathEvaluator.evaluate('price * count * (1 - discount)', context)).toBe(240);

    // price * (1 + order.taxRate) = 100 * 1.1 = 110
    expect(SafeMathEvaluator.evaluate('price * (1 + order.taxRate)', context)).toBe(110);
  });

  it('应该正确支持白名单数学函数 (round, floor, ceil, abs, min, max)', () => {
    expect(SafeMathEvaluator.evaluate('round(10.6)')).toBe(11);
    expect(SafeMathEvaluator.evaluate('floor(10.6)')).toBe(10);
    expect(SafeMathEvaluator.evaluate('ceil(10.2)')).toBe(11);
    expect(SafeMathEvaluator.evaluate('abs(-42)')).toBe(42);
    expect(SafeMathEvaluator.evaluate('min(10, 5, 20)')).toBe(5);
    expect(SafeMathEvaluator.evaluate('max(10, 5, 20)')).toBe(20);
    expect(SafeMathEvaluator.evaluate('round(100 * 1.13)')).toBe(113);
  });

  it('应该具备零除与非法空值防御（返回 0）', () => {
    expect(SafeMathEvaluator.evaluate('10 / 0')).toBe(0);
    expect(SafeMathEvaluator.evaluate('10 % 0')).toBe(0);
    expect(SafeMathEvaluator.evaluate(null)).toBe(0);
    expect(SafeMathEvaluator.evaluate('')).toBe(0);
    expect(SafeMathEvaluator.evaluate('unknown_field * 10', {})).toBe(0);
  });

  it('对抗性安全测试：输入恶意注入字符或高危对象时 100% 阻断并安全降级为 0', () => {
    // 原型链污染尝试
    expect(SafeMathEvaluator.evaluate('__proto__.polluted = 1')).toBe(0);
    expect(SafeMathEvaluator.evaluate('constructor.prototype.test = 1')).toBe(0);

    // 全局宿主对象访问尝试
    expect(SafeMathEvaluator.evaluate('window.location.href')).toBe(0);
    expect(SafeMathEvaluator.evaluate('document.cookie')).toBe(0);
    expect(SafeMathEvaluator.evaluate('globalThis.process')).toBe(0);

    // 恶意函数执行尝试
    expect(SafeMathEvaluator.evaluate('eval("alert(1)")')).toBe(0);
    expect(SafeMathEvaluator.evaluate('Function("return 1")()')).toBe(0);
    expect(SafeMathEvaluator.evaluate('alert(1)')).toBe(0);

    // 非法特殊字符（分号、反引号、花括号）
    expect(SafeMathEvaluator.evaluate('1 + 2; delete a')).toBe(0);
    expect(SafeMathEvaluator.evaluate('`test`')).toBe(0);
    expect(SafeMathEvaluator.evaluate('{ a: 1 }')).toBe(0);
  });
});

describe('DynamicRuleEngine 声明式规则树引擎', () => {
  it('应该正确评估各种条件操作符 (eq, ne, gt, gte, lt, lte, in, notIn, empty, notEmpty)', () => {
    const data = {
      score: 85,
      role: 'admin',
      tags: ['vue', 'ts'],
      emptyStr: '',
      nullVal: null,
    };

    // eq / ne
    expect(
      DynamicRuleEngine.evaluateCondition(
        { sourceKey: 'role', operator: 'eq', value: 'admin' },
        data,
      ),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition(
        { sourceKey: 'score', operator: 'eq', value: '85' },
        data,
      ),
    ).toBe(true); // 宽松等值
    expect(
      DynamicRuleEngine.evaluateCondition(
        { sourceKey: 'role', operator: 'ne', value: 'guest' },
        data,
      ),
    ).toBe(true);

    // gt / gte / lt / lte
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'score', operator: 'gt', value: 80 }, data),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'score', operator: 'gte', value: 85 }, data),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'score', operator: 'lt', value: 90 }, data),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'score', operator: 'lte', value: 85 }, data),
    ).toBe(true);

    // in / notIn
    expect(
      DynamicRuleEngine.evaluateCondition(
        { sourceKey: 'role', operator: 'in', value: ['admin', 'manager'] },
        data,
      ),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition(
        { sourceKey: 'role', operator: 'notIn', value: ['user', 'guest'] },
        data,
      ),
    ).toBe(true);

    // empty / notEmpty
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'emptyStr', operator: 'empty' }, data),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'nullVal', operator: 'empty' }, data),
    ).toBe(true);
    expect(
      DynamicRuleEngine.evaluateCondition({ sourceKey: 'role', operator: 'notEmpty' }, data),
    ).toBe(true);
  });

  it('应该正确支持 and / or 复合条件逻辑', () => {
    const data = {
      status: 'approved',
      amount: 500,
    };

    // and 逻辑：全满足
    expect(
      DynamicRuleEngine.evaluateRule(
        {
          conditions: [
            { sourceKey: 'status', operator: 'eq', value: 'approved' },
            { sourceKey: 'amount', operator: 'gte', value: 100 },
          ],
          logic: 'and',
          actions: [],
        },
        data,
      ),
    ).toBe(true);

    // and 逻辑：一项不满足则为 false
    expect(
      DynamicRuleEngine.evaluateRule(
        {
          conditions: [
            { sourceKey: 'status', operator: 'eq', value: 'approved' },
            { sourceKey: 'amount', operator: 'gt', value: 1000 },
          ],
          logic: 'and',
          actions: [],
        },
        data,
      ),
    ).toBe(false);

    // or 逻辑：任意一项满足即为 true
    expect(
      DynamicRuleEngine.evaluateRule(
        {
          conditions: [
            { sourceKey: 'status', operator: 'eq', value: 'rejected' },
            { sourceKey: 'amount', operator: 'gte', value: 100 },
          ],
          logic: 'or',
          actions: [],
        },
        data,
      ),
    ).toBe(true);
  });

  it('应该正确执行 actions 与 otherwise 状态分支切换', () => {
    const widget: FormWidget = {
      id: 'w_tax',
      type: 'input',
      modelKey: 'taxNumber',
      label: '税号',
      dynamicRules: [
        {
          conditions: [{ sourceKey: 'isCompany', operator: 'eq', value: true }],
          actions: [
            { target: 'visible', value: true },
            { target: 'required', value: true },
          ],
          otherwise: [
            { target: 'visible', value: false },
            { target: 'required', value: false },
          ],
        },
      ],
    };

    // 当 isCompany 为 true 时
    const res1 = DynamicRuleEngine.evaluateWidget(widget, { isCompany: true });
    expect(res1.visible).toBe(true);
    expect(res1.required).toBe(true);

    // 当 isCompany 为 false 时
    const res2 = DynamicRuleEngine.evaluateWidget(widget, { isCompany: false });
    expect(res2.visible).toBe(false);
    expect(res2.required).toBe(false);
  });
});

describe('AtengFormRenderer 动态联动响应式集成', () => {
  it('应该在表单数据变更时自动响应显隐联动并触发公式级联计算', async () => {
    const schema: FormSchema = {
      version: '1.0',
      formConfig: { layout: 'vertical' },
      widgetList: [
        {
          id: 'w_invoice',
          type: 'checkbox',
          modelKey: 'needInvoice',
          label: '是否开具发票',
          defaultValue: false,
        },
        {
          id: 'w_title',
          type: 'input',
          modelKey: 'invoiceTitle',
          label: '发票抬头',
          defaultValue: '',
          rules: [{ required: true, message: '发票抬头不能为空' }],
          dynamicRules: [
            {
              conditions: [{ sourceKey: 'needInvoice', operator: 'eq', value: true }],
              actions: [{ target: 'visible', value: true }],
              otherwise: [{ target: 'visible', value: false }],
            },
          ],
        },
        {
          id: 'w_price',
          type: 'input',
          modelKey: 'price',
          label: '单价',
          defaultValue: 100,
        },
        {
          id: 'w_quantity',
          type: 'input',
          modelKey: 'quantity',
          label: '数量',
          defaultValue: 2,
        },
        {
          id: 'w_total',
          type: 'input',
          modelKey: 'totalAmount',
          label: '总金额',
          defaultValue: 0,
          dynamicRules: [
            {
              conditions: [{ sourceKey: 'price', operator: 'gt', value: 0 }],
              actions: [
                {
                  target: 'value',
                  value: 'price * quantity',
                },
              ],
            },
          ],
        },
      ],
    };

    const formData = ref<Record<string, unknown>>({});

    const wrapper = mount(AtengFormRenderer, {
      props: {
        schema,
        formData: formData.value,
        'onUpdate:formData': val => {
          formData.value = val;
        },
      },
    });

    const instance = wrapper.vm as unknown as FormRendererInstance;

    // 初始状态：needInvoice 为 false，invoiceTitle 应该不可见
    expect(wrapper.text()).not.toContain('发票抬头');
    // totalAmount 应该依据公式初始化为 100 * 2 = 200
    expect(instance.getFieldValue('totalAmount')).toBe(200);

    // 勾选 needInvoice 为 true
    instance.setFieldValue('needInvoice', true);
    await nextTick();

    // 发票抬头应该变为可见
    expect(wrapper.text()).toContain('发票抬头');

    // 修改数量为 5
    instance.setFieldValue('quantity', 5);
    await nextTick();

    // totalAmount 应该联动更新为 100 * 5 = 500
    expect(instance.getFieldValue('totalAmount')).toBe(500);

    wrapper.unmount();
  });
});
