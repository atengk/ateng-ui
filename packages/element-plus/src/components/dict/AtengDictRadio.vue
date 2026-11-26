<script setup lang="ts">
/**
 * 企业级字典单选框组组件。
 *
 * 核心特性：
 * 1. 深度集成 DictManager 单例，自动按 dict-code 加载字典项；
 * 2. 支持自定义 fieldNames 映射与 labelField/valueField 快捷属性，结合安全回退链防呆；
 * 3. 支持 valueType="auto" 弱比对防呆，消除整型 1 与字符 '1' 不匹配导致的选中回显失效；
 * 4. 支持普通单选（el-radio）与按钮风格（el-radio-button）一键切换（:button="true"）；
 * 5. 完整支持尺寸自适应、边框（border）、整体禁用与三级回退数据源；
 * 6. 显式收敛对外暴露 refresh() 强制刷新接口与 radioGroupRef 原生实例。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { shallowRef, computed } from 'vue';
import { ElRadioGroup, ElRadio, ElRadioButton } from 'element-plus';
import type { AtengDictRadioProps, AtengDictRadioEmits, AtengDictRadioExpose } from './types';
import { coerceToMatchedValue } from './utils';
import { useDictSource } from './useDictSource';

defineOptions({
  name: 'AtengDictRadio',
});

const props = withDefaults(defineProps<AtengDictRadioProps>(), {
  dictCode: '',
  loader: undefined,
  options: undefined,
  fieldNames: undefined,
  labelField: undefined,
  valueField: undefined,
  tagTypeField: undefined,
  disabledField: undefined,
  valueType: 'auto',
  modelValue: undefined,
  button: false,
  border: false,
  size: undefined,
  disabled: false,
  autoLoad: true,
});

const emit = defineEmits<AtengDictRadioEmits>();

const radioGroupRef = shallowRef<InstanceType<typeof ElRadioGroup> | null>(null);
const { effectiveItems, internalLoading, refresh } = useDictSource(props);

/**
 * 根据 valueType 与有效选项计算交付给底层 ElRadioGroup 的绑定值。
 */
const radioBoundValue = computed<string | number | boolean | undefined>(() => {
  const val = props.modelValue;
  if (val === undefined || val === null || val === '') {
    return undefined;
  }
  const coerced = coerceToMatchedValue(val, effectiveItems.value, props.valueType);
  return coerced === null ? undefined : coerced;
});

function handleChange(val: string | number | boolean | undefined): void {
  let coercedVal = val;
  if (props.valueType === 'number') {
    if (val !== undefined && val !== null && val !== '') {
      coercedVal = Number(val);
    }
  } else if (props.valueType === 'string') {
    if (val !== undefined && val !== null) {
      coercedVal = String(val);
    }
  } else if (props.valueType === 'auto') {
    if (typeof props.modelValue === 'string') {
      if (val !== undefined && val !== null) {
        coercedVal = String(val);
      }
    } else if (typeof props.modelValue === 'number') {
      if (val !== undefined && val !== null && val !== '') {
        coercedVal = Number(val);
      }
    }
  }

  emit('update:modelValue', coercedVal);
  emit('change', coercedVal);
}

defineExpose<AtengDictRadioExpose>({
  refresh,
  radioGroupRef,
  dictItems: effectiveItems,
  isLoading: internalLoading,
});
</script>

<template>
  <el-radio-group
    ref="radioGroupRef"
    class="at-dict-radio"
    :model-value="radioBoundValue"
    :size="size"
    :disabled="disabled"
    v-bind="$attrs"
    @update:model-value="handleChange"
  >
    <template v-if="button">
      <el-radio-button
        v-for="item in effectiveItems"
        :key="String(item.value)"
        :value="item.value"
        :disabled="item.disabled"
        :class="item.cssClass"
      >
        <slot name="radio" :item="item">
          <span>{{ item.label }}</span>
        </slot>
      </el-radio-button>
    </template>
    <template v-else>
      <el-radio
        v-for="item in effectiveItems"
        :key="String(item.value)"
        :value="item.value"
        :disabled="item.disabled"
        :border="border"
        :class="item.cssClass"
      >
        <slot name="radio" :item="item">
          <span>{{ item.label }}</span>
        </slot>
      </el-radio>
    </template>
  </el-radio-group>
</template>

<style scoped lang="scss">
.at-dict-radio {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--el-space-base, 8px);
}
</style>
