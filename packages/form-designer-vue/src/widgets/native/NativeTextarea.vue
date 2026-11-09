<script setup lang="ts">
/**
 * 原生 HTML5 多行文本输入保底控件。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormWidget } from '../../types';

interface Props {
  widget: FormWidget;
  modelValue?: string | number | null;
  disabled?: boolean;
  readonly?: boolean;
  size?: 'large' | 'default' | 'small';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  readonly: false,
  size: 'default',
});

const emit = defineEmits<{
  'update:modelValue': [val: string];
  change: [val: string];
  blur: [e: FocusEvent];
}>();

const rows = computed(() => {
  return Number(props.widget.props?.rows) || 3;
});

const stringValue = computed(() => {
  return props.modelValue == null ? '' : String(props.modelValue);
});

const onInput = (e: Event): void => {
  const target = e.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
  emit('change', target.value);
};

const onBlur = (e: FocusEvent): void => {
  emit('blur', e);
};
</script>

<template>
  <div
    class="at-native-textarea-wrapper"
    :class="[`size-${size}`, { 'is-disabled': disabled, 'is-readonly': readonly }]"
  >
    <template v-if="readonly">
      <span class="at-native-readonly-text">{{ stringValue || '-' }}</span>
    </template>
    <template v-else>
      <textarea
        class="at-native-textarea"
        :rows="rows"
        :value="stringValue"
        :placeholder="widget.placeholder || ''"
        :disabled="disabled"
        @input="onInput"
        @blur="onBlur"
      ></textarea>
    </template>
  </div>
</template>

<style scoped>
.at-native-textarea-wrapper {
  display: inline-flex;
  width: 100%;
  box-sizing: border-box;
}

.at-native-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--at-form-text-color, #1e293b);
  background-color: var(--at-form-bg-color, #ffffff);
  border: 1px solid var(--at-form-border-color, #cbd5e1);
  border-radius: 6px;
  padding: 8px 12px;
  outline: none;
  resize: vertical;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.at-native-textarea:focus {
  border-color: var(--at-form-primary-color, #3b82f6);
  box-shadow: 0 0 0 2px var(--at-form-focus-ring, rgba(59, 130, 246, 0.2));
}

.at-native-textarea:disabled {
  background-color: var(--at-form-disabled-bg, #f1f5f9);
  color: var(--at-form-disabled-text, #94a3b8);
  cursor: not-allowed;
}

.at-native-readonly-text {
  font-size: 14px;
  color: var(--at-form-text-color, #1e293b);
  line-height: 1.5;
  padding: 8px 0;
  display: inline-block;
  white-space: pre-wrap;
}
</style>
