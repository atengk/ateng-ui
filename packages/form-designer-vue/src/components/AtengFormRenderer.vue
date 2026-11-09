<script setup lang="ts">
/**
 * AtengFormRenderer 表单运行态轻量高阶渲染容器。
 *
 * 遵循 ADR-0044 规约，负责解析三段式 AST Schema、双向数据绑定、流程节点权限覆盖与表单校验。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, ref, watch, onMounted, onUnmounted, provide } from 'vue';
import type {
  FormSchema,
  FieldPermissionMatrix,
  FormValidationErrors,
  DraftRecord,
} from '../types';
import { useFormRenderer } from '../composables/useFormRenderer';
import { defaultWidgetRegistry } from '../registry';
import type { FormWidgetRegistry } from '../registry';
import { createDraftManager, type DraftManager } from '../storage';
import AtengFormItemRenderer from './AtengFormItemRenderer.vue';

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
  /** 是否开启本地草稿箱容灾静默落盘 */
  enableDraft?: boolean;
  /** 本地草稿存储键，默认对齐 schema.id */
  draftKey?: string;
  /** 草稿箱防抖落盘延迟（毫秒），默认 500ms */
  draftDebounceMs?: number;
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
  enableDraft: false,
  draftKey: undefined,
  draftDebounceMs: 500,
});

const emit = defineEmits<{
  'update:formData': [data: Record<string, unknown>];
  change: [field: string, value: unknown, data: Record<string, unknown>];
  submit: [data: Record<string, unknown>];
  'validate-fail': [errors: FormValidationErrors];
  'draft-detected': [record: DraftRecord];
  'draft-restored': [record: DraftRecord];
  'draft-cleared': [];
}>();

// 向上向下注入响应式 formData，供深度嵌套组件或数据源适配器读取依赖
provide(
  'ateng_form_data',
  computed(() => props.formData),
);

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
  validating,
  validatingFields,
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

// 草稿箱容灾联动
let draftManager: DraftManager | null = null;
const detectedDraft = ref<DraftRecord | null>(null);
const showDraftNotice = ref<boolean>(false);

onMounted(() => {
  if (props.enableDraft) {
    const key = props.draftKey || props.schema.id || 'default';
    draftManager = createDraftManager(key, {
      debounceMs: props.draftDebounceMs,
    });
    if (draftManager.hasDraft()) {
      const draft = draftManager.get();
      if (draft && draft.data && Object.keys(draft.data).length > 0) {
        detectedDraft.value = draft;
        showDraftNotice.value = true;
        emit('draft-detected', draft);
      }
    }
  }
});

// 监听数据变动静默落盘
watch(
  () => props.formData,
  newVal => {
    if (props.enableDraft && draftManager && newVal) {
      draftManager.save(newVal);
    }
  },
  { deep: true },
);

onUnmounted(() => {
  if (draftManager) {
    draftManager.dispose();
    draftManager = null;
  }
});

// 恢复草稿
const handleRestoreDraft = (): void => {
  if (detectedDraft.value) {
    setFormData(detectedDraft.value.data);
    emit('draft-restored', detectedDraft.value);
    showDraftNotice.value = false;
  }
};

// 放弃草稿
const handleDiscardDraft = (): void => {
  if (draftManager) {
    draftManager.clear();
  }
  showDraftNotice.value = false;
  detectedDraft.value = null;
  emit('draft-cleared');
};

// 表单提交处理
const handleSubmit = async (): Promise<void> => {
  const result = await validate();
  if (result.valid) {
    // 提交成功自动清理草稿
    if (props.enableDraft && draftManager) {
      draftManager.clear();
      showDraftNotice.value = false;
      detectedDraft.value = null;
    }
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
  validating,
  validatingFields,
  restoreDraft: handleRestoreDraft,
  clearDraft: handleDiscardDraft,
  getDraft: () => draftManager?.get() ?? null,
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
    <!-- 草稿箱容灾感知恢复条 -->
    <transition name="at-fade">
      <div v-if="showDraftNotice && detectedDraft" class="at-form-draft-notice">
        <span class="at-form-draft-notice__text">
          📝 检测到您上次未提交的表单草稿（{{ detectedDraft.updatedAt }}），是否恢复？
        </span>
        <div class="at-form-draft-notice__actions">
          <button type="button" class="at-draft-btn is-restore" @click="handleRestoreDraft">
            恢复草稿
          </button>
          <button type="button" class="at-draft-btn is-discard" @click="handleDiscardDraft">
            放弃
          </button>
        </div>
      </div>
    </transition>

    <div class="at-form-body">
      <template v-for="widget in schema.widgetList" :key="widget.id">
        <AtengFormItemRenderer
          :widget="widget"
          :errors="errors"
          :validating-fields="validatingFields"
          :registry="registry"
          :effective-label-position="effectiveLabelPosition"
          :effective-label-width="effectiveLabelWidth"
          :effective-size="effectiveSize"
          :colon="schema.formConfig?.colon"
          :is-field-visible="isFieldVisible"
          :is-field-disabled="isFieldDisabled"
          :is-field-readonly="isFieldReadonly"
          :is-field-required="isFieldRequired"
          :get-field-value="getFieldValue"
          :set-field-value="setFieldValue"
          :validate-field="validateField"
        />
      </template>
    </div>

    <!-- 底部操作插槽 -->
    <div v-if="$slots.footer" class="at-form-footer">
      <slot name="footer" :submit="handleSubmit" :reset="resetFields" :validating="validating" />
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

.at-form-draft-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin-bottom: 16px;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  border: 1px solid var(--el-color-primary-light-7, #d9ecff);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-color-primary, #409eff);
}

.at-form-draft-notice__text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.at-form-draft-notice__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-draft-btn {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.at-draft-btn.is-restore {
  background: var(--el-color-primary, #409eff);
  color: #ffffff;
}

.at-draft-btn.is-restore:hover {
  background: var(--el-color-primary-light-3, #79bbff);
}

.at-draft-btn.is-discard {
  background: transparent;
  border-color: var(--el-border-color, #dcdfe6);
  color: var(--el-text-color-regular, #606266);
}

.at-draft-btn.is-discard:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.at-form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
