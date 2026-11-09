<script setup lang="ts">
/**
 * 原生 HTML5 复选框保底控件（支持单布尔开关与多选值数组）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormWidget } from '../../types';

interface Props {
  widget: FormWidget;
  modelValue?: unknown;
  disabled?: boolean;
  readonly?: boolean;
  size?: 'large' | 'default' | 'small';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false,
  readonly: false,
  size: 'default',
});

const emit = defineEmits<{
  'update:modelValue': [val: unknown];
  change: [val: unknown];
}>();

const options = computed(() => {
  return props.widget.options || [];
});

const isSingleCheckbox = computed(() => {
  return options.value.length === 0;
});

const isCheckedSingle = computed(() => {
  return Boolean(props.modelValue);
});

const checkedArray = computed<unknown[]>(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue;
  }
  return [];
});

const readonlyLabels = computed(() => {
  if (isSingleCheckbox.value) {
    return isCheckedSingle.value ? '已勾选' : '未勾选';
  }
  const matched = options.value
    .filter(opt => checkedArray.value.includes(opt.value))
    .map(opt => opt.label);
  return matched.length > 0 ? matched.join('，') : '-';
});

const onSingleChange = (e: Event): void => {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', target.checked);
};

const onArrayChange = (val: unknown, e: Event): void => {
  const target = e.target as HTMLInputElement;
  const current = [...checkedArray.value];
  if (target.checked) {
    if (!current.includes(val)) {
      current.push(val);
    }
  } else {
    const idx = current.indexOf(val);
    if (idx !== -1) {
      current.splice(idx, 1);
    }
  }
  emit('update:modelValue', current);
  emit('change', current);
};
</script>

<template>
  <div
    class="at-native-checkbox-wrapper"
    :class="[`size-${size}`, { 'is-disabled': disabled, 'is-readonly': readonly }]"
  >
    <template v-if="readonly">
      <span class="at-native-readonly-text">{{ readonlyLabels }}</span>
    </template>
    <template v-else-if="isSingleCheckbox">
      <label class="at-native-checkbox-item">
        <input
          type="checkbox"
          :checked="isCheckedSingle"
          :disabled="disabled"
          @change="onSingleChange"
        />
        <span class="at-native-checkbox-label">{{ widget.label }}</span>
      </label>
    </template>
    <template v-else>
      <div class="at-native-checkbox-group">
        <label v-for="opt in options" :key="String(opt.value)" class="at-native-checkbox-item">
          <input
            type="checkbox"
            :value="opt.value"
            :checked="checkedArray.includes(opt.value)"
            :disabled="disabled || opt.disabled"
            @change="onArrayChange(opt.value, $event)"
          />
          <span class="at-native-checkbox-label">{{ opt.label }}</span>
        </label>
      </div>
    </template>
  </div>
</template>

<style scoped>
.at-native-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
}

.at-native-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.at-native-checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--at-form-text-color, #1e293b);
}

.at-native-checkbox-item input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.at-native-checkbox-item input:disabled {
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
