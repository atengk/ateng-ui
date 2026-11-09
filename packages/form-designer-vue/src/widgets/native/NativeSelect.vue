<script setup lang="ts">
/**
 * 原生 HTML5 下拉选择保底控件。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormWidget } from '../../types';

interface Props {
  widget: FormWidget;
  modelValue?: string | number | boolean | null;
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
  'update:modelValue': [val: unknown];
  change: [val: unknown];
  blur: [e: FocusEvent];
}>();

const options = computed(() => {
  return props.widget.options || [];
});

const selectedLabel = computed(() => {
  const match = options.value.find(opt => opt.value === props.modelValue);
  return match ? match.label : String(props.modelValue ?? '-');
});

const onChange = (e: Event): void => {
  const target = e.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
  emit('change', target.value);
};

const onBlur = (e: FocusEvent): void => {
  emit('blur', e);
};
</script>

<template>
  <div
    class="at-native-select-wrapper"
    :class="[`size-${size}`, { 'is-disabled': disabled, 'is-readonly': readonly }]"
  >
    <template v-if="readonly">
      <span class="at-native-readonly-text">{{ selectedLabel }}</span>
    </template>
    <template v-else>
      <select
        class="at-native-select"
        :value="modelValue == null ? '' : String(modelValue)"
        :disabled="disabled"
        @change="onChange"
        @blur="onBlur"
      >
        <option value="" disabled>{{ widget.placeholder || '请选择' }}</option>
        <option
          v-for="opt in options"
          :key="String(opt.value)"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </select>
    </template>
  </div>
</template>

<style scoped>
.at-native-select-wrapper {
  display: inline-flex;
  width: 100%;
  box-sizing: border-box;
}

.at-native-select {
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
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.at-native-select:focus {
  border-color: var(--at-form-primary-color, #3b82f6);
  box-shadow: 0 0 0 2px var(--at-form-focus-ring, rgba(59, 130, 246, 0.2));
}

.at-native-select:disabled {
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
}
</style>
