/**
 * CodeGenerator 表单代码与多协议编译器单元测试。
 *
 * 遵循 ADR-0044 规约：
 * 验证 AST JSON 序列化、标准 JSON Schema Draft-07 导出与反向还原、Mock 填报数据语义合成与 Vue 3 SFC 单文件生成。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import type { FormSchema } from '../src/types';
import { CodeGenerator } from '../src/generator';

describe('CodeGenerator 多协议与代码生成编译器', () => {
  const sampleWidgets = [
    {
      id: 'widget_user',
      type: 'input',
      label: '申请人姓名',
      modelKey: 'userName',
      rules: [
        { required: true, message: '申请人姓名必填' },
        { min: 2, max: 20 },
      ],
    },
    {
      id: 'widget_email',
      type: 'input',
      label: '联系邮箱',
      modelKey: 'userEmail',
      rules: [{ required: true }, { type: 'email', message: '邮箱格式不正确' }],
    },
    {
      id: 'widget_phone',
      type: 'input',
      label: '联系电话',
      modelKey: 'phone',
      rules: [{ pattern: /^1[3-9]\d{9}$/ }],
    },
    {
      id: 'widget_amount',
      type: 'input-number',
      label: '预算金额',
      modelKey: 'budgetAmount',
      defaultValue: 5000,
      rules: [{ min: 100, max: 1000000 }],
    },
    {
      id: 'widget_urgent',
      type: 'switch',
      label: '是否加急',
      modelKey: 'isUrgent',
      defaultValue: false,
    },
    {
      id: 'widget_category',
      type: 'select',
      label: '物资类别',
      modelKey: 'category',
      props: {
        options: [
          { label: '办公用品', value: 'office' },
          { label: '电子设备', value: 'electronics' },
        ],
      },
    },
    // 布局容器：嵌套字段平铺
    {
      id: 'widget_card',
      type: 'card',
      label: '附加说明',
      isContainer: true,
      children: [
        {
          id: 'widget_remark',
          type: 'textarea',
          label: '审批备注',
          modelKey: 'remark',
        },
      ],
    },
    // 数据明细容器：SubForm
    {
      id: 'widget_subform',
      type: 'sub-form',
      label: '物资采购明细',
      modelKey: 'items',
      isContainer: true,
      isCollection: true,
      containerType: 'data' as const,
      rules: [{ required: true, message: '采购明细不能为空' }],
      children: [
        {
          id: 'sub_item_name',
          type: 'input',
          label: '物品名称',
          modelKey: 'itemName',
          rules: [{ required: true }],
        },
        {
          id: 'sub_item_qty',
          type: 'input-number',
          label: '采购数量',
          modelKey: 'itemQty',
          defaultValue: 1,
        },
        {
          id: 'sub_item_price',
          type: 'input-number',
          label: '物品单价',
          modelKey: 'itemPrice',
        },
      ],
    },
  ];

  const sampleSchema: FormSchema = {
    version: '1.0',
    id: 'test_order_form',
    title: '采购订单审批单',
    description: '用于企业内部供应链物资采购审批',
    formConfig: {
      layout: 'vertical',
      labelPosition: 'right',
      labelWidth: 120,
    },
    widgetList: sampleWidgets,
    widgets: sampleWidgets,
  };

  it('toSchemaJson 成功输出 2 格缩进的完整 AST JSON', () => {
    const jsonStr = CodeGenerator.toSchemaJson(sampleSchema);
    expect(typeof jsonStr).toBe('string');
    const parsed = JSON.parse(jsonStr) as FormSchema;
    expect(parsed.id).toBe('test_order_form');
    expect(parsed.widgets?.length).toBe(sampleSchema.widgets?.length);
  });

  it('toStandardJsonSchema 成功转换为符合 JSON Schema Draft-07 的标准协议', () => {
    const jsonSchema = CodeGenerator.toStandardJsonSchema(sampleSchema);

    expect(jsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.title).toBe('采购订单审批单');
    expect(jsonSchema.required).toContain('userName');
    expect(jsonSchema.required).toContain('userEmail');
    expect(jsonSchema.required).toContain('items');

    // 叶子字段解析
    const props = jsonSchema.properties;
    expect(props.userName?.type).toBe('string');
    expect(props.userName?.minLength).toBe(2);
    expect(props.userName?.maxLength).toBe(20);

    expect(props.userEmail?.format).toBe('email');
    expect(props.phone?.pattern).toBe('^1[3-9]\\d{9}$');

    expect(props.budgetAmount?.type).toBe('number');
    expect(props.budgetAmount?.minimum).toBe(100);
    expect(props.budgetAmount?.maximum).toBe(1000000);
    expect(props.budgetAmount?.default).toBe(5000);

    expect(props.isUrgent?.type).toBe('boolean');
    expect(props.category?.type).toBe('string');
    expect(props.category?.enum).toEqual(['office', 'electronics']);

    // 布局容器内部的 remark 被平铺至顶层 properties
    expect(props.remark?.type).toBe('string');

    // SubForm 被解析为 array，其 items 为 object
    expect(props.items?.type).toBe('array');
    const subItems = props.items?.items as {
      type: string;
      properties: Record<string, { type: string }>;
      required?: string[];
    };
    expect(subItems.type).toBe('object');
    expect(subItems.properties.itemName?.type).toBe('string');
    expect(subItems.properties.itemQty?.type).toBe('number');
    expect(subItems.required).toContain('itemName');
  });

  it('fromStandardJsonSchema 支持逆向转译还原为 FormSchema AST', () => {
    const jsonSchema = CodeGenerator.toStandardJsonSchema(sampleSchema);
    const restoredAst = CodeGenerator.fromStandardJsonSchema(jsonSchema);

    expect(restoredAst.title).toBe('采购订单审批单');
    expect(restoredAst.widgetList.length).toBeGreaterThan(0);

    // 查找还原的 userName
    const userWidget = restoredAst.widgetList.find(w => w.modelKey === 'userName');
    expect(userWidget).toBeDefined();
    expect(userWidget?.type).toBe('input');
    expect(userWidget?.rules?.some(r => r.required)).toBe(true);

    // 查找还原的 budgetAmount
    const amountWidget = restoredAst.widgetList.find(w => w.modelKey === 'budgetAmount');
    expect(amountWidget?.type).toBe('input-number');

    // 查找还原的 category 下拉选项
    const catWidget = restoredAst.widgetList.find(w => w.modelKey === 'category');
    expect(catWidget?.type).toBe('select');
    expect((catWidget?.props?.options as Array<{ value: unknown }>).length).toBe(2);

    // 查找还原的 SubForm
    const subFormWidget = restoredAst.widgetList.find(w => w.modelKey === 'items');
    expect(subFormWidget).toBeDefined();
    expect(subFormWidget?.type).toBe('sub-form');
    expect(subFormWidget?.isContainer).toBe(true);
    expect(subFormWidget?.containerType).toBe('data');
    expect(subFormWidget?.children?.length).toBe(3);
  });

  it('toMockData 智能语义合成真实感测试数据与子表单明细', () => {
    const mock = CodeGenerator.toMockData(sampleSchema);

    expect(typeof mock).toBe('object');
    expect(mock.userName).toBe('张三');
    expect(mock.userEmail).toBe('ateng@example.com');
    expect(mock.phone).toBe('13800138000');
    // defaultValue 优先
    expect(mock.budgetAmount).toBe(5000);
    expect(mock.isUrgent).toBe(false);

    // SubForm 生成两条明细
    expect(Array.isArray(mock.items)).toBe(true);
    const items = mock.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(2);
    expect(items[0]?.itemQty).toBe(1);
    expect(typeof items[0]?.itemName).toBe('string');
  });

  it('toVueSfc 生成独立完整且格式优雅的 Vue 3 SFC 单文件组件', () => {
    const sfcCode = CodeGenerator.toVueSfc(sampleSchema, {
      componentName: 'PurchaseOrderForm',
    });

    expect(typeof sfcCode).toBe('string');
    // SFC 标签结构顺序
    expect(sfcCode).toContain('<script setup lang="ts">');
    expect(sfcCode).toContain('<template>');
    expect(sfcCode).toContain('<style scoped>');

    // 状态与逻辑
    expect(sfcCode).toContain('const formData = reactive<Record<string, unknown>>(');
    expect(sfcCode).toContain('const rules = reactive<FormRules>(');
    expect(sfcCode).toContain('const handleSubmit = async () =>');
    expect(sfcCode).toContain('const handleReset = () =>');

    // 模板与 Element Plus 标签
    expect(sfcCode).toContain('<el-form');
    expect(sfcCode).toContain('prop="userName"');
    expect(sfcCode).toContain('<el-table :data="formData.items"');
    expect(sfcCode).toContain('<el-switch v-model="formData.isUrgent"');
  });
});
