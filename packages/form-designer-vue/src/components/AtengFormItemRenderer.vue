<script setup lang="ts">
/**
 * @atengk/form-designer-vue 表单项与嵌套容器细粒度分发渲染器。
 *
 * 遵循 ADR-0044 规约与容器二分法：
 * 1. LayoutContainer (Grid, Card): 纯排版布局，递归分发子控件，内部字段平铺绑定至根 formData；
 * 2. DataContainer (SubForm): 动态明细子表单，生成独立数组分支与行作用域；
 * 3. 基础原子控件：标准标签、控件适配器渲染、校验中指示与校验错误提示。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormWidget } from '../types';
import type { FormWidgetRegistry } from '../registry';
import AtengFormGrid from '../containers/AtengFormGrid.vue';
import AtengFormCard from '../containers/AtengFormCard.vue';
import AtengSubForm from '../containers/AtengSubForm.vue';

interface Props {
  widget: FormWidget;
  errors?: Record<string, string>;
  validatingFields?: Record<string, boolean>;
  registry: FormWidgetRegistry;
  effectiveLabelPosition?: 'left' | 'right' | 'top';
  effectiveLabelWidth?: string;
  effectiveSize?: 'large' | 'default' | 'small';
  colon?: boolean;
  isFieldVisible: (w: FormWidget) => boolean;
  isFieldDisabled: (w: FormWidget) => boolean;
  isFieldReadonly: (w: FormWidget) => boolean;
  isFieldRequired: (w: FormWidget) => boolean;
  getFieldValue: (path: string) => unknown;
  setFieldValue: (path: string, val: unknown) => void;
  validateField: (
    path: string,
    trigger?: 'blur' | 'change',
  ) => Promise<{ valid: boolean; error?: string }>;
}

const props = withDefaults(defineProps<Props>(), {
  errors: () => ({}),
  validatingFields: () => ({}),
  effectiveLabelPosition: 'top',
  effectiveLabelWidth: '100px',
  effectiveSize: 'default',
  colon: true,
});

const isGrid = computed(() => props.widget.type === 'grid');
const isCard = computed(() => props.widget.type === 'card');
const isSubForm = computed(() => props.widget.type === 'subform' || props.widget.isCollection);

const modelValue = computed(() => {
  return props.widget.modelKey ? props.getFieldValue(props.widget.modelKey) : undefined;
});

const isVisible = computed(() => props.isFieldVisible(props.widget));
const isDisabled = computed(() => props.isFieldDisabled(props.widget));
const isReadonly = computed(() => props.isFieldReadonly(props.widget));
const isRequired = computed(() => props.isFieldRequired(props.widget));
const hasError = computed(() =>
  Boolean(props.widget.modelKey && props.errors[props.widget.modelKey]),
);
const isValidating = computed(() =>
  Boolean(props.widget.modelKey && props.validatingFields[props.widget.modelKey]),
);
const errorMsg = computed(() =>
  props.widget.modelKey ? props.errors[props.widget.modelKey] : undefined,
);

const handleValueUpdate = (val: unknown): void => {
  if (props.widget.modelKey) {
    props.setFieldValue(props.widget.modelKey, val);
    props.validateField(props.widget.modelKey, 'change');
  }
};

const handleBlur = (): void => {
  if (props.widget.modelKey) {
    props.validateField(props.widget.modelKey, 'blur');
  }
};
</script>

<template>
  <template v-if="isVisible">
    <!-- 1. 栅格布局容器 (LayoutContainer: Grid) -->
    <AtengFormGrid v-if="isGrid" :widget="widget" :disabled="isDisabled" :readonly="isReadonly">
      <AtengFormItemRenderer
        v-for="child in widget.children"
        :key="child.id"
        :widget="child"
        :errors="errors"
        :validating-fields="validatingFields"
        :registry="registry"
        :effective-label-position="effectiveLabelPosition"
        :effective-label-width="effectiveLabelWidth"
        :effective-size="effectiveSize"
        :colon="colon"
        :is-field-visible="isFieldVisible"
        :is-field-disabled="isFieldDisabled"
        :is-field-readonly="isFieldReadonly"
        :is-field-required="isFieldRequired"
        :get-field-value="getFieldValue"
        :set-field-value="setFieldValue"
        :validate-field="validateField"
      />
    </AtengFormGrid>

    <!-- 2. 卡片布局容器 (LayoutContainer: Card) -->
    <AtengFormCard
      v-else-if="isCard"
      :widget="widget"
      :disabled="isDisabled"
      :readonly="isReadonly"
    >
      <AtengFormItemRenderer
        v-for="child in widget.children"
        :key="child.id"
        :widget="child"
        :errors="errors"
        :validating-fields="validatingFields"
        :registry="registry"
        :effective-label-position="effectiveLabelPosition"
        :effective-label-width="effectiveLabelWidth"
        :effective-size="effectiveSize"
        :colon="colon"
        :is-field-visible="isFieldVisible"
        :is-field-disabled="isFieldDisabled"
        :is-field-readonly="isFieldReadonly"
        :is-field-required="isFieldRequired"
        :get-field-value="getFieldValue"
        :set-field-value="setFieldValue"
        :validate-field="validateField"
      />
    </AtengFormCard>

    <!-- 3. 数据集合容器 (DataContainer: SubForm) -->
    <AtengSubForm
      v-else-if="isSubForm"
      :widget="widget"
      :model-value="Array.isArray(modelValue) ? (modelValue as Array<Record<string, unknown>>) : []"
      :disabled="isDisabled"
      :readonly="isReadonly"
      :errors="errors"
      :registry="registry"
      @update:model-value="handleValueUpdate"
    />

    <!-- 4. 原子基础表单项 (Atomic Widget) -->
    <div
      v-else
      class="at-form-item"
      :class="{
        'has-error': hasError,
        'is-validating': isValidating,
        'is-required': isRequired,
        'is-readonly': isReadonly,
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
        <span v-if="isRequired" class="at-required-asterisk">*</span>
        {{ widget.label }}
        <span v-if="colon" class="at-colon">:</span>
      </label>

      <!-- 控件渲染区 -->
      <div class="at-form-item-content">
        <component
          :is="registry.get(widget.type)?.component"
          v-if="registry.get(widget.type)"
          :widget="widget"
          :model-value="modelValue"
          :disabled="isDisabled"
          :readonly="isReadonly"
          :size="effectiveSize"
          @update:model-value="handleValueUpdate"
          @blur="handleBlur"
        />
        <div v-else class="at-widget-missing-fallback">未注册的控件类型: {{ widget.type }}</div>

        <!-- 异步校验中提示 -->
        <div v-if="isValidating" class="at-form-item-validating">
          <span class="at-validating-dot"></span>
          <span>正在校验中...</span>
        </div>

        <!-- 错误校验提示 -->
        <transition name="at-fade">
          <div v-if="hasError && !isValidating" class="at-form-item-error">
            {{ errorMsg }}
          </div>
        </transition>
      </div>
    </div>
  </template>
</template>

<style scoped>
.at-form-item {
  display: flex;
  flex-direction: inherit;
  margin-bottom: 18px;
  box-sizing: border-box;
  width: 100%;
}

.at-form-item-label {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: var(--at-form-label-color, #334155);
  font-weight: 500;
  line-height: 1.5;
  box-sizing: border-box;
  margin-bottom: 6px;
  user-select: none;
}

.at-required-asterisk {
  color: #ef4444;
  margin-right: 4px;
  font-weight: 700;
}

.at-colon {
  margin-left: 2px;
}

.at-form-item-content {
  flex: 1;
  position: relative;
  min-width: 0;
  box-sizing: border-box;
}

.at-form-item-validating {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--at-form-info-color, #3b82f6);
  margin-top: 4px;
}

.at-validating-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--at-form-info-color, #3b82f6);
  animation: at-pulse 1.2s infinite ease-in-out;
}

@keyframes at-pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.4);
    opacity: 1;
  }
}

.at-form-item-error {
  color: #ef4444;
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
}

.at-widget-missing-fallback {
  padding: 8px 12px;
  border: 1px dashed #f59e0b;
  border-radius: 6px;
  background-color: #fef3c7;
  color: #b45309;
  font-size: 12px;
}

.at-fade-enter-active,
.at-fade-leave-active {
  transition: opacity 0.2s ease;
}

.at-fade-enter-from,
.at-fade-leave-to {
  opacity: 0;
}
</style>
