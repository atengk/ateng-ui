<script setup lang="ts">
/**
 * 原生 HTML5 单选框组保底控件。
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
}>();

const options = computed(() => {
  return props.widget.options || [];
});

const readonlyLabel = computed(() => {
  const match = options.value.find(opt => opt.value === props.modelValue);
  return match ? match.label : String(props.modelValue ?? '-');
});

const onRadioChange = (val: unknown): void => {
  emit('update:modelValue', val);
  emit('change', val);
};
</script>

<template>
  <div
    class="at-native-radio-wrapper"
    :class="[`size-${size}`, { 'is-disabled': disabled, 'is-readonly': readonly }]"
  >
    <template v-if="readonly">
      <span class="at-native-readonly-text">{{ readonlyLabel }}</span>
    </template>
    <template v-else>
      <div class="at-native-radio-group">
        <label v-for="opt in options" :key="String(opt.value)" class="at-native-radio-item">
          <input
            type="radio"
            :name="`radio_${widget.id}`"
            :value="opt.value"
            :checked="modelValue === opt.value"
            :disabled="disabled || opt.disabled"
            @change="onRadioChange(opt.value)"
          />
          <span class="at-native-radio-label">{{ opt.label }}</span>
        </label>
      </div>
    </template>
  </div>
</template>

<style scoped>
.at-native-radio-wrapper {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
}

.at-native-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.at-native-radio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--at-form-text-color, #1e293b);
}

.at-native-radio-item input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.at-native-radio-item input:disabled {
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
