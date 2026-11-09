/**
 * CodeGenerator 表单代码与多协议编译器。
 *
 * 遵循 ADR-0044 规范，提供四大交付物（AST JSON、标准 JSON Schema Draft-07、Vue 3 SFC、Mock 填报数据）及反向导入。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type {
  FormSchema,
  FormWidget,
  StandardJsonSchema,
  StandardJsonSchemaProperty,
  VueSfcGenOptions,
} from '../types';

/**
 * 代码生成器类。
 */
export class CodeGenerator {
  /**
   * 序列化整棵 AST Schema 为 2 格缩进的 JSON 字符串。
   */
  public static toSchemaJson(schema: FormSchema): string {
    return JSON.stringify(schema, null, 2);
  }

  /**
   * 将 FormSchema 编译转换为符合 JSON Schema Draft-07 标准协议的对象。
   */
  public static toStandardJsonSchema(schema: FormSchema): StandardJsonSchema {
    const properties: Record<string, StandardJsonSchemaProperty> = {};
    const required: string[] = [];

    const traverse = (
      widgets: FormWidget[],
      targetProps: Record<string, StandardJsonSchemaProperty>,
      targetRequired: string[],
    ) => {
      for (const widget of widgets) {
        if (!widget) continue;

        // 子表单明细容器
        if (widget.type === 'sub-form' || widget.containerType === 'data') {
          if (!widget.modelKey) continue;
          const subProps: Record<string, StandardJsonSchemaProperty> = {};
          const subRequired: string[] = [];
          if (widget.children && widget.children.length > 0) {
            traverse(widget.children, subProps, subRequired);
          }
          targetProps[widget.modelKey] = {
            type: 'array',
            title: widget.label,
            description: (widget.props?.placeholder as string) || '',
            items: {
              type: 'object',
              properties: subProps,
              required: subRequired.length > 0 ? subRequired : undefined,
            },
          };
          if (widget.rules?.some(r => r.required)) {
            targetRequired.push(widget.modelKey);
          }
          continue;
        }

        // 布局排版容器：递归将其内部字段平铺到当前数据作用域
        if (widget.isContainer && widget.children && widget.children.length > 0) {
          traverse(widget.children, targetProps, targetRequired);
          continue;
        }

        // 叶子输入控件
        if (!widget.modelKey) continue;

        const propDef: StandardJsonSchemaProperty = {
          type: mapWidgetTypeToJsonSchemaType(widget.type),
          title: widget.label,
          description: (widget.props?.placeholder as string) || undefined,
        };

        if (widget.defaultValue !== undefined) {
          propDef.default = widget.defaultValue;
        }

        // 提取候选枚举
        const options = widget.props?.options as
          Array<{ label: string; value: unknown }> | undefined;
        if (Array.isArray(options) && options.length > 0) {
          propDef.enum = options.map(opt => opt.value);
        }

        // 解析校验规则
        if (widget.rules && widget.rules.length > 0) {
          for (const rule of widget.rules) {
            if (rule.required) {
              if (!targetRequired.includes(widget.modelKey)) {
                targetRequired.push(widget.modelKey);
              }
            }
            if (rule.pattern) {
              propDef.pattern =
                rule.pattern instanceof RegExp ? rule.pattern.source : String(rule.pattern);
            }
            if (typeof rule.min === 'number') {
              if (propDef.type === 'string') {
                propDef.minLength = rule.min;
              } else if (propDef.type === 'number') {
                propDef.minimum = rule.min;
              }
            }
            if (typeof rule.max === 'number') {
              if (propDef.type === 'string') {
                propDef.maxLength = rule.max;
              } else if (propDef.type === 'number') {
                propDef.maximum = rule.max;
              }
            }
            if (rule.type === 'email') {
              propDef.format = 'email';
            } else if (rule.type === 'url') {
              propDef.format = 'uri';
            }
          }
        }

        targetProps[widget.modelKey] = propDef;
      }
    };

    traverse(schema.widgetList || schema.widgets || [], properties, required);

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: schema.title || 'DynamicForm',
      description: schema.description || undefined,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * 将符合标准 JSON Schema Draft-07 协议的对象逆向解析为 FormSchema AST。
   */
  public static fromStandardJsonSchema(jsonSchema: StandardJsonSchema): FormSchema {
    const widgets: FormWidget[] = [];
    const requiredKeys = new Set(jsonSchema.required || []);

    const parseProperties = (
      props: Record<string, StandardJsonSchemaProperty>,
      reqSet: Set<string>,
    ): FormWidget[] => {
      const result: FormWidget[] = [];

      for (const [key, prop] of Object.entries(props)) {
        const isRequired = reqSet.has(key);
        const rules = isRequired
          ? [{ required: true, message: `${prop.title || key} 不能为空` }]
          : [];

        // 识别数组明细子表单
        if (
          prop.type === 'array' &&
          prop.items &&
          typeof prop.items === 'object' &&
          'properties' in prop.items &&
          prop.items.properties
        ) {
          const subReqSet = new Set((prop.items as StandardJsonSchema).required || []);
          const subChildren = parseProperties(
            prop.items.properties as Record<string, StandardJsonSchemaProperty>,
            subReqSet,
          );

          result.push({
            id: `widget_${key}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: 'sub-form',
            label: prop.title || key,
            modelKey: key,
            isContainer: true,
            isCollection: true,
            containerType: 'data',
            children: subChildren,
            rules: rules.length > 0 ? rules : undefined,
          });
          continue;
        }

        // 叶子字段控件类型推导
        let widgetType = 'input';
        const extraProps: Record<string, unknown> = {};

        if (prop.type === 'number') {
          widgetType = 'input-number';
        } else if (prop.type === 'boolean') {
          widgetType = 'switch';
        } else if (prop.type === 'string') {
          if (prop.enum && prop.enum.length > 0) {
            widgetType = 'select';
            extraProps.options = prop.enum.map(val => ({
              label: String(val),
              value: val,
            }));
          } else if (prop.format === 'date' || prop.format === 'date-time') {
            widgetType = 'date-picker';
          }
        }

        result.push({
          id: `widget_${key}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: widgetType,
          label: prop.title || key,
          modelKey: key,
          defaultValue: prop.default,
          props: Object.keys(extraProps).length > 0 ? extraProps : undefined,
          rules: rules.length > 0 ? rules : undefined,
        });
      }

      return result;
    };

    if (jsonSchema.properties) {
      widgets.push(...parseProperties(jsonSchema.properties, requiredKeys));
    }

    return {
      version: '1.0',
      id: `schema_${Date.now()}`,
      title: jsonSchema.title || 'DynamicForm',
      description: jsonSchema.description || '',
      formConfig: {
        layout: 'vertical',
        labelPosition: 'top',
        colon: true,
      },
      widgetList: widgets,
      widgets,
    };
  }

  /**
   * 智能语义合成真实感 Mock 填报数据。
   */
  public static toMockData(schema: FormSchema): Record<string, unknown> {
    const mockData: Record<string, unknown> = {};

    const traverse = (widgets: FormWidget[], target: Record<string, unknown>) => {
      for (const widget of widgets) {
        if (!widget) continue;

        // 子表单明细：生成 2 条带字段的明细数组
        if (widget.type === 'sub-form' || widget.containerType === 'data') {
          if (!widget.modelKey) continue;
          const row1: Record<string, unknown> = {};
          const row2: Record<string, unknown> = {};
          if (widget.children && widget.children.length > 0) {
            traverse(widget.children, row1);
            traverse(widget.children, row2);
          }
          target[widget.modelKey] = [row1, row2];
          continue;
        }

        // 布局容器递归
        if (widget.isContainer && widget.children && widget.children.length > 0) {
          traverse(widget.children, target);
          continue;
        }

        if (!widget.modelKey) continue;

        // 优先使用默认值
        if (widget.defaultValue !== undefined) {
          try {
            target[widget.modelKey] = structuredClone(widget.defaultValue);
          } catch {
            target[widget.modelKey] = widget.defaultValue;
          }
          continue;
        }

        target[widget.modelKey] = generateMockValue(widget);
      }
    };

    traverse(schema.widgetList || schema.widgets || [], mockData);
    return mockData;
  }

  /**
   * 编译输出独立可运行的 Vue 3 SFC 单文件组件代码。
   */
  public static toVueSfc(schema: FormSchema, options: VueSfcGenOptions = {}): string {
    const componentName = options.componentName || 'DynamicForm';
    const mockData = this.toMockData(schema);
    const mockDataJson = JSON.stringify(mockData, null, 2);

    // 收集所有叶子输入项的 rules
    const rulesObj: Record<string, unknown[]> = {};
    const extractRules = (widgets: FormWidget[]) => {
      for (const w of widgets) {
        if (!w) continue;
        if (w.modelKey && w.rules && w.rules.length > 0) {
          rulesObj[w.modelKey] = w.rules.map(r => {
            const ruleItem: Record<string, unknown> = {};
            if (r.required !== undefined) ruleItem.required = r.required;
            if (r.message !== undefined) ruleItem.message = r.message;
            if (r.trigger !== undefined) ruleItem.trigger = r.trigger;
            if (r.type !== undefined) ruleItem.type = r.type;
            if (r.min !== undefined) ruleItem.min = r.min;
            if (r.max !== undefined) ruleItem.max = r.max;
            return ruleItem;
          });
        }
        if (w.children) {
          extractRules(w.children);
        }
      }
    };
    extractRules(schema.widgetList || schema.widgets || []);
    const rulesJson = JSON.stringify(rulesObj, null, 2);

    // 生成模板中的表单控件
    const renderWidgetTemplate = (w: FormWidget, indent = '        '): string => {
      const span = w.layout?.span ?? 24;
      const key = w.modelKey || '';

      if (w.type === 'sub-form' || w.containerType === 'data') {
        return `${indent}<el-col :span="${span}">
${indent}  <el-divider content-position="left">${w.label}</el-divider>
${indent}  <el-table :data="formData.${key}" border style="width: 100%; margin-bottom: 16px;">
${indent}    <!-- 子表单明细列表 -->
${(w.children || [])
  .map(c => `${indent}    <el-table-column prop="${c.modelKey}" label="${c.label}" />`)
  .join('\n')}
${indent}  </el-table>
${indent}</el-col>`;
      }

      if (w.isContainer && w.children && w.children.length > 0) {
        return `${indent}<el-col :span="${span}">
${indent}  <el-card shadow="never" style="margin-bottom: 16px;">
${indent}    <template #header><span>${w.label}</span></template>
${indent}    <el-row :gutter="16">
${w.children.map(c => renderWidgetTemplate(c, indent + '      ')).join('\n')}
${indent}    </el-row>
${indent}  </el-card>
${indent}</el-col>`;
      }

      let innerTag = `<el-input v-model="formData.${key}" placeholder="${(w.props?.placeholder as string) || ''}" />`;
      if (w.type === 'textarea') {
        innerTag = `<el-input v-model="formData.${key}" type="textarea" :rows="3" />`;
      } else if (w.type === 'input-number') {
        innerTag = `<el-input-number v-model="formData.${key}" />`;
      } else if (w.type === 'switch') {
        innerTag = `<el-switch v-model="formData.${key}" />`;
      } else if (w.type === 'rate') {
        innerTag = `<el-rate v-model="formData.${key}" />`;
      } else if (w.type === 'slider') {
        innerTag = `<el-slider v-model="formData.${key}" />`;
      } else if (w.type === 'date-picker') {
        innerTag = `<el-date-picker v-model="formData.${key}" type="date" value-format="YYYY-MM-DD" />`;
      } else if (w.type === 'select') {
        const opts = (w.props?.options as Array<{ label: string; value: unknown }>) || [];
        innerTag = `<el-select v-model="formData.${key}" placeholder="请选择">
${opts.map(o => `${indent}    <el-option label="${o.label}" :value="${JSON.stringify(o.value)}" />`).join('\n')}
${indent}  </el-select>`;
      }

      return `${indent}<el-col :span="${span}">
${indent}  <el-form-item label="${w.label}" prop="${key}">
${indent}    ${innerTag}
${indent}  </el-form-item>
${indent}</el-col>`;
    };

    const templateItems = (schema.widgetList || schema.widgets || [])
      .map((w: FormWidget) => renderWidgetTemplate(w, '        '))
      .join('\n');

    return `<script setup lang="ts">
/**
 * 由 @atengk/form-designer-vue 代码生成器自动编译导出。
 * 组件名称: ${componentName}
 * 生成时间: ${new Date().toISOString()}
 */

import { reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';

const formRef = ref<FormInstance>();

const formData = reactive<Record<string, unknown>>(${mockDataJson});

const rules = reactive<FormRules>(${rulesJson});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    ElMessage.success('表单校验通过，提交成功！');
    console.log('[${componentName}] 提交表单数据:', formData);
  } catch (error) {
    ElMessage.error('表单校验未通过，请检查必填项与输入格式');
  }
};

const handleReset = () => {
  if (!formRef.value) return;
  formRef.value.resetFields();
};
</script>

<template>
  <div class="dynamic-form-wrapper">
    <el-card shadow="never" class="dynamic-form-card">
      <template #header>
        <div class="dynamic-form-header">
          <span class="dynamic-form-title">${schema.title || '动态表单'}</span>
          <span class="dynamic-form-desc">${schema.description || ''}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="right"
        label-width="120px"
        status-icon
      >
        <el-row :gutter="20">
${templateItems}
        </el-row>

        <el-row>
          <el-col :span="24" class="dynamic-form-actions">
            <el-button type="primary" @click="handleSubmit">提交</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.dynamic-form-wrapper {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.dynamic-form-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dynamic-form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.dynamic-form-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.dynamic-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}
</style>
`;
  }
}

/**
 * 辅助映射：根据控件类型映射 JSON Schema 标准基础类型。
 */
function mapWidgetTypeToJsonSchemaType(widgetType: string): string {
  switch (widgetType) {
    case 'input-number':
    case 'slider':
    case 'rate':
      return 'number';
    case 'switch':
      return 'boolean';
    case 'checkbox-group':
    case 'transfer':
    case 'cascader':
    case 'upload':
      return 'array';
    case 'input':
    case 'textarea':
    case 'select':
    case 'radio':
    case 'date-picker':
    case 'color-picker':
    default:
      return 'string';
  }
}

/**
 * 语义化合成单个字段的 Mock 虚假数据。
 */
function generateMockValue(widget: FormWidget): unknown {
  const key = widget.modelKey || '';

  // 1. 根据键名进行语义模式匹配（优先更具体的业务语义）
  if (/(email|mail)/i.test(key)) {
    return 'ateng@example.com';
  }
  if (/(phone|mobile|tel)/i.test(key)) {
    return '13800138000';
  }
  if (/(name|nick|author|user)/i.test(key)) {
    return '张三';
  }
  if (/(age)/i.test(key)) {
    return 28;
  }
  if (/(price|amount|salary|money|cost|total)/i.test(key)) {
    return 999.0;
  }
  if (/(address|addr)/i.test(key)) {
    return '北京市朝阳区高新科技园88号';
  }
  if (/(city|province)/i.test(key)) {
    return '北京市';
  }
  if (/(date|time|day)/i.test(key)) {
    return '2026-11-09';
  }
  if (/(desc|remark|comment|content|summary)/i.test(key)) {
    return '这是一段自动合成的表单测试说明文本。';
  }

  // 2. 根据控件类型生成默认类型契约数据
  switch (widget.type) {
    case 'input-number':
    case 'slider':
      return 10;
    case 'rate':
      return 4;
    case 'switch':
      return true;
    case 'date-picker':
      return '2026-11-09';
    case 'color-picker':
      return '#409eff';
    case 'select':
    case 'radio': {
      const opts = widget.props?.options as Array<{ value: unknown }> | undefined;
      return opts && opts.length > 0 ? opts[0]?.value : 'option_1';
    }
    case 'checkbox-group':
    case 'transfer': {
      const opts = widget.props?.options as Array<{ value: unknown }> | undefined;
      return opts && opts.length > 0 ? [opts[0]?.value] : [];
    }
    case 'textarea':
      return `${widget.label || '输入项'}测试内容`;
    case 'input':
    default:
      return `${widget.label || '测试数据'}`;
  }
}
