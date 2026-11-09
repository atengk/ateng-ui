<script setup lang="ts">
/**
 * AtengFormRenderer 表单运行态轻量高阶渲染容器。
 *
 * 遵循 ADR-0044 规约，负责解析三段式 AST Schema、双向数据绑定、流程节点权限覆盖与表单校验。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormSchema, FieldPermissionMatrix, FormValidationErrors } from '../types';
import { useFormRenderer } from '../composables/useFormRenderer';
import { defaultWidgetRegistry } from '../registry';
import type { FormWidgetRegistry } from '../registry';

interface Props {
  /** 表单三段式 AST Schema 结构 */
  schema: FormSchema;
  /** 双向绑定的表单填报数据模型 */
  formData?: Record<string, unknown>;
  /** BPMN 流程协同节点字段权限矩阵 */
  permissions?: FieldPermissionMatrix;
  /** 全局禁用控制 */
  disabled?: boolean;
  /** 全局只读控制 */
  readonly?: boolean;
  /** 控件注册中心实例，默认使用全局单例 */
  registry?: FormWidgetRegistry;
  /** 标签宽度覆盖 */
  labelWidth?: number | string;
  /** 标签位置覆盖 */
  labelPosition?: 'left' | 'right' | 'top';
  /** 尺寸覆盖 */
  size?: 'large' | 'default' | 'small';
}

const props = withDefaults(defineProps<Props>(), {
  formData: () => ({}),
  permissions: () => ({}),
  disabled: false,
  readonly: false,
  registry: () => defaultWidgetRegistry,
  labelWidth: undefined,
  labelPosition: undefined,
  size: undefined,
});

const emit = defineEmits<{
  'update:formData': [data: Record<string, unknown>];
  change: [field: string, value: unknown, data: Record<string, unknown>];
  submit: [data: Record<string, unknown>];
  'validate-fail': [errors: FormValidationErrors];
}>();

// 实例化无头响应式状态机
const renderer = useFormRenderer({
  schema: () => props.schema,
  formData: () => props.formData,
  permissions: () => props.permissions,
  disabled: () => props.disabled,
  readonly: () => props.readonly,
  onUpdateFormData: data => emit('update:formData', data),
  onFieldChange: (field, val, data) => emit('change', field, val, data),
});

const {
  errors,
  getFieldValue,
  setFieldValue,
  getFormData,
  setFormData,
  isFieldVisible,
  isFieldDisabled,
  isFieldReadonly,
  isFieldRequired,
  validate,
  validateField,
  clearValidate,
  resetFields,
} = renderer;

// 计算有效的布局配置
const effectiveLayout = computed(() => {
  return props.schema.formConfig?.layout || 'vertical';
});

const effectiveLabelPosition = computed(() => {
  return (
    props.labelPosition ||
    props.schema.formConfig?.labelPosition ||
    (effectiveLayout.value === 'vertical' ? 'top' : 'right')
  );
});

const effectiveLabelWidth = computed(() => {
  const w = props.labelWidth ?? props.schema.formConfig?.labelWidth ?? 100;
  return typeof w === 'number' ? `${w}px` : w;
});

const effectiveSize = computed(() => {
  return props.size || props.schema.formConfig?.size || 'default';
});

// 表单提交处理
const handleSubmit = async (): Promise<void> => {
  const result = await validate();
  if (result.valid) {
    emit('submit', getFormData());
  } else {
    emit('validate-fail', result.errors);
  }
};

// 显式暴露实例方法 (ADR-0029, ADR-0044)
defineExpose({
  validate,
  validateField,
  clearValidate,
  resetFields,
  getFormData,
  setFormData,
  getFieldValue,
  setFieldValue,
});
</script>

<template>
  <form
    class="at-form-renderer"
    :class="[
      `layout-${effectiveLayout}`,
      `label-pos-${effectiveLabelPosition}`,
      `size-${effectiveSize}`,
    ]"
    @submit.prevent="handleSubmit"
  >
    <div class="at-form-body">
      <template v-for="widget in schema.widgetList" :key="widget.id">
        <div
          v-if="isFieldVisible(widget)"
          class="at-form-item"
          :class="{
            'has-error': widget.modelKey && errors[widget.modelKey],
            'is-required': isFieldRequired(widget),
            'is-readonly': isFieldReadonly(widget),
          }"
        >
          <!-- 标签区 -->
          <label
            v-if="widget.label"
            class="at-form-item-label"
            :style="{
              width: effectiveLabelPosition !== 'top' ? effectiveLabelWidth : undefined,
            }"
          >
            <span v-if="isFieldRequired(widget)" class="at-required-asterisk">*</span>
            {{ widget.label }}
            <span v-if="schema.formConfig?.colon" class="at-colon">:</span>
          </label>

          <!-- 控件渲染区 -->
          <div class="at-form-item-content">
            <component
              :is="registry.get(widget.type)?.component"
              v-if="registry.get(widget.type)"
              :widget="widget"
              :model-value="widget.modelKey ? getFieldValue(widget.modelKey) : undefined"
              :disabled="isFieldDisabled(widget)"
              :readonly="isFieldReadonly(widget)"
              :size="effectiveSize"
              @update:model-value="
                (val: unknown) => widget.modelKey && setFieldValue(widget.modelKey, val)
              "
              @blur="() => widget.modelKey && validateField(widget.modelKey)"
            />
            <div v-else class="at-widget-missing-fallback">未注册的控件类型: {{ widget.type }}</div>

            <!-- 错误校验提示 -->
            <transition name="at-fade">
              <div v-if="widget.modelKey && errors[widget.modelKey]" class="at-form-item-error">
                {{ errors[widget.modelKey] }}
              </div>
            </transition>
          </div>
        </div>
      </template>
    </div>

    <!-- 底部操作插槽 -->
    <div v-if="$slots.footer" class="at-form-footer">
      <slot name="footer" :submit="handleSubmit" :reset="resetFields" :validating="false" />
    </div>
  </form>
</template>

<style scoped>
.at-form-renderer {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  color: var(--at-form-text-color, #1e293b);
}

.at-form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.at-form-item {
  display: flex;
  position: relative;
  box-sizing: border-box;
}

/* 垂直排版 (标签置顶) */
.label-pos-top .at-form-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* 水平排版 (标签居左或居右) */
.label-pos-left .at-form-item,
.label-pos-right .at-form-item {
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
}

.label-pos-right .at-form-item-label {
  text-align: right;
}

.label-pos-left .at-form-item-label {
  text-align: left;
}

.at-form-item-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 36px;
  color: var(--at-form-label-color, #334155);
  box-sizing: border-box;
  flex-shrink: 0;
}

.at-required-asterisk {
  color: var(--at-form-danger-color, #ef4444);
  margin-right: 4px;
  font-weight: bold;
}

.at-colon {
  margin-left: 2px;
}

.at-form-item-content {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.at-form-item-error {
  color: var(--at-form-danger-color, #ef4444);
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
}

.at-widget-missing-fallback {
  padding: 8px 12px;
  background-color: #fef2f2;
  border: 1px dashed #f87171;
  color: #b91c1c;
  border-radius: 6px;
  font-size: 13px;
}

.at-form-footer {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.at-fade-enter-active,
.at-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.at-fade-enter-from,
.at-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
